const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Use a persistent disk path if available (common in Render), otherwise local file
const DB_PATH = process.env.RENDER_DISK_PATH
    ? path.join(process.env.RENDER_DISK_PATH, 'stock_management.db')
    : path.join(__dirname, 'stock_management.db');

let db = null;

// Helper to wrap sqlite3 functions in Promises
function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
}

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Initialize database
async function initDatabase() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(DB_PATH, async (err) => {
            if (err) {
                console.error('❌ Could not connect to database', err);
                reject(err);
            } else {
                console.log('✅ Connected to SQLite database at', DB_PATH);

                try {
                    // Create tables
                    await createTables();

                    // Insert default users
                    await insertDefaultUsers();

                    resolve();
                } catch (error) {
                    reject(error);
                }
            }
        });
    });
}

// Create database tables
async function createTables() {
    // Users table
    await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `);

    // Stocks table
    await run(`
    CREATE TABLE IF NOT EXISTS stocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company TEXT NOT NULL,
      tileName TEXT NOT NULL,
      tileSize TEXT NOT NULL,
      boxCount INTEGER DEFAULT 0,
      piecesPerBox INTEGER DEFAULT 0,
      location TEXT,
      pricePerBox REAL DEFAULT 0,
      pricePerSqft REAL DEFAULT 0,
      sqftPerBox REAL DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    console.log('✅ Database tables checked/created');
}

// Insert default users
async function insertDefaultUsers() {
    const defaultUsers = ['ranjan', 'yogeesh', 'nidhi', 'sonu'];
    const defaultPassword = '123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    for (const username of defaultUsers) {
        try {
            await run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
        } catch (err) {
            // User likely already exists (UNIQUE constraint), ignore
        }
    }

    console.log('✅ Default users checked/inserted');
}

// ====== USER OPERATIONS ======

async function authenticateUser(username, password) {
    const user = await get('SELECT * FROM users WHERE username = ?', [username]);

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
        query += ' WHERE company = ?';
        params.push(companyFilter);
    }

    query += ' ORDER BY id DESC';

    return await all(query, params);
}

async function getStockById(id) {
    return await get('SELECT * FROM stocks WHERE id = ?', [id]);
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

    const result = await run(`
    INSERT INTO stocks (
      company, tileName, tileSize, boxCount, piecesPerBox,
      location, pricePerBox, pricePerSqft, sqftPerBox
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
        company, tileName, tileSize, boxCount, piecesPerBox,
        location, pricePerBox, pricePerSqft, sqftPerBox
    ]);

    return await getStockById(result.lastID);
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

    await run(`
    UPDATE stocks SET
      company = ?,
      tileName = ?,
      tileSize = ?,
      boxCount = ?,
      piecesPerBox = ?,
      location = ?,
      pricePerBox = ?,
      pricePerSqft = ?,
      sqftPerBox = ?,
      updatedAt = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [
        company, tileName, tileSize, boxCount, piecesPerBox,
        location, pricePerBox, pricePerSqft, sqftPerBox, id
    ]);

    return await getStockById(id);
}

async function deleteStock(id) {
    await run('DELETE FROM stocks WHERE id = ?', [id]);
    return true;
}

module.exports = {
    initDatabase,
    authenticateUser,
    getAllStocks,
    getStockById,
    createStock,
    updateStock,
    deleteStock
};
