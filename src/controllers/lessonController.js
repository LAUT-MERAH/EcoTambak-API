const db = require('../config/db');
const { ulid } = require('ulid');

exports.addLesson = async (req, res) => {
    try {
        const userId = req.user.id; // Assuming this user is an instructor
        const { moduleUlid, title, videoUrl, thumbnailUrl } = req.body;

        if (!moduleUlid || !title || !videoUrl) {
            return res.status(400).json({ error: 'All required fields (moduleUlid, title, videoUrl) must be filled!' });
        }

        // Check if the module exists and if the instructor owns it
        const [module] = await db.promise().query(
            'SELECT * FROM modules WHERE ulid = ? AND user_id = ?',
            [moduleUlid, userId]
        );
        if (module.length === 0) {
            return res.status(404).json({ error: 'Module not found or you do not have permission to add lessons to it!' });
        }

        // Generate ULID for the lesson
        const ulidValue = ulid();

        // Insert the lesson into the lessons table
        await db.promise().query(
            'INSERT INTO lessons (ulid, module_id, title, video_url, thumbnail_url, user_id) VALUES (?, ?, ?, ?, ?, ?)',
            [ulidValue, module[0].id, title, videoUrl, thumbnailUrl || null, userId]
        );

        res.status(201).json({
            status: 'success',
            message: 'Lesson added successfully!',
            ulid: ulidValue
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error!' });
    }
};