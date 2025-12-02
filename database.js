const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'stock_management.db');

let db = null;

// Initialize database
async function initDatabase() {
    const SQL = await initSqlJs();

    // Load existing database or create new one
    if (fs.existsSync(DB_PATH)) {
        const buffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(buffer);
        console.log('✅ Database loaded from file');
    } else {
        db = new SQL.Database();
        console.log('✅ New database created');

        // Create tables
        createTables();

        // Insert default users
        await insertDefaultUsers();

        // Save to file
        saveDatabase();
    }
}

// Create database tables
function createTables() {
    // Users table
    db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `);

    // Stocks table
    db.run(`
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

    console.log('✅ Database tables created');
}

// Insert default users
async function insertDefaultUsers() {
    const defaultUsers = ['ranjan', 'yogeesh', 'nidhi', 'sonu'];
    const defaultPassword = '123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');

    for (const username of defaultUsers) {
        try {
            stmt.run([username, hashedPassword]);
        } catch (err) {
            // User might already exist, skip
        }
    }

    stmt.free();
    console.log('✅ Default users inserted');
}

// Save database to file
function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
    }
}

// ====== USER OPERATIONS ======

async function authenticateUser(username, password) {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    stmt.bind([username]);

    let user = null;
    if (stmt.step()) {
        const row = stmt.getAsObject();
        user = row;
    }
    stmt.free();

    if (!user) {
        return null;
    }

    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? { id: user.id, username: user.username } : null;
}

// ====== STOCK OPERATIONS ======

function getAllStocks(companyFilter = null) {
    let query = 'SELECT * FROM stocks';
    let params = [];

    if (companyFilter && companyFilter !== 'ALL') {
        query += ' WHERE company = ?';
        params.push(companyFilter);
    }

    query += ' ORDER BY id DESC';

    const stmt = db.prepare(query);
    if (params.length > 0) {
        stmt.bind(params);
    }

    const stocks = [];
    while (stmt.step()) {
        stocks.push(stmt.getAsObject());
    }
    stmt.free();

    return stocks;
}

function getStockById(id) {
    const stmt = db.prepare('SELECT * FROM stocks WHERE id = ?');
    stmt.bind([id]);

    let stock = null;
    if (stmt.step()) {
        stock = stmt.getAsObject();
    }
    stmt.free();

    return stock;
}

function createStock(stockData) {
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

    const stmt = db.prepare(`
    INSERT INTO stocks (
      company, tileName, tileSize, boxCount, piecesPerBox,
      location, pricePerBox, pricePerSqft, sqftPerBox
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    stmt.run([
        company, tileName, tileSize, boxCount, piecesPerBox,
        location, pricePerBox, pricePerSqft, sqftPerBox
    ]);

    const lastId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];
    stmt.free();

    saveDatabase();
    return getStockById(lastId);
}

function updateStock(id, stockData) {
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

    const stmt = db.prepare(`
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
  `);

    stmt.run([
        company, tileName, tileSize, boxCount, piecesPerBox,
        location, pricePerBox, pricePerSqft, sqftPerBox, id
    ]);

    stmt.free();
    saveDatabase();

    return getStockById(id);
}

function deleteStock(id) {
    const stmt = db.prepare('DELETE FROM stocks WHERE id = ?');
    stmt.run([id]);
    stmt.free();

    saveDatabase();
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
