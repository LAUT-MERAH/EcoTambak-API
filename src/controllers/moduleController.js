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
            'INSERT INTO modules (ulid, title, description, playlist_url, thumbnail_url, is_hidden, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [ulidValue, title, description, playlistUrl, thumbnailUrl || null, false, userId]
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

// Update module 
exports.updateModule = async (req, res) => {
    try {
        const userId = req.user.id;
        const { moduleUlid } = req.params;
        const { title, description, playlistUrl, thumbnailUrl } = req.body;

        // Check if the module exists and if it belongs to the instructor
        const [module] = await db.promise().query(
            'SELECT * FROM modules WHERE ulid = ? AND user_id = ?',
            [moduleUlid, userId]
        );
        if (module.length === 0) {
            return res.status(404).json({ error: 'Module not found or you do not have permission to update it!' });
        }

        // Update the module details
        await db.promise().query(
            'UPDATE modules SET title = ?, description = ?, playlist_url = ?, thumbnail_url = ?, updated_at = CURRENT_TIMESTAMP WHERE ulid = ?',
            [title || module[0].title, description || module[0].description, playlistUrl || module[0].playlist_url, thumbnailUrl || module[0].thumbnail_url, moduleUlid]
        );

        res.status(200).json({
            status: 'success',
            message: 'Module updated successfully!'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error!' });
    }
};
