const db = require('../config/db');
const { ulid } = require('ulid');

exports.getAllModules = async (req, res) => {
    try {
        const [modules] = await db.promise().query('SELECT * FROM modules');

        res.status(200).json({
            status: 'success',
            data: modules
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error!' });
    }
};

exports.getInstructorModules = async (req, res) => {
    try {
        const userId = req.user.id;

        const [modules] = await db.promise().query(
            'SELECT * FROM modules WHERE user_id = ?',
            [userId]
        );

        res.status(200).json({
            status: 'success',
            data: modules
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error!' });
    }
};

// Create a new module
exports.createModule = async (req, res) => {
    try {
        const userId = req.user.id; 
        const { title, description, playlistUrl, thumbnailUrl } = req.body;

        if (!title || !description || !playlistUrl) {
            return res.status(400).json({ error: 'All required fields must be filled!' });
        }

        const ulidValue = ulid();

        // Insert the module into the database
        await db.promise().query(
            'INSERT INTO modules (ulid, title, description, playlist_url, thumbnail_url, user_id) VALUES (?, ?, ?, ?, ?, ?)',
            [ulidValue, title, description, playlistUrl, thumbnailUrl || null, userId]
        );

        res.status(201).json({
            status: 'success',
            message: 'Module created successfully!'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error!' });
    }
};
