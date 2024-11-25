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