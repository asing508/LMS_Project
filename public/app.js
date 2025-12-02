const API_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    loadDashboardStats();
    loadAllDropdowns();
    loadBooks();
    loadPublishers();
    loadReadersWithPhones();
    loadStaff();
    loadBorrowings();
    loadReports();
    loadStaffAssists();
    loadActiveBorrowingsForReturn();
    loadAvailableBooks();
    
    document.getElementById('issueDate').valueAsDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14); // 2 weeks default
    document.getElementById('dueDate').valueAsDate = dueDate;
    document.getElementById('returnDate').valueAsDate = new Date();
    
    setupFormListeners();
});

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(sec => {
        sec.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.section === sectionId) {
            btn.classList.add('active');
        }
    });
    
    refreshSectionData(sectionId);
}

function refreshSectionData(sectionId) {
    switch(sectionId) {
        case 'dashboard':
            loadDashboardStats();
            break;
        case 'books':
            loadBooks();
            break;
        case 'publishers':
            loadPublishers();
            break;
        case 'readers':
            loadReadersWithPhones();
            loadStaffAssists();
            break;
        case 'circulation':
            loadBorrowings();
            loadAvailableBooks();
            loadActiveBorrowingsForReturn();
            break;
        case 'reports':
            loadReports();
            break;
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

async function loadAllDropdowns() {
    await loadPublisherDropdowns();
    await loadStaffDropdowns();
    await loadReaderDropdowns();
}

async function loadPublisherDropdowns() {
    try {
        const res = await fetch(`${API_URL}/publishers`);
        const publishers = await res.json();
        
        const selects = [document.getElementById('bookPublisher')];
        selects.forEach(select => {
            if (!select) return;
            const currentVal = select.value;
            select.innerHTML = '<option value="">-- Select Publisher --</option>';
            publishers.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.publisher_id;
                opt.textContent = `${p.name} (${p.yearofpublication})`;
                select.appendChild(opt);
            });
            if (currentVal) select.value = currentVal;
        });
    } catch (err) {
        console.error('Error loading publishers:', err);
    }
}

async function loadStaffDropdowns() {
    try {
        const res = await fetch(`${API_URL}/staff`);
        const staff = await res.json();
        
        const selectIds = ['bookStaff', 'readerStaff', 'issueStaff', 'returnStaff'];
        selectIds.forEach(id => {
            const select = document.getElementById(id);
            if (!select) return;
            const currentVal = select.value;
            select.innerHTML = '<option value="">-- Select Staff --</option>';
            
            if (staff.length === 0) {
                select.innerHTML = '<option value="" disabled>No staff found - Add staff first!</option>';
            } else {
                staff.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s.staff_id;
                    opt.textContent = s.name;
                    select.appendChild(opt);
                });
            }
            if (currentVal) select.value = currentVal;
        });
    } catch (err) {
        console.error('Error loading staff:', err);
    }
}

async function loadReaderDropdowns() {
    try {
        const res = await fetch(`${API_URL}/readers`);
        const readers = await res.json();
        
        const select = document.getElementById('issueReader');
        if (!select) return;
        
        select.innerHTML = '<option value="">-- Select Reader --</option>';
        readers.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.user_id;
            opt.textContent = r.full_name;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error('Error loading readers:', err);
    }
}

async function loadAvailableBooks() {
    try {
        const res = await fetch(`${API_URL}/books/available`);
        const books = await res.json();
        
        const select = document.getElementById('issueBook');
        if (!select) return;
        
        select.innerHTML = '<option value="">-- Select Available Book --</option>';
        books.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.isbn;
            opt.textContent = `${b.title} (${b.isbn})`;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error('Error loading available books:', err);
    }
}

async function loadActiveBorrowingsForReturn() {
    try {
        const res = await fetch(`${API_URL}/borrowings?status=active`);
        const borrowings = await res.json();
        
        const select = document.getElementById('returnBorrowId');
        if (!select) return;
        
        select.innerHTML = '<option value="">-- Select Active Borrowing --</option>';
        borrowings.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.borrow_id;
            opt.textContent = `#${b.borrow_id}: ${b.reader_name} - ${b.book_title}`;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error('Error loading active borrowings:', err);
    }
}

