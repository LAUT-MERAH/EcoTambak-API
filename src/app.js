require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connection = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

connection.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        process.exit(1);
    } else {
        console.log('Connected to MySQL database');

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    }
});

app.get('/', (req, res) => {
    res.json({
        message: 'API is up and running! 🚀 Welcome To EcoTambak API'
    });
});
