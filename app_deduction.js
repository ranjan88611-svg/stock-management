
// ====== STOCK DEDUCTION FEATURE ======

// DOM Elements for Delete Stock Form
const deleteStockForm = document.getElementById("deleteStockForm");
const deleteCompanySelect = document.getElementById("deleteCompanySelect");
const deleteTileNameInput = document.getElementById("deleteTileName");
const deleteTileSizeInput = document.getElementById("deleteTileSize");
const boxesToDeductInput = document.getElementById("boxesToDeduct");
const currentStockInfo = document.getElementById("currentStockInfo");
const currentBoxCountSpan = document.getElementById("currentBoxCount");
const remainingBoxCountSpan = document.getElementById("remainingBoxCount");
const resetDeleteButton = document.getElementById("resetDeleteButton");
const tileNamesList = document.getElementById("tileNamesList");
const tileSizesList = document.getElementById("tileSizesList");

// Populate datalists when company is selected
deleteCompanySelect.addEventListener("change", () => {
    populateDeleteFormOptions();
    deleteTileNameInput.value = "";
    deleteTileSizeInput.value = "";
    boxesToDeductInput.value = "";
    currentStockInfo.style.display = "none";
});

function populateDeleteFormOptions() {
    const selectedCompany = deleteCompanySelect.value;
    if (!selectedCompany) return;

    // Filter stocks by selected company
    const companyStocks = stocks.filter(stock => stock.company === selectedCompany);

    // Populate tile names (unique)
    const uniqueTileNames = [...new Set(companyStocks.map(s => s.tileName))];
    tileNamesList.innerHTML = uniqueTileNames.map(name => `<option value="${name}">`).join("");

    // Populate sizes (unique)
    const uniqueSizes = [...new Set(companyStocks.map(s => s.tileSize))];
    tileSizesList.innerHTML = uniqueSizes.map(size => `<option value="${size}">`).join("");
}

// Update current stock display when tile name, size, or boxes to deduct changes
deleteTileNameInput.addEventListener("input", updateCurrentStockDisplay);
deleteTileSizeInput.addEventListener("input", updateCurrentStockDisplay);
boxesToDeductInput.addEventListener("input", updateCurrentStockDisplay);

function updateCurrentStockDisplay() {
    const company = deleteCompanySelect.value;
    const tileName = deleteTileNameInput.value.trim();
    const tileSize = deleteTileSizeInput.value.trim();
    const boxesToDeduct = Number(boxesToDeductInput.value) || 0;

    if (!company || !tileName || !tileSize) {
        currentStockInfo.style.display = "none";
        return;
    }

    // Find the stock item
    const stockItem = stocks.find(
        s => s.company === company &&
            s.tileName.toLowerCase() === tileName.toLowerCase() &&
            s.tileSize.toLowerCase() === tileSize.toLowerCase()
    );

    if (stockItem) {
        currentBoxCountSpan.textContent = stockItem.boxCount;
        const remaining = Math.max(0, stockItem.boxCount - boxesToDeduct);
        remainingBoxCountSpan.textContent = remaining;

        // Change color if going negative
        if (stockItem.boxCount - boxesToDeduct < 0) {
            remainingBoxCountSpan.style.color = "var(--danger)";
        } else {
            remainingBoxCountSpan.style.color = "var(--primary-hover)";
        }

        currentStockInfo.style.display = "block";
    } else {
        currentStockInfo.style.display = "none";
    }
}

// Handle delete stock form submission
deleteStockForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const company = deleteCompanySelect.value;
    const tileName = deleteTileNameInput.value.trim();
    const tileSize = deleteTileSizeInput.value.trim();
    const boxesToDeduct = Number(boxesToDeductInput.value) || 0;

    if (!company || !tileName || !tileSize || boxesToDeduct <= 0) {
        alert("Please fill in all fields with valid values");
        return;
    }

    try {
        // Disable button during deduction
        const deductButton = document.getElementById("deductButton");
        deductButton.disabled = true;
        deductButton.textContent = "Deducting...";

        const response = await fetch('/api/stocks/deduct', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ company, tileName, tileSize, boxesToDeduct })
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.message || 'Stock deducted successfully');

            // Reload stocks from server
            await loadStocksFromAPI();
            renderTable();

            // Clear form
            clearDeleteForm();
        } else {
            showError(data.error || 'Failed to deduct stock');
        }
    } catch (error) {
        console.error('Deduct stock error:', error);
        showError('Network error while deducting stock');
    } finally {
        const deductButton = document.getElementById("deductButton");
        deductButton.disabled = false;
        deductButton.textContent = "Deduct Stock";
    }
});

// Reset delete form
resetDeleteButton.addEventListener("click", () => {
    clearDeleteForm();
});

function clearDeleteForm() {
    deleteStockForm.reset();
    currentStockInfo.style.display = "none";
    tileNamesList.innerHTML = "";
    tileSizesList.innerHTML = "";
}
