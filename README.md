Library Management System (LMS)
A full-stack database application designed to manage library inventories, reader registrations, and borrowing transactions.

Prerequisites
Before running the application, ensure your computer has the following installed:

Node.js & npm (Javascript Runtime)

Download and install the "LTS" version from nodejs.org.

Verify: Open your terminal (Command Prompt/PowerShell) and type node -v.

PostgreSQL (Database)

Download the installer from postgresql.org.

Important: During installation, remember the password you set for the postgres user (default superuser). You will need this later.

It is recommended to install pgAdmin 4 (included in the installer) for easier database management.

Setup Instructions
1. Database Setup
You must set up the database before running the application.

Locate the LMSbackup.sql file provided in this folder.

Open pgAdmin 4 (or your preferred SQL tool) and connect to your local server.

Right-click "Databases" > Create > Database...

Name it postgres (or any name you prefer, just remember it).

Right-click your new database > Restore...

Select the LMSbackup.sql file in the "Filename" field and click Restore.

Note: If you see "exit code 1" warnings, they are usually harmless (often just ownership permission warnings).

2. Application Configuration
Open the project folder in a code editor (like VS Code) or Notepad.

Open the file named server.js.

Look for the Database Connection section (around line 15):

JavaScript

const db = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres', // Match the database name you created
    password: 'YOUR_DB_PASSWORD', // <--- CHANGE THIS to your PostgreSQL password
    port: 5432,
});
Update the password field to match the password you created during the PostgreSQL installation.

Save the file.

3. Installation
Open your terminal or command prompt.

Navigate to this project folder:

Bash

cd path/to/your/project-folder
Install the required dependencies:

Bash

npm install
(This automatically installs express, pg, cors, body-parser, and bcrypt based on the package.json file).

Running the Application
In your terminal (inside the project folder), run:

Bash

node server.js
You should see the message:

Library Management System Server running on http://localhost:3000

Open your web browser (Chrome, Edge, etc.) and go to:

http://localhost:3000

Usage Guide
Dashboard: View live stats of the library.

Books: Add publishers first, then add books to the catalog.

Staff: Create new staff accounts via the "Staff" tab.

Note: Passwords are automatically encrypted for security.

Circulation: Issue books to registered readers. The system will prevent issuing books that are currently out of stock.

Tech Stack
Frontend: HTML5, CSS3, Vanilla JavaScript

Backend: Node.js, Express.js

Database: PostgreSQL

Security: Bcrypt (Password Hashing)

Team LibrariansUp CSE 412 Database Project
