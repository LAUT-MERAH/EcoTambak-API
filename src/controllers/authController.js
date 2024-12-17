const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { ulid } = require('ulid');
const jwt = require('jsonwebtoken');
const tokenBlacklist = require('../config/tokenBlacklist');
require('dotenv').config();

exports.register = async (req, res) => {
    try {
        const { username, email, password, confirmPassword, firstName, lastName } = req.body;

        if (!username || !email || !password || !confirmPassword || !firstName) {
            return res.status(400).json({ error: 'All required fields must be filled!' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ error: 'Passwords do not match!' });
        }

        const [existingUser] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'Email already exist!' });
        }

        const [existingUsername] = await db.promise().query('SELECT * FROM users WHERE username = ?', [username]);
        if (existingUsername.length > 0) {
            return res.status(400).json({ error: 'Username already exist!' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const ulidValue = ulid();

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

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const [userResults] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);
        if (userResults.length === 0) {
            return res.status(400).json({ error: 'User does not exist!' });
        }

        const user = userResults[0];

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid email or password!' });
        }

        const payload = {
            id: user.id,
            username: user.username,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
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