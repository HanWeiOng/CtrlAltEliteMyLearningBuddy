//reset to last working version
require("dotenv").config();

const express = require('express');
const router = express.Router();
const { Client } = require('pg');

const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    port: process.env.DB_PORT,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    ssl: {
        require: true,
        rejectUnauthorized: false
    }
});

// Establish the database connection
client.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        // Handle the error appropriately here. You might want to:
        // 1.  Exit the application (if the connection is essential).
        // 2.  Retry the connection after a delay.
        // 3.  Inform the administrator.
        return; // Important: Stop further execution if connection fails
    } else {
        console.log('Connected to database');
    }
});

router.post('/createAccount', async (req, res) => {
    try {
        const { username, password, position } = req.body;

        // Validate inputs
        if (!username || !password || !position) {
            return res.status(400).json({ error: "Username, password, and position are required." });
        }

        // Insert into database
        const { rows } = await client.query(`
            INSERT INTO account_table (username, password, position)
            VALUES ($1, $2, $3)
            RETURNING *;
        `, [username, password, position]);

        res.status(200).json({ message: "Account created successfully!", account: rows[0] });
    } catch (error) {
        console.error("Error creating account:", error);
        res.status(500).json({ error: "Internal server error: " + error.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required." });
        }

        const { rows } = await client.query(`
            SELECT * FROM account_table
            WHERE username = $1;
        `, [username]);

        if (rows.length === 0) {
            return res.status(404).json({ error: "Account not found." });
        }

        const account = rows[0];

        // Plain text password comparison
        if (account.password !== password) {
            return res.status(401).json({ error: "Invalid password." });
        }

        res.status(200).json({ 
            message: "Login successful!", 
            account: { 
                id: account.id, 
                username: account.username, 
                position: account.position 
            } 
        });
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ error: "Internal server error: " + error.message });
    }
});


router.get('/getStudentList', async (req, res) => {
    try {
        const { rows } = await client.query(`
            SELECT id AS student_id, username 
            FROM account_table
            WHERE position = 'Student' OR position = 'student';
        `);

        res.status(200).json({ students: rows });
    } catch (error) {
        console.error("Error during retrieving students:", error);
        res.status(500).json({ error: "Internal server error: " + error.message });
    }
});


router.get('/getStudentName/:student_id', async (req, res) => {
    try {
        const { student_id } = req.params;

        const result = await client.query(
            `SELECT username FROM account_table WHERE account_id = $1`,
            [student_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }

        res.json({ username: result.rows[0].username });
    } catch (error) {
        console.error("Error during retrieving students:", error);
        res.status(500).json({ error: "Internal server error: " + error.message });
    }
});

module.exports = router;