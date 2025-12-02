const express = require("express");
const path = require("path");
const session = require("express-session");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
db.initDatabase().then(() => {
  console.log("✅ Database initialized successfully");
}).catch(err => {
  console.error("❌ Database initialization failed:", err);
  process.exit(1);
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: 'stock-management-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true
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
app.get("/api/stocks", requireAuth, (req, res) => {
  try {
    const { company } = req.query;
    const stocks = db.getAllStocks(company);
    res.json(stocks);
  } catch (error) {
    console.error("Get stocks error:", error);
    res.status(500).json({ error: "Failed to fetch stocks" });
  }
});

// Get single stock
app.get("/api/stocks/:id", requireAuth, (req, res) => {
  try {
    const stock = db.getStockById(parseInt(req.params.id));
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

// Create new stock
app.post("/api/stocks", requireAuth, (req, res) => {
  try {
    const stockData = req.body;

    // Validation
    if (!stockData.company || !stockData.tileName || !stockData.tileSize) {
      return res.status(400).json({
        error: "Company, tile name, and size are required"
      });
    }

    const newStock = db.createStock(stockData);
    res.status(201).json(newStock);
  } catch (error) {
    console.error("Create stock error:", error);
    res.status(500).json({ error: "Failed to create stock" });
  }
});

// Update stock
app.put("/api/stocks/:id", requireAuth, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const stockData = req.body;

    // Check if stock exists
    const existing = db.getStockById(id);
    if (!existing) {
      return res.status(404).json({ error: "Stock not found" });
    }

    // Validation
    if (!stockData.company || !stockData.tileName || !stockData.tileSize) {
      return res.status(400).json({
        error: "Company, tile name, and size are required"
      });
    }

    const updatedStock = db.updateStock(id, stockData);
    res.json(updatedStock);
  } catch (error) {
    console.error("Update stock error:", error);
    res.status(500).json({ error: "Failed to update stock" });
  }
});

// Delete stock
app.delete("/api/stocks/:id", requireAuth, (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Check if stock exists
    const existing = db.getStockById(id);
    if (!existing) {
      return res.status(404).json({ error: "Stock not found" });
    }

    db.deleteStock(id);
    res.json({ success: true, message: "Stock deleted successfully" });
  } catch (error) {
    console.error("Delete stock error:", error);
    res.status(500).json({ error: "Failed to delete stock" });
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
