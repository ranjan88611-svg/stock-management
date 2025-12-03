$serverFile = "c:\Users\Admin\Pictures\projects\Stock_management\server.js"
$content = Get-Content $serverFile -Raw

# The new API endpoint to insert
$newEndpoint = @"

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

    const result = await db.deductStock(company, tileName, tileSize, boxesToDeduct);
    res.json(result);
  } catch (error) {
    console.error("Deduct stock error:", error);
    res.status(500).json({ error: error.message || "Failed to deduct stock" });
  }
});
"@

# Insert before the SERVE HTML PAGES section
$searchPattern = "// ====== SERVE HTML PAGES ======"
if ($content -match [regex]::Escape($searchPattern)) {
    $content = $content -replace [regex]::Escape($searchPattern), "$newEndpoint`r`n`r`n$searchPattern"
    Set-Content $serverFile -Value $content -NoNewline
    Write-Host "Successfully added deduct stock API endpoint"
} else {
    Write-Host "Could not find insertion point"
}
