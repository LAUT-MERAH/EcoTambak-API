const jwt = require('jsonwebtoken');
require('dotenv').config();

exports.verifyToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Decoded JWT Payload:', decoded); // Add this log
        req.user = decoded;
        next();
    } catch (ex) {
        return res.status(400).json({ error: 'Invalid token.' });
    }
};
