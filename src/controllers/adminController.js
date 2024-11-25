const db = require('../config/db');

exports.getAllApplications = async (req, res) => {
    try {
        const { status } = req.query;
        let query = 'SELECT * FROM instructor_applications';
        const params = [];

        // Add status filter if provided
        if (status) {
            query += ' WHERE status = ?';
            params.push(status.toUpperCase());
        }

        const [applications] = await db.promise().query(query, params);
        res.status(200).json({
            status: 'success',
            data: applications
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error!' });
    }
};

exports.updateApplicationStatus = async (req, res) => {
    try {
        const { ulid } = req.params;
        const { status, comments } = req.body;

        if (!['APPROVED', 'REJECTED'].includes(status.toUpperCase())) {
            return res.status(400).json({ error: 'Invalid status. Must be either "APPROVED" or "REJECTED".' });
        }

        // Find the application
        const [application] = await db.promise().query(
            'SELECT * FROM instructor_applications WHERE ulid = ?',
            [ulid]
        );

        if (application.length === 0) {
            return res.status(404).json({ error: 'Application not found!' });
        }

        // Update the application
        await db.promise().query(
            'UPDATE instructor_applications SET status = ?, comments = ?, updated_at = CURRENT_TIMESTAMP WHERE ulid = ?',
            [status.toUpperCase(), comments || '', ulid]
        );

        // If approved, update the user's role to "INSTRUCTOR"
        if (status.toUpperCase() === 'APPROVED') {
            await db.promise().query(
                'UPDATE users SET role_id = 2 WHERE id = ?',
                [application[0].user_id]
            );
        }

        res.status(200).json({
            status: 'success',
            message: 'Application updated successfully!'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error!' });
    }
};
