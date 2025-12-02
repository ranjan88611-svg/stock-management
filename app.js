// ====== GLOBAL DATA ======
let stocks = [];
let editIndex = null; // null means "add mode", number means "edit mode"
let currentCompanyFilter = "ALL";

// ----- Check Authentication -----
fetch('/api/session')
  .then(res => res.json())
  .then(data => {
    if (!data.authenticated) {
      window.location.href = 'login.html';
    }
  })
  .catch(err => {
    console.error('Session check failed:', err);
    window.location.href = 'login.html';
  });

// ----- Load stocks from API on page load -----
window.addEventListener("DOMContentLoaded", async () => {
  await loadStocksFromAPI();
  renderTable();

  // Setup logout button
  const logoutBtn = document.getElementById("logoutButton");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = "login.html";
      } catch (err) {
        console.error('Logout failed:', err);
        window.location.href = "login.html";
      }
    });
  }
});

// ----- DOM Elements -----
const stockForm = document.getElementById("stockForm");
const companySelect = document.getElementById("companySelect");
const tileNameInput = document.getElementById("tileName");
const tileSizeInput = document.getElementById("tileSize");
const boxCountInput = document.getElementById("boxCount");
const piecesPerBoxInput = document.getElementById("piecesPerBox");
const locationInput = document.getElementById("location");
const pricePerBoxInput = document.getElementById("pricePerBox");
const pricePerSqftInput = document.getElementById("pricePerSqft");
const sqftPerBoxInput = document.getElementById("sqftPerBox");
const stockTableBody = document.getElementById("stockTableBody");
const searchInput = document.getElementById("searchInput");
const resetButton = document.getElementById("resetButton");
const saveButton = document.getElementById("saveButton");
const tabButtons = document.querySelectorAll(".tab-btn");

// ----- API Helper Functions -----
async function loadStocksFromAPI() {
  try {
    const response = await fetch('/api/stocks');
    if (response.ok) {
      stocks = await response.json();
    } else {
      console.error('Failed to load stocks');
      showError('Failed to load stocks from server');
    }
  } catch (error) {
    console.error('Load stocks error:', error);
    showError('Network error while loading stocks');
  }
}

async function saveStockToAPI(stockData) {
  try {
    const response = await fetch('/api/stocks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(stockData)
    });

    if (response.ok) {
      return await response.json();
    } else {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save stock');
    }
  } catch (error) {
    console.error('Save stock error:', error);
    throw error;
  }
}

async function updateStockAPI(id, stockData) {
  try {
    const response = await fetch(`/api/stocks/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(stockData)
    });

    if (response.ok) {
      return await response.json();
    } else {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update stock');
    }
  } catch (error) {
    console.error('Update stock error:', error);
    throw error;
  }
}

async function deleteStockAPI(id) {
  try {
    const response = await fetch(`/api/stocks/${id}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      return true;
    } else {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete stock');
    }
  } catch (error) {
    console.error('Delete stock error:', error);
    throw error;
  }
}

// ----- Helper Functions -----
function showError(message) {
  alert(message);
}

function clearForm() {
  stockForm.reset();
  editIndex = null;
  saveButton.textContent = "Add Stock";
  companySelect.value = "";
}

// ----- Form Submit (Add / Update) -----
stockForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const company = companySelect.value;
  const tileName = tileNameInput.value.trim();
  const tileSize = tileSizeInput.value.trim();
  const boxCount = Number(boxCountInput.value) || 0;
  const piecesPerBox = Number(piecesPerBoxInput.value) || 0;
  const location = locationInput.value.trim();
  const pricePerBox = Number(pricePerBoxInput.value) || 0;
  const pricePerSqft = Number(pricePerSqftInput.value) || 0;
  const sqftPerBox = Number(sqftPerBoxInput.value) || 0;

  if (!company || !tileName || !tileSize) {
    alert("Please select Company and enter Tile Name and Size");
    return;
  }

  const stockItem = {
    company,
    tileName,
    tileSize,
    boxCount,
    piecesPerBox,
    location,
    pricePerBox,
    pricePerSqft,
    sqftPerBox,
  };

  try {
    // Disable button during save
    saveButton.disabled = true;
    saveButton.textContent = editIndex === null ? "Saving..." : "Updating...";

    if (editIndex === null) {
      // Add new stock
      await saveStockToAPI(stockItem);
    } else {
      // Update existing stock
      const stockId = stocks[editIndex].id;
      await updateStockAPI(stockId, stockItem);
    }

    // Reload stocks from server
    await loadStocksFromAPI();
    renderTable();
    clearForm();
  } catch (error) {
    showError(error.message || 'Failed to save stock');
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = editIndex === null ? "Add Stock" : "Update Stock";
  }
});

