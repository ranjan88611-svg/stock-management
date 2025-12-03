$htmlFile = "c:\Users\Admin\Pictures\projects\Stock_management\index.html"
$content = Get-Content $htmlFile -Raw

# The new section to insert
$newSection = @"

    <!-- Delete/Deduct Stock Form -->
    <section class="card">
      <h2>Delete Stock</h2>
      <form id="deleteStockForm">
        <div class="form-row">
          <label>Company</label>
          <select id="deleteCompanySelect" required>
            <option value="" disabled selected>Select Company</option>
            <option value="SIMPOLO">SIMPOLO</option>
            <option value="CREANZA">CREANZA</option>
            <option value="NAVEEN">NAVEEN</option>
          </select>
        </div>

        <div class="form-row">
          <label>Tile Name</label>
          <input type="text" id="deleteTileName" required placeholder="Search tile name..." list="tileNamesList" />
          <datalist id="tileNamesList"></datalist>
        </div>

        <div class="form-row">
          <label>Size</label>
          <input type="text" id="deleteTileSize" required placeholder="Search size..." list="tileSizesList" />
          <datalist id="tileSizesList"></datalist>
        </div>

        <div class="form-row">
          <label>Boxes to Deduct</label>
          <input type="number" id="boxesToDeduct" required min="1" placeholder="Enter boxes to remove" />
        </div>

        <div id="currentStockInfo" class="stock-info" style="display: none;">
          <p>Current Stock: <strong id="currentBoxCount">0</strong> boxes</p>
          <p>After Deduction: <strong id="remainingBoxCount">0</strong> boxes</p>
        </div>

        <button type="submit" id="deductButton">Deduct Stock</button>
        <button type="button" id="resetDeleteButton" class="secondary-btn">Clear</button>
      </form>
    </section>
"@

# Find the position to insert (after the Add Tile Stock section, before Search section)
$searchPattern = "    </section>`r`n`r`n    <!-- Search -->"
if ($content -match [regex]::Escape($searchPattern)) {
    $content = $content -replace [regex]::Escape($searchPattern), "    </section>$newSection`r`n`r`n    <!-- Search -->"
    Set-Content $htmlFile -Value $content -NoNewline
    Write-Host "Successfully added Delete Stock section"
} else {
    Write-Host "Pattern not found. Trying alternative..."
    # Try with just \n
    $searchPattern2 = "    </section>`n`n    <!-- Search -->"
    if ($content -match [regex]::Escape($searchPattern2)) {
        $content = $content -replace [regex]::Escape($searchPattern2), "    </section>$newSection`n`n    <!-- Search -->"
        Set-Content $htmlFile -Value $content -NoNewline
        Write-Host "Successfully added Delete Stock section (alt)"
    } else {
        Write-Host "Could not find insertion point"
    }
}
