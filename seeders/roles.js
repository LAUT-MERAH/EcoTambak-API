const connection = require('../src/config/db');

const seedRoles = () => {
    const roles = ['admin', 'instructor', 'student'];
    const query = `
        INSERT INTO roles (name, created_at, updated_at) VALUES 
        (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

    // Run the query using the `query` method and handle the callback
    connection.query(query, roles, (err, results) => {
        if (err) {
            console.error('Failed to seed roles:', err.stack);
            process.exit(1); // Exit the process in case of an error
        } else {
            console.log('Roles seeded successfully!', results);
            process.exit(0); // Exit successfully
        }
    });
};

// Execute the seed function
seedRoles();
