const API_URL = 'http://localhost:3000/api';

// --- LOAD BOOKS ---
async function loadBooks() {
    const res = await fetch(`${API_URL}/books`);
    const books = await res.json();
    renderTable(books);
}

// --- SEARCH BOOKS ---
async function searchBooks() {
    const query = document.getElementById('searchInput').value;
    const res = await fetch(`${API_URL}/books/search?q=${query}`);
    const books = await res.json();
    renderTable(books);
}

// --- RENDER TABLE ---
function renderTable(books) {
    const tbody = document.getElementById('bookTableBody');
    tbody.innerHTML = '';
    
    books.forEach(book => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${book.isbn}</td>
            <td>${book.title}</td>
            <td>${book.publisher_name}</td>
            <td>$${book.price}</td>
            <td>
                <button class="update-btn" onclick="updatePrice('${book.isbn}')">Edit Price</button>
                <button class="delete-btn" onclick="deleteBook('${book.isbn}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
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
        alert('Error adding book. Check console/IDs.');
    }
});

// --- DELETE BOOK ---
async function deleteBook(isbn) {
    if(!confirm(`Are you sure you want to delete book ${isbn}?`)) return;

    const res = await fetch(`${API_URL}/books/${isbn}`, { method: 'DELETE' });
    if(res.ok) {
        loadBooks();
    } else {
        alert('Error deleting book (It might be referenced in borrowing records!)');
    }
}

// --- UPDATE PRICE ---
async function updatePrice(isbn) {
    const newPrice = prompt("Enter new price:");
    if(!newPrice) return;

    const res = await fetch(`${API_URL}/books/${isbn}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: newPrice })
    });

    if(res.ok) {
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
        msg.textContent = "Transaction Successful! Book Issued.";
        msg.style.color = "green";
        e.target.reset();
    } else {
        msg.textContent = "Transaction Failed. Check User ID or ISBN.";
        msg.style.color = "red";
    }
});

// Initial Load
loadBooks();