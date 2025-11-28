const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Database Connection
const db = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres', // Or your specific DB name
    password: 'sqladi@2708', // CHANGE THIS
    port: 5432,
});

// --- ROUTES ---

// 1. READ (Query): Get all books with Publisher Name (JOIN)
app.get('/api/books', async (req, res) => {
    try {
        const query = `
            SELECT b.isbn, b.title, b.price, b.category, p.name as publisher_name 
            FROM book b
            JOIN publisher p ON b.publisher_id = p.publisher_id
            ORDER BY b.title ASC;
        `;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. READ (Search): Search Book by Title
app.get('/api/books/search', async (req, res) => {
    const { q } = req.query;
    try {
        const query = `
            SELECT b.isbn, b.title, b.price, p.name as publisher_name 
            FROM book b
            JOIN publisher p ON b.publisher_id = p.publisher_id
            WHERE b.title ILIKE $1;
        `;
        const result = await db.query(query, [`%${q}%`]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. INSERT: Add a new Book
app.post('/api/books', async (req, res) => {
    const { isbn, title, price, category, publisher_id, staff_id } = req.body;
    try {
        const query = `
            INSERT INTO book (isbn, title, price, category, publisher_id, staff_id) 
            VALUES ($1, $2, $3, $4, $5, $6) 
            RETURNING *;
        `;
        const result = await db.query(query, [isbn, title, price, category, publisher_id, staff_id]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. UPDATE: Update Book Price
app.put('/api/books/:isbn', async (req, res) => {
    const { isbn } = req.params;
    const { price } = req.body;
    try {
        const query = 'UPDATE book SET price = $1 WHERE isbn = $2 RETURNING *';
        const result = await db.query(query, [price, isbn]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. DELETE: Remove a Book
app.delete('/api/books/:isbn', async (req, res) => {
    const { isbn } = req.params;
    try {
        await db.query('DELETE FROM book WHERE isbn = $1', [isbn]);
        res.json({ message: 'Book deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. COMPLEX TRANSACTION: Borrow a book (Insert into borrowing)
app.post('/api/borrow', async (req, res) => {
    const { user_id, isbn, issuedate, duedate } = req.body;
    try {
        // Note: borrow_id is auto-incremented by the sequence in your DB
        const query = `
            INSERT INTO borrowing (user_id, isbn, issuedate, duedate) 
            VALUES ($1, $2, $3, $4) 
            RETURNING *;
        `;
        const result = await db.query(query, [user_id, isbn, issuedate, duedate]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`LMS App running at http://localhost:${port}`);
});