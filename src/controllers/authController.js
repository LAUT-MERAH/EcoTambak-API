const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { ulid } = require('ulid');
const jwt = require('jsonwebtoken');
const tokenBlacklist = require('../config/tokenBlacklist');
require('dotenv').config();

// User Registration
exports.register = async (req, res) => {
    try {
        const { username, email, password, confirmPassword, firstName, lastName } = req.body;

        if (!username || !email || !password || !confirmPassword || !firstName) {
            return res.status(400).json({ error: 'All required fields must be filled!' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ error: 'Passwords do not match!' });
        }

        // Check if user already exists
        const [existingUser] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'Email already exist!' });
        }

        const [existingUsername] = await db.promise().query('SELECT * FROM users WHERE username = ?', [username]);
        if (existingUsername.length > 0) {
            return res.status(400).json({ error: 'Username already exist!' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate a ULID
        const ulidValue = ulid();

        // Insert user into database
        await db.promise().query(
            'INSERT INTO users (ulid, username, email, password, first_name, last_name, role_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [ulidValue, username, email, hashedPassword, firstName, lastName || null, 3] // Default role_id is 3 (Student)
        );

        res.status(201).json({
            status: 'success',
            message: 'User registered successfully!'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error!' });
    }
};

// User Login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const [userResults] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);
        if (userResults.length === 0) {
            return res.status(400).json({ error: 'User is not exist!' });
        }

        const user = userResults[0];

        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid email or password!' });
        }
        const payload = {
            id: user.id,
            username: user.username,
            role_id: user.role_id
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({
            status: 'success',
            message: 'Logged in successfully!',
            token
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error!' });
    }
};

// User Logout
exports.logout = (req, res) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
        tokenBlacklist.add(token);
    }

    res.status(200).json({
        status: 'success',
        message: 'Logged out successfully!'
    });
};