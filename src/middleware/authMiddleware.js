const jwt = require('jsonwebtoken');
const tokenBlacklist = require('../config/tokenBlacklist');
require('dotenv').config();

exports.verifyToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    if (tokenBlacklist.has(token)) {
        return res.status(403).json({ error: 'Your session has ended. Please log in to continue.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (ex) {
        return res.status(400).json({ error: 'Invalid token.' });
    }
};
