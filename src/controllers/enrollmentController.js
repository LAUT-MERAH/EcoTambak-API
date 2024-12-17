const db = require('../config/db');
const { ulid } = require('ulid');

exports.getEnrollments = async (req, res) => {
    try {
        const userId = req.user.id;

        const [enrollments] = await db.promise().query(
            `
            SELECT 
                e.ulid AS enrollment_id,
                m.ulid AS module_id,
                m.title,
                m.description,
                m.thumbnail_url,
                e.status,
                e.completion_date,
                e.certificate_url,
                COUNT(DISTINCT l.id) AS total_lessons,
                COUNT(DISTINCT lc.id) AS completed_lessons,
                e.enrollment_date
            FROM enrollments e
            JOIN modules m ON e.module_id = m.id
            LEFT JOIN lessons l ON l.module_id = m.id
            LEFT JOIN lesson_completions lc ON lc.lesson_id = l.id AND lc.user_id = e.user_id
            WHERE e.user_id = ?
            GROUP BY e.id, m.id
            `,
            [userId]
        );

        const groupedData = {
            NOT_STARTED: { category: 'NOT_STARTED', data: [], count: 0 },
            IN_PROGRESS: { category: 'IN_PROGRESS', data: [], count: 0 },
            COMPLETED: { category: 'COMPLETED', data: [], count: 0 }
        };

        enrollments.forEach((enrollment) => {
            const totalLessons = enrollment.total_lessons || 0;
            const completedLessons = enrollment.completed_lessons || 0;
            const progress = totalLessons > 0
                ? ((completedLessons / totalLessons) * 100).toFixed(2)
                : 0;

            const enrollmentData = {
                enrollment_id: enrollment.enrollment_id,
                module_id: enrollment.module_id,
                title: enrollment.title,
                description: enrollment.description,
                thumbnail_url: enrollment.thumbnail_url,
                progress: progress,
                enrollment_date: enrollment.enrollment_date
            };

            if (enrollment.status === 'COMPLETED') {
                enrollmentData.completion_date = enrollment.completion_date;
                enrollmentData.certificate_url = enrollment.certificate_url;
            }

            if (groupedData[enrollment.status]) {
                groupedData[enrollment.status].data.push(enrollmentData);
                groupedData[enrollment.status].count++;
            }
        });

        res.status(200).json({
            status: 'success',
            data: [
                groupedData.NOT_STARTED,
                groupedData.IN_PROGRESS,
                groupedData.COMPLETED
            ]
        });
    } catch (error) {
        console.error('Error fetching enrollments:', error);
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
            [ulidValue, module[0].id, userId, 'NOT_STARTED']
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

