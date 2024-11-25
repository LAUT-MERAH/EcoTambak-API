const bcrypt = require('bcryptjs');
const db = require('../src/config/db');
const { ulid } = require('ulid');


const seedAdmin = async () => {
    try {
        const adminUlid = ulid();
        const email = 'admin@ecotambak.com';
        const [existingAdmin] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);

        // Check if the admin user already exists
        if (existingAdmin.length > 0) {
            console.log('Admin user already exists. Skipping seeding...');
            process.exit(0);
        }

        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        await db.promise().query(
            'INSERT INTO users (ulid, username, email, password, first_name, last_name, role_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
            [adminUlid, 'admin', email, hashedPassword, 'Administrator', null, 1]
        );

        console.log('Admin user seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Failed to seed admin user:', error);
        process.exit(1);
    }
};

seedAdmin();
