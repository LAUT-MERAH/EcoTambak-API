const db = require('../config/db');
const { ulid } = require('ulid');

exports.getLessons = async (req, res) => {
    try {
        const { moduleUlid } = req.params;

        if (!moduleUlid) {
            return res.status(400).json({ error: 'Module ULID is required!' });
        }

        const [module] = await db.promise().query(
            'SELECT * FROM modules WHERE ulid = ?',
            [moduleUlid]
        );
        if (module.length === 0) {
            return res.status(404).json({ error: 'Module not found!' });
        }

        const [lessons] = await db.promise().query(
            'SELECT ulid, title, video_url, thumbnail_url, created_at FROM lessons WHERE module_id = ?',
            [module[0].id]
        );

        res.status(200).json({
            status: 'success',
            data: lessons
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error!' });
    }
};

exports.addLesson = async (req, res) => {
    try {
        const userId = req.user.id;
        const { moduleUlid, title, videoUrl, thumbnailUrl } = req.body;

        if (!moduleUlid || !title || !videoUrl) {
            return res.status(400).json({ error: 'All required fields (moduleUlid, title, videoUrl) must be filled!' });
        }

        const [module] = await db.promise().query(
            'SELECT * FROM modules WHERE ulid = ? AND user_id = ?',
            [moduleUlid, userId]
        );
        if (module.length === 0) {
            return res.status(404).json({ error: 'Module not found or you do not have permission to add lessons to it!' });
        }

        // Generate ULID for the lesson
        const ulidValue = ulid();

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