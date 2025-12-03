const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Use DATABASE_URL from environment variables
let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable is missing!');
} else {
    // Clean up common copy-paste errors
    // Remove leading/trailing quotes
    connectionString = connectionString.replace(/^["']|["']$/g, '').trim();
    // Remove "DATABASE_URL=" prefix if present
    connectionString = connectionString.replace(/^DATABASE_URL=/, '');

    console.log('ℹ️ Connection string detected (masked):', connectionString.replace(/:[^:@]+@/, ':****@'));
}

const pool = new Pool({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false // Required for many cloud providers like Neon/Supabase
    }
});

// Initialize database
async function initDatabase() {
    try {
        // Test connection
        const client = await pool.connect();
        console.log('✅ Connected to PostgreSQL database');
        client.release();

        // Create tables
        await createTables();

        // Insert default users
        await insertDefaultUsers();

    } catch (err) {
        console.error('❌ Could not connect to database:', err);
        // Don't exit process here, let server decide or retry
        throw err;
    }
}

// Create database tables
async function createTables() {
    const client = await pool.connect();
    try {
        // Users table
        await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      )
    `);

        // Stocks table
        await client.query(`
      CREATE TABLE IF NOT EXISTS stocks (
        id SERIAL PRIMARY KEY,
        company TEXT NOT NULL,
        tileName TEXT NOT NULL,
        tileSize TEXT NOT NULL,
        boxCount INTEGER DEFAULT 0,
        piecesPerBox INTEGER DEFAULT 0,
        location TEXT,
        pricePerBox REAL DEFAULT 0,
        pricePerSqft REAL DEFAULT 0,
        sqftPerBox REAL DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Session table (required for connect-pg-simple)
        await client.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default" PRIMARY KEY,
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL
      );
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);

        console.log('✅ Database tables checked/created');
    } finally {
        client.release();
    }
}

// Insert default users
async function insertDefaultUsers() {
    const defaultUsers = ['ranjan', 'yogeesh', 'nidhi', 'sonu'];
    const defaultPassword = '123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const client = await pool.connect();
    try {
        for (const username of defaultUsers) {
            try {
                await client.query(
                    'INSERT INTO users (username, password) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING',
                    [username, hashedPassword]
                );
            } catch (err) {
                console.error(`Error inserting user ${username}:`, err);
            }
        }
        console.log('✅ Default users checked/inserted');
    } finally {
        client.release();
    }
}

// ====== HELPER: Map Postgres Lowercase to CamelCase ======
function mapStock(row) {
    if (!row) return null;
    return {
        ...row,
        tileName: row.tilename || row.tileName,
        tileSize: row.tilesize || row.tileSize,
        boxCount: row.boxcount || row.boxCount,
        piecesPerBox: row.piecesperbox || row.piecesPerBox,
        pricePerBox: row.priceperbox || row.pricePerBox,
        pricePerSqft: row.pricepersqft || row.pricePerSqft,
        sqftPerBox: row.sqftperbox || row.sqftPerBox,
        createdAt: row.createdat || row.createdAt,
        updatedAt: row.updatedat || row.updatedAt
    };
}

// ====== USER OPERATIONS ======

async function authenticateUser(username, password) {
    const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = rows[0];

    if (!user) {
        return null;
    }

    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? { id: user.id, username: user.username } : null;
}

// ====== STOCK OPERATIONS ======

async function getAllStocks(companyFilter = null) {
    let query = 'SELECT * FROM stocks';
    let params = [];

    if (companyFilter && companyFilter !== 'ALL') {
        query += ' WHERE company = $1';
        params.push(companyFilter);
    }

    query += ' ORDER BY id DESC';

    const { rows } = await pool.query(query, params);
    return rows.map(mapStock);
}

async function getStockById(id) {
    const { rows } = await pool.query('SELECT * FROM stocks WHERE id = $1', [id]);
    return mapStock(rows[0]);
}

async function createStock(stockData) {
    const {
        company,
        tileName,
        tileSize,
        boxCount = 0,
        piecesPerBox = 0,
        location = '',
        pricePerBox = 0,
        pricePerSqft = 0,
        sqftPerBox = 0
    } = stockData;

    const query = `
    INSERT INTO stocks (
      company, tileName, tileSize, boxCount, piecesPerBox,
      location, pricePerBox, pricePerSqft, sqftPerBox
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;

    const values = [
        company, tileName, tileSize, boxCount, piecesPerBox,
        location, pricePerBox, pricePerSqft, sqftPerBox
    ];

    const { rows } = await pool.query(query, values);
    return mapStock(rows[0]);
}

async function updateStock(id, stockData) {
    const {
        company,
        tileName,
        tileSize,
        boxCount,
        piecesPerBox,
        location,
        pricePerBox,
        pricePerSqft,
        sqftPerBox
    } = stockData;

    const query = `
    UPDATE stocks SET
      company = $1,
      tileName = $2,
      tileSize = $3,
      boxCount = $4,
      piecesPerBox = $5,
      location = $6,
      pricePerBox = $7,
      pricePerSqft = $8,
      sqftPerBox = $9,
      updatedAt = CURRENT_TIMESTAMP
    WHERE id = $10
    RETURNING *
  `;

    const values = [
        company, tileName, tileSize, boxCount, piecesPerBox,
        location, pricePerBox, pricePerSqft, sqftPerBox, id
    ];

    const { rows } = await pool.query(query, values);
    return mapStock(rows[0]);
}

async function deleteStock(id) {
    await pool.query('DELETE FROM stocks WHERE id = $1', [id]);
    return true;
}

async function deductStock(company, tileName, tileSize, boxesToDeduct) {
    // Find the stock item
    const { rows } = await pool.query(
        'SELECT * FROM stocks WHERE company = $1 AND tileName = $2 AND tileSize = $3',
        [company, tileName, tileSize]
    );

    if (rows.length === 0) {
        throw new Error('Stock item not found');
    }

    const stock = mapStock(rows[0]);
    const newBoxCount = stock.boxCount - boxesToDeduct;

    if (newBoxCount < 0) {
        throw new Error(`Cannot deduct ${boxesToDeduct} boxes. Only ${stock.boxCount} boxes available.`);
    }

    // Update the stock
    const updateQuery = `
    UPDATE stocks SET
      boxCount = $1,
      updatedAt = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;

    const { rows: updatedRows } = await pool.query(updateQuery, [newBoxCount, stock.id]);

    return {
        success: true,
        message: `Deducted ${boxesToDeduct} boxes. Remaining: ${newBoxCount} boxes`,
        stock: mapStock(updatedRows[0])
    };
}

module.exports = {
    initDatabase,
    authenticateUser,
    getAllStocks,
    getStockById,
    createStock,
    updateStock,
    deleteStock,
    deductStock,
    pool // Export pool for session store
};
