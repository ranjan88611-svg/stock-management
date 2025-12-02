// ====== GLOBAL DATA ======
let stocks = [];
let editIndex = null; // null means "add mode", number means "edit mode"
let currentCompanyFilter = "ALL";

// ----- Check Authentication -----
if (localStorage.getItem("isLoggedIn") !== "true") {
  window.location.href = "login.html";
}

// ----- Load from localStorage on page load -----
window.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("tilesStocks");
  if (saved) {
    stocks = JSON.parse(saved);
  }
  renderTable();

  // Setup logout button
  const logoutBtn = document.getElementById("logoutButton");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("currentUser");
      window.location.href = "login.html";
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

// ----- Helpers -----
function saveToLocalStorage() {
  localStorage.setItem("tilesStocks", JSON.stringify(stocks));
}

function clearForm() {
  stockForm.reset();
  editIndex = null;
  saveButton.textContent = "Add Stock";
  companySelect.value = "";
}

// ----- Form Submit (Add / Update) -----
stockForm.addEventListener("submit", (e) => {
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

  if (editIndex === null) {
    // Add
    stocks.push(stockItem);
  } else {
    // Update
    stocks[editIndex] = stockItem;
  }

  saveToLocalStorage();
  renderTable();
  clearForm();
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
function renderTable() {
  const searchText = searchInput.value.toLowerCase();
  stockTableBody.innerHTML = "";

  stocks
    .map((stock, index) => ({ ...stock, index }))
    .filter((item) => {
      // Filter by Company
      if (currentCompanyFilter !== "ALL" && item.company !== currentCompanyFilter) {
        return false;
      }

      // Filter by Search
      if (!searchText) return true;
      return (
        item.tileName.toLowerCase().includes(searchText) ||
        item.tileSize.toLowerCase().includes(searchText)
      );
    })
    .forEach((item, displayIndex) => {
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
function deleteStock(index) {
  if (!confirm("Are you sure you want to delete this item?")) return;
  stocks.splice(index, 1);
  saveToLocalStorage();
  renderTable();
}
