const API_URL = 'http://localhost:3000/api';

// Pagination State
let currentPage = 1;
let itemsPerPage = 10;
let allBooks = [];
let currentSort = 'title';

// --- LOAD BOOKS ---
async function loadBooks() {
    const res = await fetch(`${API_URL}/books`);
    allBooks = await res.json();
    sortBooks();
}

// --- SORT BOOKS ---
function sortBooks() {
    const sortValue = document.getElementById('sortSelect').value;
    currentSort = sortValue;
    
    let sorted = [...allBooks];
    
    switch(sortValue) {
        case 'title':
            sorted.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'title_desc':
            sorted.sort((a, b) => b.title.localeCompare(a.title));
            break;
        case 'price_asc':
            sorted.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
            break;
        case 'price_desc':
            sorted.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
            break;
    }
    
    allBooks = sorted;
    currentPage = 1; // Reset to first page
    renderTable();
}

// --- SEARCH BOOKS ---
async function searchBooks() {
    const query = document.getElementById('searchInput').value.trim();
    
    if (!query) {
        loadBooks();
        return;
    }
    
    const res = await fetch(`${API_URL}/books/search?q=${query}`);
    allBooks = await res.json();
    currentPage = 1;
    renderTable();
}

// --- RENDER TABLE WITH PAGINATION ---
function renderTable() {
    const tbody = document.getElementById('bookTableBody');
    tbody.innerHTML = '';
    
    // Calculate pagination
    const totalPages = Math.ceil(allBooks.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const booksToShow = allBooks.slice(startIndex, endIndex);
    
    if (booksToShow.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">No books found</td></tr>';
    } else {
        booksToShow.forEach((book, index) => {
            const globalIndex = startIndex + index + 1; // Global numbering
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${globalIndex}</td>
                <td>${book.isbn}</td>
                <td>${book.title}</td>
                <td>${book.publisher_name}</td>
                <td>${book.category || 'N/A'}</td>
                <td>$${parseFloat(book.price).toFixed(2)}</td>
                <td>
                    <button class="update-btn" onclick="updatePrice('${book.isbn}')">Edit Price</button>
                    <button class="delete-btn" onclick="deleteBook('${book.isbn}')">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
    
    // Update pagination controls
    updatePaginationControls(totalPages);
}

// --- UPDATE PAGINATION CONTROLS ---
function updatePaginationControls(totalPages) {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageInfo = document.getElementById('pageInfo');
    
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    
    pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
}

// --- PAGINATION FUNCTIONS ---
function nextPage() {
    const totalPages = Math.ceil(allBooks.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderTable();
    }
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderTable();
    }
}

// --- ADD BOOK ---
document.getElementById('addBookForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        isbn: document.getElementById('newIsbn').value,
        title: document.getElementById('newTitle').value,
        price: document.getElementById('newPrice').value,
        category: document.getElementById('newCategory').value,
        publisher_id: document.getElementById('pubId').value,
        staff_id: document.getElementById('staffId').value
    };

    const res = await fetch(`${API_URL}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if(res.ok) {
        alert('Book Added Successfully!');
        loadBooks();
        e.target.reset();
    } else {
        const error = await res.json();
        alert('Error adding book: ' + (error.error || 'Check publisher/staff IDs'));
    }
});

// --- DELETE BOOK ---
async function deleteBook(isbn) {
    if(!confirm(`Are you sure you want to delete book ${isbn}?`)) return;

    const res = await fetch(`${API_URL}/books/${isbn}`, { method: 'DELETE' });
    if(res.ok) {
        alert('Book deleted successfully!');
        loadBooks();
    } else {
        const error = await res.json();
        alert('Error deleting book: ' + (error.error || 'Book might be referenced in borrowing records'));
    }
}

// --- UPDATE PRICE ---
async function updatePrice(isbn) {
    const newPrice = prompt("Enter new price:");
    if(!newPrice || isNaN(newPrice) || parseFloat(newPrice) <= 0) {
        if(newPrice !== null) alert('Please enter a valid price');
        return;
    }

    const res = await fetch(`${API_URL}/books/${isbn}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: parseFloat(newPrice) })
    });

    if(res.ok) {
        alert('Price updated successfully!');
        loadBooks();
    } else {
        alert('Error updating price');
    }
}

// --- ISSUE BOOK (TRANSACTION) ---
document.getElementById('borrowForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        user_id: document.getElementById('borrowUserId').value,
        isbn: document.getElementById('borrowIsbn').value,
        issuedate: document.getElementById('issueDate').value,
        duedate: document.getElementById('dueDate').value
    };

    const res = await fetch(`${API_URL}/borrow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    const msg = document.getElementById('transactionMessage');
    if(res.ok) {
        msg.textContent = "✓ Transaction Successful! Book Issued.";
        msg.style.color = "green";
        e.target.reset();
        setTimeout(() => { msg.textContent = ''; }, 3000);
    } else {
        const error = await res.json();
        msg.textContent = "✗ Transaction Failed: " + (error.error || 'Check User ID or ISBN');
        msg.style.color = "red";
    }
});

// Initial Load
loadBooks();