async function loadDashboardStats() {
    try {
        const res = await fetch(`${API_URL}/stats`);
        const stats = await res.json();
        
        document.getElementById('statBooks').textContent = stats.totalBooks || 0;
        document.getElementById('statReaders').textContent = stats.totalReaders || 0;
        document.getElementById('statStaff').textContent = stats.totalStaff || 0;
        document.getElementById('statPublishers').textContent = stats.totalPublishers || 0;
        document.getElementById('statActive').textContent = stats.activeBorrowings || 0;
        document.getElementById('statOverdue').textContent = stats.overdueBooks || 0;
    } catch (err) {
        console.error('Error loading stats:', err);
    }
}

let currentBookPage = 1;
const booksPerPage = 10;

async function loadBooks() {
    try {
        const search = document.getElementById('bookSearch')?.value || '';
        const sort = document.getElementById('bookSort')?.value || 'title';
        const order = document.getElementById('bookOrder')?.value || 'asc';
        
        const res = await fetch(`${API_URL}/books?search=${encodeURIComponent(search)}&sort=${sort}&order=${order}&page=${currentBookPage}&limit=${booksPerPage}`);
        const data = await res.json();
        
        const tbody = document.getElementById('booksTableBody');
        tbody.innerHTML = '';
        
        if (data.books.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="no-data">No books found. Add your first book above!</td></tr>';
            return;
        }
        
        data.books.forEach((book, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${(currentBookPage - 1) * booksPerPage + idx + 1}</td>
                <td>${book.isbn}</td>
                <td>${book.title}</td>
                <td>${book.authno || 'N/A'}</td>
                <td>${book.category || 'N/A'}</td>
                <td>${book.edition || 'N/A'}</td>
                <td>$${parseFloat(book.price).toFixed(2)}</td>
                <td>${book.publisher_name || 'N/A'}</td>
                <td class="action-btns">
                    <button onclick="editBook('${book.isbn}')" class="update-btn">Edit</button>
                    <button onclick="deleteBook('${book.isbn}')" class="delete-btn">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        renderPagination('booksPagination', data.total, booksPerPage, currentBookPage, (page) => {
            currentBookPage = page;
            loadBooks();
        });
        
    } catch (err) {
        console.error('Error loading books:', err);
        showToast('Error loading books', 'error');
    }
}

function searchBooks() {
    currentBookPage = 1;
    loadBooks();
}

async function editBook(isbn) {
    try {
        const res = await fetch(`${API_URL}/books/${isbn}`);
        const book = await res.json();
        
        document.getElementById('editBookIsbn').value = book.isbn;
        document.getElementById('editBookTitle').value = book.title;
        document.getElementById('editBookAuthno').value = book.authno || '';
        document.getElementById('editBookPrice').value = book.price;
        document.getElementById('editBookCategory').value = book.category || '';
        document.getElementById('editBookEdition').value = book.edition || '';
        
        document.getElementById('editBookModal').style.display = 'block';
    } catch (err) {
        showToast('Error loading book details', 'error');
    }
}

async function deleteBook(isbn) {
    if (!confirm(`Are you sure you want to delete this book (ISBN: ${isbn})?`)) return;
    
    try {
        const res = await fetch(`${API_URL}/books/${isbn}`, { method: 'DELETE' });
        const data = await res.json();
        
        if (res.ok) {
            showToast('Book deleted successfully');
            loadBooks();
            loadAvailableBooks();
            loadDashboardStats();
        } else {
            showToast(data.error || 'Error deleting book', 'error');
        }
    } catch (err) {
        showToast('Error deleting book', 'error');
    }
}

async function loadPublishers() {
    try {
        const res = await fetch(`${API_URL}/publishers`);
        const publishers = await res.json();
        
        const tbody = document.getElementById('publishersTableBody');
        tbody.innerHTML = '';
        
        if (publishers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="no-data">No publishers found. Add one above!</td></tr>';
            return;
        }
        
        publishers.forEach((pub, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${idx + 1}</td>
                <td>${pub.publisher_id}</td>
                <td>${pub.name}</td>
                <td>${pub.yearofpublication}</td>
                <td class="action-btns">
                    <button onclick="deletePublisher(${pub.publisher_id})" class="delete-btn">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error loading publishers:', err);
    }
}

async function deletePublisher(id) {
    if (!confirm('Are you sure you want to delete this publisher?')) return;
    
    try {
        const res = await fetch(`${API_URL}/publishers/${id}`, { method: 'DELETE' });
        const data = await res.json();
        
        if (res.ok) {
            showToast('Publisher deleted successfully');
            loadPublishers();
            loadPublisherDropdowns();
            loadDashboardStats();
        } else {
            showToast(data.error || 'Error deleting publisher', 'error');
        }
    } catch (err) {
        showToast('Error deleting publisher', 'error');
    }
}

async function loadReadersWithPhones() {
    try {
        const res = await fetch(`${API_URL}/readers/full`);
        const readers = await res.json();
        
        const tbody = document.getElementById('readersTableBody');
        tbody.innerHTML = '';
        
        if (readers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="no-data">No readers registered. Add one above!</td></tr>';
            return;
        }
        
        readers.forEach((reader, idx) => {
            const phones = reader.phones.map(p => `${p.phone_number} (${p.phone_type})`).join(', ') || 'No phone';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${idx + 1}</td>
                <td>${reader.user_id}</td>
                <td>${reader.first_name} ${reader.last_name}</td>
                <td>${reader.email}</td>
                <td>${reader.address}</td>
                <td>${phones}</td>
                <td class="action-btns">
                    <button onclick="deleteReader(${reader.user_id})" class="delete-btn">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error loading readers:', err);
    }
}

async function deleteReader(userId) {
    if (!confirm('Are you sure you want to delete this reader? This will also delete their borrowing history.')) return;
    
    try {
        const res = await fetch(`${API_URL}/readers/${userId}`, { method: 'DELETE' });
        const data = await res.json();
        
        if (res.ok) {
            showToast('Reader deleted successfully');
            loadReadersWithPhones();
            loadReaderDropdowns();
            loadStaffAssists();
            loadDashboardStats();
        } else {
            showToast(data.error || 'Error deleting reader', 'error');
        }
    } catch (err) {
        showToast('Error deleting reader', 'error');
    }
}

async function loadStaffAssists() {
    try {
        const res = await fetch(`${API_URL}/staff-assists`);
        const assists = await res.json();
        
        const tbody = document.getElementById('assistsTableBody');
        tbody.innerHTML = '';
        
        if (assists.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="no-data">No assistance records yet.</td></tr>';
            return;
        }
        
        assists.forEach((assist, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${idx + 1}</td>
                <td>${assist.assist_id}</td>
                <td>${assist.staff_name}</td>
                <td>${assist.reader_name}</td>
                <td>${assist.reader_email}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error loading staff assists:', err);
    }
}

async function loadStaff() {
    try {
        const res = await fetch(`${API_URL}/staff`);
        const staff = await res.json();
        
        const tbody = document.getElementById('staffTableBody');
        tbody.innerHTML = '';
        
        if (staff.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="no-data">No staff members. Create an account above!</td></tr>';
            return;
        }
        
        staff.forEach((s, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${idx + 1}</td>
                <td>${s.staff_id}</td>
                <td>${s.name}</td>
                <td>${s.login_id}</td>
                <td class="action-btns">
                    <button onclick="changeStaffPassword(${s.staff_id})" class="update-btn">Change Password</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error loading staff:', err);
    }
}

async function changeStaffPassword(staffId) {
    const oldPass = prompt('Enter current password:');
    if (!oldPass) return;
    
    const newPass = prompt('Enter new password (min 8 characters):');
    if (!newPass || newPass.length < 8) {
        showToast('Password must be at least 8 characters', 'error');
        return;
    }
    
    try {
        const res = await fetch(`${API_URL}/staff/${staffId}/password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ old_password: oldPass, new_password: newPass })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            showToast('Password updated successfully');
        } else {
            showToast(data.error || 'Error updating password', 'error');
        }
    } catch (err) {
        showToast('Error updating password', 'error');
    }
}

async function loadBorrowings() {
    try {
        const filter = document.getElementById('borrowingFilter')?.value || '';
        const res = await fetch(`${API_URL}/borrowings?status=${filter}`);
        const borrowings = await res.json();
        
        const tbody = document.getElementById('borrowingsTableBody');
        tbody.innerHTML = '';
        
        if (borrowings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="no-data">No borrowing records found.</td></tr>';
            return;
        }
        
        borrowings.forEach((b, idx) => {
            const statusClass = b.status === 'Active' ? 'status-active' : 
                               b.status === 'Overdue' ? 'status-overdue' : 'status-returned';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${idx + 1}</td>
                <td>${b.borrow_id}</td>
                <td>${b.reader_name}</td>
                <td>${b.book_title}</td>
                <td>${formatDate(b.issuedate)}</td>
                <td>${formatDate(b.duedate)}</td>
                <td>${b.returndate ? formatDate(b.returndate) : '-'}</td>
                <td><span class="status-badge ${statusClass}">${b.status}</span></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error loading borrowings:', err);
    }
}

async function loadReports() {
    try {
        const filter = document.getElementById('reportFilter')?.value || '';
        const res = await fetch(`${API_URL}/reports?type=${filter}`);
        const reports = await res.json();
        
        const tbody = document.getElementById('reportsTableBody');
        tbody.innerHTML = '';
        
        if (reports.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="no-data">No transaction records found.</td></tr>';
            return;
        }
        
        reports.forEach((r, idx) => {
            const actionClass = r.issue_return === 'ISSUE' ? 'action-issue' : 'action-return';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${idx + 1}</td>
                <td>${r.reg_no}</td>
                <td><span class="action-badge ${actionClass}">${r.issue_return}</span></td>
                <td>${r.reader_name}</td>
                <td>${r.book_title}</td>
                <td>${r.isbn}</td>
                <td>${r.staff_name}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error loading reports:', err);
    }
}

function setupFormListeners() {
    // Add Book Form
    document.getElementById('addBookForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = {
            isbn: document.getElementById('bookIsbn').value.trim(),
            title: document.getElementById('bookTitle').value.trim(),
            authno: parseInt(document.getElementById('bookAuthno').value),
            price: parseFloat(document.getElementById('bookPrice').value),
            category: document.getElementById('bookCategory').value.trim(),
            edition: document.getElementById('bookEdition').value.trim(),
            publisher_id: parseInt(document.getElementById('bookPublisher').value),
            staff_id: parseInt(document.getElementById('bookStaff').value)
        };
        
        if (!data.publisher_id || !data.staff_id) {
            showToast('Please select a publisher and staff member', 'error');
            return;
        }
        
        try {
            const res = await fetch(`${API_URL}/books`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const result = await res.json();
            
            if (res.ok) {
                showToast('Book added successfully!');
                e.target.reset();
                loadBooks();
                loadAvailableBooks();
                loadDashboardStats();
            } else {
                showToast(result.error || 'Error adding book', 'error');
            }
        } catch (err) {
            showToast('Error adding book', 'error');
        }
    });
    
    document.getElementById('editBookForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const isbn = document.getElementById('editBookIsbn').value;
        const data = {
            title: document.getElementById('editBookTitle').value.trim(),
            authno: parseInt(document.getElementById('editBookAuthno').value),
            price: parseFloat(document.getElementById('editBookPrice').value),
            category: document.getElementById('editBookCategory').value.trim(),
            edition: document.getElementById('editBookEdition').value.trim()
        };
        
        try {
            const res = await fetch(`${API_URL}/books/${isbn}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (res.ok) {
                showToast('Book updated successfully!');
                closeModal('editBookModal');
                loadBooks();
            } else {
                const result = await res.json();
                showToast(result.error || 'Error updating book', 'error');
            }
        } catch (err) {
            showToast('Error updating book', 'error');
        }
    });
    
    document.getElementById('addPublisherForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = {
            name: document.getElementById('pubName').value.trim(),
            yearofpublication: parseInt(document.getElementById('pubYear').value)
        };
        
        try {
            const res = await fetch(`${API_URL}/publishers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (res.ok) {
                showToast('Publisher added successfully!');
                e.target.reset();
                loadPublishers();
                loadPublisherDropdowns();
                loadDashboardStats();
            } else {
                const result = await res.json();
                showToast(result.error || 'Error adding publisher', 'error');
            }
        } catch (err) {
            showToast('Error adding publisher', 'error');
        }
    });
    
    document.getElementById('addReaderForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = {
            first_name: document.getElementById('readerFirstName').value.trim(),
            last_name: document.getElementById('readerLastName').value.trim(),
            email: document.getElementById('readerEmail').value.trim(),
            address: document.getElementById('readerAddress').value.trim(),
            phone_number: document.getElementById('readerPhone').value.trim(),
            phone_type: document.getElementById('readerPhoneType').value,
            staff_id: parseInt(document.getElementById('readerStaff').value)
        };
        
        if (!data.staff_id) {
            showToast('Please select a staff member', 'error');
            return;
        }
        
        try {
            const res = await fetch(`${API_URL}/readers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (res.ok) {
                showToast('Reader registered successfully!');
                e.target.reset();
                loadReadersWithPhones();
                loadReaderDropdowns();
                loadStaffAssists();
                loadDashboardStats();
            } else {
                const result = await res.json();
                showToast(result.error || 'Error registering reader', 'error');
            }
        } catch (err) {
            showToast('Error registering reader', 'error');
        }
    });
    
    document.getElementById('addStaffForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const password = document.getElementById('staffPassword').value;
        const confirmPassword = document.getElementById('staffPasswordConfirm').value;
        
        if (password !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }
        
        if (password.length < 8) {
            showToast('Password must be at least 8 characters', 'error');
            return;
        }
        
        const data = {
            name: document.getElementById('staffName').value.trim(),
            login_id: document.getElementById('staffLogin').value.trim(),
            password: password
        };
        
        try {
            const res = await fetch(`${API_URL}/staff`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (res.ok) {
                showToast('Staff account created securely!');
                e.target.reset();
                loadStaff();
                loadStaffDropdowns();
                loadDashboardStats();
            } else {
                const result = await res.json();
                showToast(result.error || 'Error creating staff', 'error');
            }
        } catch (err) {
            showToast('Error creating staff', 'error');
        }
    });
    
    document.getElementById('testLoginForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = {
            login_id: document.getElementById('testLoginId').value.trim(),
            password: document.getElementById('testPassword').value
        };
        
        const resultDiv = document.getElementById('loginResult');
        
        try {
            const res = await fetch(`${API_URL}/staff/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const result = await res.json();
            
            if (res.ok) {
                resultDiv.innerHTML = `<div class="success-msg">✅ Login successful! Welcome, ${result.staff.name}</div>`;
            } else {
                resultDiv.innerHTML = `<div class="error-msg">❌ ${result.error}</div>`;
            }
        } catch (err) {
            resultDiv.innerHTML = `<div class="error-msg">❌ Error testing login</div>`;
        }
    });
    
    document.getElementById('issueBookForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = {
            user_id: parseInt(document.getElementById('issueReader').value),
            isbn: document.getElementById('issueBook').value,
            staff_id: parseInt(document.getElementById('issueStaff').value),
            issuedate: document.getElementById('issueDate').value,
            duedate: document.getElementById('dueDate').value
        };
        
        try {
            const res = await fetch(`${API_URL}/borrowings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (res.ok) {
                showToast('Book issued successfully!');
                e.target.reset();
                document.getElementById('issueDate').valueAsDate = new Date();
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + 14);
                document.getElementById('dueDate').valueAsDate = dueDate;
                
                loadBorrowings();
                loadAvailableBooks();
                loadActiveBorrowingsForReturn();
                loadReports();
                loadDashboardStats();
            } else {
                const result = await res.json();
                showToast(result.error || 'Error issuing book', 'error');
            }
        } catch (err) {
            showToast('Error issuing book', 'error');
        }
    });
    
    document.getElementById('returnBookForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = {
            borrow_id: parseInt(document.getElementById('returnBorrowId').value),
            returndate: document.getElementById('returnDate').value,
            staff_id: parseInt(document.getElementById('returnStaff').value)
        };
        
        try {
            const res = await fetch(`${API_URL}/returns`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (res.ok) {
                showToast('Book returned successfully!');
                e.target.reset();
                document.getElementById('returnDate').valueAsDate = new Date();
                
                loadBorrowings();
                loadAvailableBooks();
                loadActiveBorrowingsForReturn();
                loadReports();
                loadDashboardStats();
            } else {
                const result = await res.json();
                showToast(result.error || 'Error processing return', 'error');
            }
        } catch (err) {
            showToast('Error processing return', 'error');
        }
    });
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

function renderPagination(containerId, total, perPage, currentPage, onPageChange) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const totalPages = Math.ceil(total / perPage);
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    
    html += `<button onclick="this.blur()" ${currentPage === 1 ? 'disabled' : ''} class="page-btn" data-page="${currentPage - 1}">« Prev</button>`;
    html += `<span>Page ${currentPage} of ${totalPages}</span>`;
    html += `<button onclick="this.blur()" ${currentPage === totalPages ? 'disabled' : ''} class="page-btn" data-page="${currentPage + 1}">Next »</button>`;
    
    container.innerHTML = html;
    
    container.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = parseInt(btn.dataset.page);
            if (page >= 1 && page <= totalPages) {
                onPageChange(page);
            }
        });
    });
}