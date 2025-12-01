const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

// Serve all static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at: http://localhost:${PORT}`);
});
