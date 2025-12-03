$cssFile = "c:\Users\Admin\Pictures\projects\Stock_management\style.css"
$content = Get-Content $cssFile -Raw

# The new CSS to insert
$newCSS = @"

/* Stock Info Display */
.stock-info {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-left: 4px solid var(--primary);
  padding: 1rem 1.25rem;
  margin: 1rem 0;
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
}

.stock-info p {
  margin: 0.5rem 0;
  color: var(--primary);
  font-size: 0.95rem;
}

.stock-info strong {
  color: var(--primary-hover);
  font-size: 1.1em;
  font-weight: 600;
}

#deleteStockForm {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  align-items: end;
}

#deleteStockForm .stock-info {
  grid-column: 1 / -1;
}

#deductButton {
  background: linear-gradient(135deg, var(--danger) 0%, var(--danger-hover) 100%);
  color: white;
  grid-column: span 1;
  box-shadow: var(--shadow-sm);
}

#deductButton:hover {
  background: linear-gradient(135deg, var(--danger-hover) 0%, #7a1f1f 100%);
  box-shadow: 0 4px 8px -1px rgba(197, 48, 48, 0.4);
  transform: translateY(-1px);
}
"@

# Insert before the LOGIN PAGE section
$searchPattern = "/* ====== LOGIN PAGE ====== */"
if ($content -match [regex]::Escape($searchPattern)) {
    $content = $content -replace [regex]::Escape($searchPattern), "$newCSS`r`n`r`n$searchPattern"
    Set-Content $cssFile -Value $content -NoNewline
    Write-Host "Successfully added CSS styles"
} else {
    Write-Host "Could not find insertion point"
}
