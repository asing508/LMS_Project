const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'change_database_accordingly', //change the database
    password: 'change_password_accordingly', // change the password
    port: 5432,
});

app.get('/api/publishers', async (req, res) => {
    try {
        const result = await db.query('SELECT publisher_id, name, yearofpublication FROM publisher ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/staff', async (req, res) => {
    try {
        const result = await db.query('SELECT staff_id, name, login_id FROM staff ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/readers', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT r.user_id, r.first_name, r.last_name, r.email, r.address,
                   r.first_name || ' ' || r.last_name as full_name
            FROM reader r 
            ORDER BY r.first_name ASC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get available books (not currently borrowed)
app.get('/api/books/available', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT b.isbn, b.title 
            FROM book b
            WHERE b.isbn NOT IN (
                SELECT isbn FROM borrowing WHERE returndate IS NULL
            )
            ORDER BY b.title ASC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET all books with publisher info
app.get('/api/books', async (req, res) => {
    try {
        const { search, sort, order, page, limit } = req.query;
        let query = `
            SELECT b.*, p.name as publisher_name, s.name as added_by_staff
            FROM book b
            LEFT JOIN publisher p ON b.publisher_id = p.publisher_id
            LEFT JOIN staff s ON b.staff_id = s.staff_id
        `;
        
        const params = [];
        
        // Search functionality
        if (search) {
            query += ` WHERE b.title ILIKE $1 OR b.isbn ILIKE $1 OR b.category ILIKE $1`;
            params.push(`%${search}%`);
        }
        
        // Sorting
        const validSortColumns = ['title', 'price', 'category', 'isbn'];
        const sortColumn = validSortColumns.includes(sort) ? sort : 'title';
        const sortOrder = order === 'desc' ? 'DESC' : 'ASC';
        query += ` ORDER BY b.${sortColumn} ${sortOrder}`;
        
        // Pagination
        if (page && limit) {
            const offset = (parseInt(page) - 1) * parseInt(limit);
            query += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;
        }
        
        const result = await db.query(query, params);
        
        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) FROM book';
        if (search) {
            countQuery = `SELECT COUNT(*) FROM book WHERE title ILIKE $1 OR isbn ILIKE $1 OR category ILIKE $1`;
        }
        const countResult = await db.query(countQuery, search ? [`%${search}%`] : []);
        
        res.json({
            books: result.rows,
            total: parseInt(countResult.rows[0].count)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET single book
app.get('/api/books/:isbn', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT b.*, p.name as publisher_name 
            FROM book b
            LEFT JOIN publisher p ON b.publisher_id = p.publisher_id
            WHERE b.isbn = $1
        `, [req.params.isbn]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Book not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST - Add new book
app.post('/api/books', async (req, res) => {
    const { isbn, title, authno, price, category, edition, publisher_id, staff_id } = req.body;
    
    // Validation
    if (!isbn || !title || !authno || !price || !category || !edition || !publisher_id || !staff_id) {
        return res.status(400).json({ error: 'All fields are required: isbn, title, authno, price, category, edition, publisher_id, staff_id' });
    }
    
    try {
        const query = `
            INSERT INTO book (isbn, title, authno, price, category, edition, publisher_id, staff_id) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING *;
        `;
        const result = await db.query(query, [isbn, title, authno, price, category, edition, publisher_id, staff_id]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            res.status(400).json({ error: 'A book with this ISBN already exists' });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

// PUT - Update book
app.put('/api/books/:isbn', async (req, res) => {
    const { title, authno, price, category, edition, publisher_id } = req.body;
    
    try {
        const result = await db.query(`
            UPDATE book 
            SET title = COALESCE($1, title),
                authno = COALESCE($2, authno),
                price = COALESCE($3, price),
                category = COALESCE($4, category),
                edition = COALESCE($5, edition),
                publisher_id = COALESCE($6, publisher_id)
            WHERE isbn = $7
            RETURNING *
        `, [title, authno, price, category, edition, publisher_id, req.params.isbn]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Book not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE book
app.delete('/api/books/:isbn', async (req, res) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        
        // Check if book has active borrowings
        const borrowCheck = await client.query(
            'SELECT COUNT(*) FROM borrowing WHERE isbn = $1 AND returndate IS NULL',
            [req.params.isbn]
        );
        
        if (parseInt(borrowCheck.rows[0].count) > 0) {
            throw new Error('Cannot delete book with active borrowings');
        }
        
        // Delete related records first (reports)
        await client.query('DELETE FROM report WHERE book_isbn = $1', [req.params.isbn]);
        
        // Delete borrowing history
        await client.query('DELETE FROM borrowing WHERE isbn = $1', [req.params.isbn]);
        
        // Delete the book
        const result = await client.query('DELETE FROM book WHERE isbn = $1 RETURNING *', [req.params.isbn]);
        
        if (result.rows.length === 0) {
            throw new Error('Book not found');
        }
        
        await client.query('COMMIT');
        res.json({ message: 'Book deleted successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

app.post('/api/publishers', async (req, res) => {
    const { name, yearofpublication } = req.body;
    
    if (!name || !yearofpublication) {
        return res.status(400).json({ error: 'Name and year of publication are required' });
    }
    
    try {
        const result = await db.query(
            'INSERT INTO publisher (name, yearofpublication) VALUES ($1, $2) RETURNING *',
            [name, yearofpublication]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/publishers/:id', async (req, res) => {
    const { name, yearofpublication } = req.body;
    try {
        const result = await db.query(
            'UPDATE publisher SET name = COALESCE($1, name), yearofpublication = COALESCE($2, yearofpublication) WHERE publisher_id = $3 RETURNING *',
            [name, yearofpublication, req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Publisher not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/publishers/:id', async (req, res) => {
    try {
        // Check if publisher has books
        const bookCheck = await db.query('SELECT COUNT(*) FROM book WHERE publisher_id = $1', [req.params.id]);
        if (parseInt(bookCheck.rows[0].count) > 0) {
            return res.status(400).json({ error: 'Cannot delete publisher with associated books' });
        }
        
        const result = await db.query('DELETE FROM publisher WHERE publisher_id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Publisher not found' });
        }
        res.json({ message: 'Publisher deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET all readers with their phones
app.get('/api/readers/full', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT r.*, 
                   COALESCE(json_agg(
                       json_build_object('phone_id', rp.phone_id, 'phone_number', rp.phone_number, 'phone_type', rp.phone_type)
                   ) FILTER (WHERE rp.phone_id IS NOT NULL), '[]') as phones
            FROM reader r
            LEFT JOIN reader_phone rp ON r.user_id = rp.user_id
            GROUP BY r.user_id
            ORDER BY r.first_name ASC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST - Register new reader
app.post('/api/readers', async (req, res) => {
    const { first_name, last_name, email, address, phone_number, phone_type, staff_id } = req.body;
    
    if (!first_name || !last_name || !email || !address || !phone_number || !phone_type || !staff_id) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        
        const readerRes = await client.query(
            'INSERT INTO reader (first_name, last_name, email, address) VALUES ($1, $2, $3, $4) RETURNING user_id',
            [first_name, last_name, email, address]
        );
        const userId = readerRes.rows[0].user_id;
        
        await client.query(
            'INSERT INTO reader_phone (user_id, phone_number, phone_type) VALUES ($1, $2, $3)',
            [userId, phone_number, phone_type]
        );
        
        await client.query(
            'INSERT INTO staff_assists_reader (staff_id, user_id) VALUES ($1, $2)',
            [staff_id, userId]
        );
        
        await client.query('COMMIT');
        res.status(201).json({ message: 'Reader registered successfully', user_id: userId });
    } catch (err) {
        await client.query('ROLLBACK');
        if (err.code === '23505') {
            res.status(400).json({ error: 'Email already exists' });
        } else {
            res.status(500).json({ error: err.message });
        }
    } finally {
        client.release();
    }
});

// Add additional phone to existing reader
app.post('/api/readers/:userId/phone', async (req, res) => {
    const { phone_number, phone_type } = req.body;
    
    try {
        const result = await db.query(
            'INSERT INTO reader_phone (user_id, phone_number, phone_type) VALUES ($1, $2, $3) RETURNING *',
            [req.params.userId, phone_number, phone_type]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update reader
app.put('/api/readers/:userId', async (req, res) => {
    const { first_name, last_name, email, address } = req.body;
    
    try {
        const result = await db.query(`
            UPDATE reader 
            SET first_name = COALESCE($1, first_name),
                last_name = COALESCE($2, last_name),
                email = COALESCE($3, email),
                address = COALESCE($4, address)
            WHERE user_id = $5
            RETURNING *
        `, [first_name, last_name, email, address, req.params.userId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Reader not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete reader
app.delete('/api/readers/:userId', async (req, res) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        
        // Check for active borrowings
        const borrowCheck = await client.query(
            'SELECT COUNT(*) FROM borrowing WHERE user_id = $1 AND returndate IS NULL',
            [req.params.userId]
        );
        
        if (parseInt(borrowCheck.rows[0].count) > 0) {
            throw new Error('Cannot delete reader with active borrowings');
        }
        
        // Delete related records
        await client.query('DELETE FROM reader_phone WHERE user_id = $1', [req.params.userId]);
        await client.query('DELETE FROM staff_assists_reader WHERE user_id = $1', [req.params.userId]);
        await client.query('DELETE FROM report WHERE user_id = $1', [req.params.userId]);
        await client.query('DELETE FROM borrowing WHERE user_id = $1', [req.params.userId]);
        
        const result = await client.query('DELETE FROM reader WHERE user_id = $1 RETURNING *', [req.params.userId]);
        
        if (result.rows.length === 0) {
            throw new Error('Reader not found');
        }
        
        await client.query('COMMIT');
        res.json({ message: 'Reader deleted successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

app.post('/api/staff', async (req, res) => {
    const { name, login_id, password } = req.body;
    
    if (!name || !login_id || !password) {
        return res.status(400).json({ error: 'Name, login ID, and password are required' });
    }
    
    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        
        await client.query(
            'INSERT INTO authentication (login_id, password_hash) VALUES ($1, $2)',
            [login_id, password_hash]
        );
        
        const staffRes = await client.query(
            'INSERT INTO staff (name, login_id) VALUES ($1, $2) RETURNING *',
            [name, login_id]
        );
        
        await client.query('COMMIT');
        res.status(201).json({ 
            message: 'Staff account created securely',
            staff: { staff_id: staffRes.rows[0].staff_id, name, login_id }
        });
    } catch (err) {
        await client.query('ROLLBACK');
        if (err.code === '23505') {
            res.status(400).json({ error: 'Login ID already exists' });
        } else {
            res.status(500).json({ error: err.message });
        }
    } finally {
        client.release();
    }
});

// Staff login
app.post('/api/staff/login', async (req, res) => {
    const { login_id, password } = req.body;
    
    try {
        const authResult = await db.query(
            'SELECT * FROM authentication WHERE login_id = $1',
            [login_id]
        );
        
        if (authResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const validPassword = await bcrypt.compare(password, authResult.rows[0].password_hash);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const staffResult = await db.query(
            'SELECT staff_id, name, login_id FROM staff WHERE login_id = $1',
            [login_id]
        );
        
        res.json({ 
            message: 'Login successful',
            staff: staffResult.rows[0]
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update staff password
app.put('/api/staff/:staffId/password', async (req, res) => {
    const { old_password, new_password } = req.body;
    
    if (!new_password || new_password.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }
    
    const client = await db.connect();
    try {
        // Get staff login_id
        const staffRes = await client.query(
            'SELECT login_id FROM staff WHERE staff_id = $1',
            [req.params.staffId]
        );
        
        if (staffRes.rows.length === 0) {
            return res.status(404).json({ error: 'Staff not found' });
        }
        
        const login_id = staffRes.rows[0].login_id;
        
        // Verify old password
        const authRes = await client.query(
            'SELECT password_hash FROM authentication WHERE login_id = $1',
            [login_id]
        );
        
        const validPassword = await bcrypt.compare(old_password, authRes.rows[0].password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        
        // Hash and update new password
        const newHash = await bcrypt.hash(new_password, 10);
        await client.query(
            'UPDATE authentication SET password_hash = $1 WHERE login_id = $2',
            [newHash, login_id]
        );
        
        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

app.get('/api/borrowings', async (req, res) => {
    try {
        const { status } = req.query;
        let query = `
            SELECT br.borrow_id, br.issuedate, br.duedate, br.returndate,
                   r.user_id, r.first_name || ' ' || r.last_name as reader_name, r.email,
                   b.isbn, b.title as book_title,
                   CASE 
                       WHEN br.returndate IS NOT NULL THEN 'Returned'
                       WHEN br.duedate < CURRENT_DATE THEN 'Overdue'
                       ELSE 'Active'
                   END as status
            FROM borrowing br
            JOIN reader r ON br.user_id = r.user_id
            JOIN book b ON br.isbn = b.isbn
        `;
        
        if (status === 'active') {
            query += ' WHERE br.returndate IS NULL';
        } else if (status === 'returned') {
            query += ' WHERE br.returndate IS NOT NULL';
        } else if (status === 'overdue') {
            query += ' WHERE br.returndate IS NULL AND br.duedate < CURRENT_DATE';
        }
        
        query += ' ORDER BY br.borrow_id DESC';
        
        const result = await db.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/borrowings', async (req, res) => {
    const { user_id, isbn, issuedate, duedate, staff_id } = req.body;
    
    if (!user_id || !isbn || !issuedate || !duedate || !staff_id) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        
        const availCheck = await client.query(
            'SELECT COUNT(*) FROM borrowing WHERE isbn = $1 AND returndate IS NULL',
            [isbn]
        );
        
        if (parseInt(availCheck.rows[0].count) > 0) {
            throw new Error('This book is currently borrowed by another reader');
        }
        
        const borrowRes = await client.query(
            'INSERT INTO borrowing (user_id, isbn, issuedate, duedate) VALUES ($1, $2, $3, $4) RETURNING borrow_id',
            [user_id, isbn, issuedate, duedate]
        );
        
        await client.query(
            'INSERT INTO report (issue_return, user_id, book_isbn, staff_id) VALUES ($1, $2, $3, $4)',
            ['ISSUE', user_id, isbn, staff_id]
        );
        
        await client.query('COMMIT');
        res.status(201).json({ 
            message: 'Book issued successfully',
            borrow_id: borrowRes.rows[0].borrow_id
        });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

app.post('/api/returns', async (req, res) => {
    const { borrow_id, returndate, staff_id } = req.body;
    
    if (!borrow_id || !returndate || !staff_id) {
        return res.status(400).json({ error: 'Borrow ID, return date, and staff ID are required' });
    }
    
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        
        // Check if already returned
        const checkRes = await client.query(
            'SELECT * FROM borrowing WHERE borrow_id = $1',
            [borrow_id]
        );
        
        if (checkRes.rows.length === 0) {
            throw new Error('Borrow record not found');
        }
        
        if (checkRes.rows[0].returndate !== null) {
            throw new Error('This book has already been returned');
        }
        
        const { user_id, isbn } = checkRes.rows[0];
        
        await client.query(
            'UPDATE borrowing SET returndate = $1 WHERE borrow_id = $2',
            [returndate, borrow_id]
        );
        
        await client.query(
            'INSERT INTO report (issue_return, user_id, book_isbn, staff_id) VALUES ($1, $2, $3, $4)',
            ['RETURN', user_id, isbn, staff_id]
        );
        
        await client.query('COMMIT');
        res.json({ message: 'Book returned successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

app.get('/api/reports', async (req, res) => {
    try {
        const { type, start_date, end_date } = req.query;
        
        let query = `
            SELECT rep.reg_no, rep.issue_return, 
                   r.first_name || ' ' || r.last_name as reader_name,
                   b.title as book_title, b.isbn,
                   s.name as staff_name
            FROM report rep
            JOIN reader r ON rep.user_id = r.user_id
            JOIN book b ON rep.book_isbn = b.isbn
            JOIN staff s ON rep.staff_id = s.staff_id
        `;
        
        const conditions = [];
        const params = [];
        
        if (type) {
            params.push(type);
            conditions.push(`rep.issue_return = $${params.length}`);
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ' ORDER BY rep.reg_no DESC';
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/staff-assists', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT sar.assist_id, 
                   s.name as staff_name,
                   r.first_name || ' ' || r.last_name as reader_name,
                   r.email as reader_email
            FROM staff_assists_reader sar
            JOIN staff s ON sar.staff_id = s.staff_id
            JOIN reader r ON sar.user_id = r.user_id
            ORDER BY sar.assist_id DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const stats = {};
        
        // Total books
        const bookCount = await db.query('SELECT COUNT(*) FROM book');
        stats.totalBooks = parseInt(bookCount.rows[0].count);
        
        // Total readers
        const readerCount = await db.query('SELECT COUNT(*) FROM reader');
        stats.totalReaders = parseInt(readerCount.rows[0].count);
        
        // Total staff
        const staffCount = await db.query('SELECT COUNT(*) FROM staff');
        stats.totalStaff = parseInt(staffCount.rows[0].count);
        
        // Active borrowings
        const activeCount = await db.query('SELECT COUNT(*) FROM borrowing WHERE returndate IS NULL');
        stats.activeBorrowings = parseInt(activeCount.rows[0].count);
        
        // Overdue books
        const overdueCount = await db.query('SELECT COUNT(*) FROM borrowing WHERE returndate IS NULL AND duedate < CURRENT_DATE');
        stats.overdueBooks = parseInt(overdueCount.rows[0].count);
        
        // Total publishers
        const pubCount = await db.query('SELECT COUNT(*) FROM publisher');
        stats.totalPublishers = parseInt(pubCount.rows[0].count);
        
        // Total transactions (reports)
        const reportCount = await db.query('SELECT COUNT(*) FROM report');
        stats.totalTransactions = parseInt(reportCount.rows[0].count);
        
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(port, () => {
    console.log(`Library Management System Server running on http://localhost:${port}`);
    console.log(`   - API available at http://localhost:${port}/api`);
});
