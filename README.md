# Library Management System (LMS)

A full-stack database application designed to manage library inventories, reader registrations, and borrowing transactions.

## Prerequisites

Before running the application, ensure your computer has the following installed:

1.  **[Node.js & npm](https://nodejs.org/)** (JavaScript Runtime)
    * *Verify:* Open your terminal and type `node -v`.
2.  **[PostgreSQL](https://www.postgresql.org/download/)** (Relational Database)
    * **Important:** During installation, remember the password you set for the `postgres` user.
    * It is recommended to install **pgAdmin 4** (usually included) for easier database management.

---

## Setup Instructions

### 1. Database Setup
You must set up the database structure before the application can run.

1.  Locate the `LMSbackup.sql` file provided in this repository.
2.  Open **pgAdmin 4** (or your preferred SQL tool) and connect to your local server.
3.  Right-click **Databases** > **Create** > **Database...**
    * Name it `postgres` (or any name you prefer).
4.  Right-click your new database > **Restore...**
5.  Select the `LMSbackup.sql` file in the "Filename" field and click **Restore**.

### 2. Application Configuration
1.  Open the `server.js` file in a text editor (like VS Code).
2.  Locate the **Database Connection** section (approx. line 15):
    ```javascript
    const db = new Pool({
        user: 'postgres',
        host: 'localhost',
        database: 'change_database_accordingly', // Match your database name
        password: 'change_password_accordingly', // <--- REPLACE THIS with your actual password
        port: 5432,
    });
    ```
3.  Update the `password` field to match your local PostgreSQL password.
4.  Save the file.

### 3. Installation
1.  Open your terminal or command prompt.
2.  Navigate to the project folder:
    ```bash
    cd path/to/project-folder
    ```
3.  Install the dependencies:
    ```bash
    npm install
    ```

---

## Running the Application

1.  Start the server:
    ```bash
    node server.js
    ```
2.  You should see the success message:
    > Library Management System Server running on http://localhost:3000

3.  Open your web browser and navigate to:
    > **http://localhost:3000**

---

## Usage Guide

* **Dashboard:** View real-time statistics (Total books, active borrowings, etc.).
* **Books:** Add Publishers first, then add Books to the catalog using the "Books" tab.
* **Staff:** Create secure staff accounts via the "Staff" tab. Passwords are automatically hashed.
* **Circulation:** Issue books to registered readers. The system validates inventory availability before issuing.

---

## Tech Stack

* **Frontend:** HTML5, CSS3, Vanilla JavaScript
* **Backend:** Node.js, Express.js
* **Database:** PostgreSQL
* **Security:** Bcrypt (Password Hashing)

---

### Team
**Team LibrariansUp**
*CSE 412 Database Project*