// ----- Reset button -----
resetButton.addEventListener("click", () => {
  clearForm();
});

// ----- Search -----
searchInput.addEventListener("input", () => {
  renderTable();
});

// ----- Tabs -----
tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    // Remove active class from all
    tabButtons.forEach(b => b.classList.remove("active"));
    // Add active to clicked
    btn.classList.add("active");

    currentCompanyFilter = btn.getAttribute("data-company");
    renderTable();
  });
});

// ----- Render Table -----
// ----- Render Table -----
function renderTable() {
  const searchText = searchInput.value.toLowerCase().trim();
  stockTableBody.innerHTML = "";

  // 1. Primary Filter: Exact/Substring Match
  let filteredStocks = stocks
    .map((stock, index) => ({ ...stock, index }))
    .filter((item) => {
      // Filter by Company
      if (currentCompanyFilter !== "ALL" && item.company !== currentCompanyFilter) {
        return false;
      }

      // Filter by Search (Substring)
      if (!searchText) return true;
      return (
        item.tileName.toLowerCase().includes(searchText) ||
        item.tileSize.toLowerCase().includes(searchText)
      );
    });

  // 2. Secondary Filter: Fuzzy Match (if no results found)
  if (filteredStocks.length === 0 && searchText.length > 2) {
    filteredStocks = stocks
      .map((stock, index) => ({ ...stock, index }))
      .filter((item) => {
        // Filter by Company
        if (currentCompanyFilter !== "ALL" && item.company !== currentCompanyFilter) {
          return false;
        }

        // Check Levenshtein Distance
        const nameDist = levenshteinDistance(item.tileName.toLowerCase(), searchText);
        // Allow distance of 3 or less (adjustable)
        return nameDist <= 3;
      });
  }

  filteredStocks.forEach((item, displayIndex) => {
    const tr = document.createElement("tr");

    const totalPieces = item.boxCount * item.piecesPerBox;

    tr.innerHTML = `
        <td>${displayIndex + 1}</td>
        <td><span class="badge">${item.company || '-'}</span></td>
        <td>${item.tileName}</td>
        <td>${item.tileSize}</td>
        <td>${item.boxCount}</td>
        <td>${item.piecesPerBox}</td>
        <td>${totalPieces}</td>
        <td>${item.sqftPerBox ? (item.boxCount * item.sqftPerBox).toFixed(2) : "-"}</td>
        <td>${item.location || "-"}</td>
        <td>${item.pricePerBox ? "₹" + item.pricePerBox.toFixed(2) : "-"}</td>
        <td>${item.pricePerSqft ? "₹" + item.pricePerSqft.toFixed(2) : "-"}</td>
        <td>
          <button class="action-btn edit-btn" data-index="${item.index}">Edit</button>
          <button class="action-btn delete-btn" data-index="${item.index}">Delete</button>
        </td>
      `;

    stockTableBody.appendChild(tr);
  });

  // Attach events for Edit / Delete
  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = Number(btn.getAttribute("data-index"));
      startEdit(index);
    });
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = Number(btn.getAttribute("data-index"));
      deleteStock(index);
    });
  });
}

// ----- Helper: Levenshtein Distance -----
function levenshteinDistance(a, b) {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// ----- Edit -----
function startEdit(index) {
  const item = stocks[index];
  editIndex = index;

  companySelect.value = item.company || "";
  tileNameInput.value = item.tileName;
  tileSizeInput.value = item.tileSize;
  boxCountInput.value = item.boxCount;
  piecesPerBoxInput.value = item.piecesPerBox;
  locationInput.value = item.location;
  pricePerBoxInput.value = item.pricePerBox;
  pricePerSqftInput.value = item.pricePerSqft;
  sqftPerBoxInput.value = item.sqftPerBox;

  saveButton.textContent = "Update Stock";

  // Scroll to form
  stockForm.scrollIntoView({ behavior: 'smooth' });
}

// ----- Delete -----
async function deleteStock(index) {
  if (!confirm("Are you sure you want to delete this item?")) return;

  try {
    const stockId = stocks[index].id;
    await deleteStockAPI(stockId);

    // Reload stocks from server
    await loadStocksFromAPI();
    renderTable();
  } catch (error) {
    showError(error.message || 'Failed to delete stock');
  }
}
