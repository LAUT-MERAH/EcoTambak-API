const db = require('../config/db');
const { ulid } = require('ulid');

exports.getEnrollments = async (req, res) => {
    try {
        const userId = req.user.id;

        const [enrollments] = await db.promise().query(
            `SELECT 
                enrollments.ulid AS enrollment_id,
                modules.ulid AS module_id,
                modules.title,
                modules.description,
                modules.thumbnail_url,
                enrollments.status,
                enrollments.progress,
                enrollments.enrollment_date
             FROM enrollments
             JOIN modules ON enrollments.module_id = modules.id
             WHERE enrollments.user_id = ?`,
            [userId]
        );

        res.status(200).json({
            status: 'success',
            data: enrollments
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error!' });
    }
};


exports.enrollInModule = async (req, res) => {
    try {
        const userId = req.user.id;
        const { moduleUlid } = req.body;

        if (!moduleUlid) {
            return res.status(400).json({ error: 'Module ULID is required!' });
        }

        const [module] = await db.promise().query('SELECT * FROM modules WHERE ulid = ? AND is_hidden = FALSE', [moduleUlid]);
        if (module.length === 0) {
            return res.status(404).json({ error: 'Module not found or not active!' });
        }

        const [existingEnrollment] = await db.promise().query(
            'SELECT * FROM enrollments WHERE user_id = ? AND module_id = ?',
            [userId, module[0].id]
        );
        if (existingEnrollment.length > 0) {
            return res.status(400).json({ error: 'You are already enrolled in this module!' });
        }

        const ulidValue = ulid();
        await db.promise().query(
            'INSERT INTO enrollments (ulid, module_id, user_id, status, enrollment_date, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
            [ulidValue, module[0].id, userId, 'IN_PROGRESS']
        );

        res.status(201).json({
            status: 'success',
            message: 'Enrolled in module successfully!'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error!' });
    }
};
