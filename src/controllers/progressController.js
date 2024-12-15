const db = require('../config/db');

exports.markLessonCompleted = async (req, res) => {
    try {
        const userId = req.user.id;
        const { lessonUlid } = req.params;

        if (!lessonUlid) {
            return res.status(400).json({ error: 'Lesson ULID is required!' });
        }

        const [lesson] = await db.promise().query(
            'SELECT * FROM lessons WHERE ulid = ?',
            [lessonUlid]
        );
        if (lesson.length === 0) {
            return res.status(404).json({ error: 'Lesson not found!' });
        }

        const moduleId = lesson[0].module_id;
        const [enrollment] = await db.promise().query(
            'SELECT * FROM enrollments WHERE user_id = ? AND module_id = ?',
            [userId, moduleId]
        );
        if (enrollment.length === 0) {
            return res.status(403).json({ error: 'You are not enrolled in this module!' });
        }

        await db.promise().query(
            'INSERT INTO lesson_completions (user_id, lesson_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE lesson_id = lesson_id',
            [userId, lesson[0].id]
        );

        const [totalLessons] = await db.promise().query(
            'SELECT COUNT(*) AS total FROM lessons WHERE module_id = ?',
            [moduleId]
        );
        const [completedLessons] = await db.promise().query(
            'SELECT COUNT(*) AS completed FROM lesson_completions WHERE user_id = ? AND lesson_id IN (SELECT id FROM lessons WHERE module_id = ?)',
            [userId, moduleId]
        );

        const progress = ((completedLessons[0].completed / totalLessons[0].total) * 100).toFixed(2);

        await db.promise().query(
            'UPDATE enrollments SET progress = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND module_id = ?',
            [progress, userId, moduleId]
        );

        if (parseFloat(progress) === 100.00) {
            await db.promise().query(
                'UPDATE enrollments SET status = "COMPLETED", completion_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND module_id = ?',
                [userId, moduleId]
            );
        }

        res.status(200).json({
            status: 'success',
            message: 'Lesson marked as completed!',
            progress: `${progress}%`
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error!' });
    }
};

