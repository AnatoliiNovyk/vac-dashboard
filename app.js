const express = require('express');
const session = require('express-session');
const { pool } = require('./db.js'); // <--- Changed
require('dotenv').config();
const { getEmployees } = require('./employees.js');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('.'));

app.use(session({
    secret: process.env.SESSION_SECRET || 'your_default_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using https
}));

// Middleware to check authentication
const checkAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).send('Unauthorized');
    }
    next();
};

// Login endpoint
app.post('/api/login', async (req, res) => {
    const { ipn } = req.body;

    if (!ipn || !/^\d{10}$/.test(ipn)) {
        return res.status(400).send('Invalid IPN format. It must be a 10-digit number.');
    }

    try {
        const result = await pool.query('SELECT id, name, role, ipn FROM employees WHERE ipn = $1', [ipn]);
        const user = result.rows[0];

        if (user) {
            req.session.user = {
                id: user.id,
                name: user.name,
                role: user.role,
                ipn: user.ipn
            };
            console.log(`User ${user.name} logged in with role: ${user.role}`);
            res.json({ role: user.role });
        } else {
            res.status(401).send('Invalid IPN');
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Could not log out.');
        }
        res.send('Logged out');
    });
});

app.get('/api/employees', checkAuth, async (req, res) => {
    try {
        const employees = await getEmployees(req.session.user);
        res.json(employees);
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});