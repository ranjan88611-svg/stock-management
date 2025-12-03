const express = require("express");
const path = require("path");
const session = require("express-session");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy - Required for Render and other cloud platforms
// This allows Express to correctly read the X-Forwarded-* headers
app.set('trust proxy', 1);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
// Session configuration
const pgSession = require('connect-pg-simple')(session);

app.use(session({
  store: new pgSession({
    pool: db.pool, // Use the pool from database.js
    tableName: 'session' // Use 'session' table
  }),
  secret: 'stock-management-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    secure: 'auto', // Auto-detect based on connection (works with proxies)
    sameSite: 'lax' // Protect against CSRF while allowing normal navigation
  }
}));

// Serve static files
app.use(express.static(path.join(__dirname)));

// ====== AUTHENTICATION MIDDLEWARE ======
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized. Please login." });
  }
}

// ====== API ROUTES ======

// Login
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const user = await db.authenticateUser(username.toLowerCase().trim(), password);

    if (user) {
      req.session.userId = user.id;
      req.session.username = user.username;
      res.json({ success: true, username: user.username });
    } else {
      res.status(401).json({ error: "Invalid username or password" });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error during login" });
  }
});

// Logout
app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }
    res.json({ success: true });
  });
});

// Check session
app.get("/api/session", (req, res) => {
  if (req.session && req.session.userId) {
    res.json({
      authenticated: true,
      username: req.session.username
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Get all stocks (with optional company filter)
app.get("/api/stocks", requireAuth, async (req, res) => {
  try {
    const { company } = req.query;
    const stocks = await db.getAllStocks(company);
    res.json(stocks);
  } catch (error) {
    console.error("Get stocks error:", error);
    res.status(500).json({ error: "Failed to fetch stocks" });
  }
});

// Get single stock
app.get("/api/stocks/:id", requireAuth, async (req, res) => {
  try {
    const stock = await db.getStockById(parseInt(req.params.id));
    if (stock) {
      res.json(stock);
    } else {
      res.status(404).json({ error: "Stock not found" });
    }
  } catch (error) {
    console.error("Get stock error:", error);
    res.status(500).json({ error: "Failed to fetch stock" });
  }
});

// Get audit logs
app.get("/api/admin/logs", requireAuth, async (req, res) => {
  try {
    // Restrict to admin user 'ranjan'
    if (req.session.username !== 'ranjan') {
      return res.status(403).json({ error: "Access denied. Admin only." });
    }

    const logs = await db.getAuditLogs();
    res.json(logs);
  } catch (error) {
    console.error("Get audit logs error:", error);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

// Create new stock
app.post("/api/stocks", requireAuth, async (req, res) => {
  try {
    const stockData = req.body;

    // Validation
    if (!stockData.company || !stockData.tileName || !stockData.tileSize) {
      return res.status(400).json({
        error: "Company, tile name, and size are required"
      });
    }

    const newStock = await db.addOrUpdateStock(stockData, req.session.username);
    res.status(201).json(newStock);
  } catch (error) {
    console.error("Create stock error:", error);
    res.status(500).json({ error: "Failed to create stock" });
  }
});

// Update stock
app.put("/api/stocks/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const stockData = req.body;

    // Check if stock exists
    const existing = await db.getStockById(id);
    if (!existing) {
      return res.status(404).json({ error: "Stock not found" });
    }

    // Validation
    if (!stockData.company || !stockData.tileName || !stockData.tileSize) {
      return res.status(400).json({
        error: "Company, tile name, and size are required"
      });
    }

    const updatedStock = await db.updateStock(id, stockData, req.session.username);
    res.json(updatedStock);
  } catch (error) {
    console.error("Update stock error:", error);
    res.status(500).json({ error: "Failed to update stock" });
  }
});

// Delete stock
app.delete("/api/stocks/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Check if stock exists
    const existing = await db.getStockById(id);
    if (!existing) {
      return res.status(404).json({ error: "Stock not found" });
    }

    await db.deleteStock(id, req.session.username);
    res.json({ success: true, message: "Stock deleted successfully" });
  } catch (error) {
    console.error("Delete stock error:", error);
    res.status(500).json({ error: "Failed to delete stock" });
  }
});


// Deduct stock (subtract boxes from existing stock)
app.post("/api/stocks/deduct", requireAuth, async (req, res) => {
  try {
    const { company, tileName, tileSize, boxesToDeduct } = req.body;

    // Validation
    if (!company || !tileName || !tileSize || !boxesToDeduct) {
      return res.status(400).json({
        error: "Company, tile name, size, and boxes to deduct are required"
      });
    }

    if (boxesToDeduct <= 0) {
      return res.status(400).json({ error: "Boxes to deduct must be greater than 0" });
    }

    const result = await db.deductStock(company, tileName, tileSize, boxesToDeduct, req.session.username);
    res.json(result);
  } catch (error) {
    console.error("Deduct stock error:", error);
    res.status(500).json({ error: error.message || "Failed to deduct stock" });
  }
});

// ====== SERVE HTML PAGES ======
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

app.get("/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

app.get("/index.html", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ====== INITIALIZE AND START SERVER ======
async function startServer() {
  try {
    // Step 1: Initialize database
    console.log('📦 Initializing database...');
    await db.initDatabase();
    console.log('✅ Database initialized successfully');

    // Step 2: Start Express server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📍 Trust proxy: ${app.get('trust proxy')}`);
    });
  } catch (err) {
    console.error('❌ Server initialization failed:', err);
    process.exit(1);
  }
}

// Start the server
startServer();
