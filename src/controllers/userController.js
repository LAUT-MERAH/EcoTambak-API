const db = require('../config/db');
const { ulid } = require('ulid');

exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const [userResults] = await db.promise().query(
            'SELECT ulid, username, first_name, last_name, email, personal_information FROM users WHERE id = ?',
            [userId]
        );

        if (userResults.length === 0) {
            return res.status(404).json({ error: 'User not found!' });
        }

        const user = userResults[0];
        res.status(200).json({
            status: 'success',
            data: user
        });
    } catch (error) {
        console.error('Error retrieving user profile:', error);
        res.status(500).json({ error: 'Internal server error!' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id; // Extracted from the JWT middleware

        // Extract only the fields that are present in the request body
        const { first_name, last_name, personal_information } = req.body;

        // Dynamically construct the query based on provided fields
        let updateFields = [];
        let values = [];

        if (first_name) {
            updateFields.push('first_name = ?');
            values.push(first_name);
        }

        if (last_name) {
            updateFields.push('last_name = ?');
            values.push(last_name);
        }

        if (personal_information) {
            updateFields.push('personal_information = ?');
            values.push(JSON.stringify(personal_information));
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'Please provide at least one field to update.' });
        }

        // Add the user ID to the values list for the WHERE clause
        values.push(userId);

        // Construct the update query dynamically
        const updateQuery = `
            UPDATE users
            SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;

        const [result] = await db.promise().query(updateQuery, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.status(200).json({
            status: 'success',
            message: 'Profile updated successfully!',
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error!' });
    }
};

exports.applyInstructor = async (req, res) => {
    try {
        const userId = req.user.id;

        const [existingApplication] = await db.promise().query(
            'SELECT * FROM instructor_applications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
            [userId]
        );

        if (existingApplication.length > 0) {
            const application = existingApplication[0];

            if (application.status === "PENDING") {
                return res.status(400).json({ error: 'You already have a pending application! Please wait for the outcome before re-applying.' });
            }

            if (application.status === "APPROVED") {
                return res.status(400).json({ error: 'You are already an instructor!' });
            }
        }

        const ulidValue = ulid();
        await db.promise().query(
            'INSERT INTO instructor_applications (ulid, user_id, status, comments, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
            [ulidValue, userId, 'PENDING', null]
        );

        console.log(`New instructor application submitted by User ID: ${userId} with ULID: ${ulidValue}`);

        res.status(201).json({
            status: 'success',
            message: 'Application submitted successfully!'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error!' });
    }
};
