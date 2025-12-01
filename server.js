const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname)); // Serve static files from current directory

// Database Connection
const db = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres', // Change to your DB name
    password: 'sqladi@2708', // CHANGE THIS to your password
    port: 5432,
});

// Test database connection
db.connect((err, client, release) => {
    if (err) {
        console.error('Error connecting to database:', err.stack);
    } else {
        console.log('✓ Database connected successfully');
        release();
    }
});

// --- ROUTES ---

// 1. READ: Get all books with Publisher Name (JOIN) - Now includes category
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
        console.error('Error fetching books:', err);
        res.status(500).json({ error: err.message });
    }
});

// 2. READ: Search Book by Title
app.get('/api/books/search', async (req, res) => {
    const { q } = req.query;
    try {
        const query = `
            SELECT b.isbn, b.title, b.price, b.category, p.name as publisher_name 
            FROM book b
            JOIN publisher p ON b.publisher_id = p.publisher_id
            WHERE b.title ILIKE $1 OR b.category ILIKE $1;
        `;
        const result = await db.query(query, [`%${q}%`]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error searching books:', err);
        res.status(500).json({ error: err.message });
    }
});

// 3. INSERT: Add a new Book
app.post('/api/books', async (req, res) => {
    const { isbn, title, price, category, publisher_id, staff_id } = req.body;
    
    // Validation
    if (!isbn || !title || !publisher_id || !staff_id) {
        return res.status(400).json({ error: 'Missing required fields: isbn, title, publisher_id, staff_id' });
    }
    
    try {
        const query = `
            INSERT INTO book (isbn, title, price, category, publisher_id, staff_id) 
            VALUES ($1, $2, $3, $4, $5, $6) 
            RETURNING *;
        `;
        const result = await db.query(query, [isbn, title, price || 0, category || '', publisher_id, staff_id]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error adding book:', err);
        if (err.code === '23505') { // Unique violation
            res.status(409).json({ error: 'Book with this ISBN already exists' });
        } else if (err.code === '23503') { // Foreign key violation
            res.status(400).json({ error: 'Invalid publisher_id or staff_id' });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

// 4. UPDATE: Update Book Price
app.put('/api/books/:isbn', async (req, res) => {
    const { isbn } = req.params;
    const { price } = req.body;
    
    if (!price || isNaN(price)) {
        return res.status(400).json({ error: 'Invalid price value' });
    }
    
    try {
        const query = 'UPDATE book SET price = $1 WHERE isbn = $2 RETURNING *';
        const result = await db.query(query, [price, isbn]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Book not found' });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating book:', err);
        res.status(500).json({ error: err.message });
    }
});

// 5. DELETE: Remove a Book
app.delete('/api/books/:isbn', async (req, res) => {
    const { isbn } = req.params;
    
    try {
        const result = await db.query('DELETE FROM book WHERE isbn = $1 RETURNING *', [isbn]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Book not found' });
        }
        
        res.json({ message: 'Book deleted successfully', book: result.rows[0] });
    } catch (err) {
        console.error('Error deleting book:', err);
        if (err.code === '23503') { // Foreign key violation
            res.status(400).json({ error: 'Cannot delete book: it is referenced in borrowing records' });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

// 6. TRANSACTION: Borrow a book (Insert into borrowing)
app.post('/api/borrow', async (req, res) => {
    const { user_id, isbn, issuedate, duedate } = req.body;
    
    // Validation
    if (!user_id || !isbn || !issuedate || !duedate) {
        return res.status(400).json({ error: 'Missing required fields: user_id, isbn, issuedate, duedate' });
    }
    
    try {
        const query = `
            INSERT INTO borrowing (user_id, isbn, issuedate, duedate) 
            VALUES ($1, $2, $3, $4) 
            RETURNING *;
        `;
        const result = await db.query(query, [user_id, isbn, issuedate, duedate]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating borrowing record:', err);
        if (err.code === '23503') { // Foreign key violation
            res.status(400).json({ error: 'Invalid user_id or isbn - user or book does not exist' });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'LMS API is running' });
});

// Start server
app.listen(port, () => {
    console.log(`✓ LMS Server running at http://localhost:${port}`);
    console.log(`✓ API available at http://localhost:${port}/api`);
    console.log(`✓ Frontend available at http://localhost:${port}/index.html`);
});