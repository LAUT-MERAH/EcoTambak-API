require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connection = require('./config/db');
const authRoutes = require('./routes/authRoutes');

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

const apiV1Router = express.Router();
const welcomeMessage = {
    status: 'success',
    message: 'API is up and running! 🚀 Welcome To EcoTambak API',
    timestamp: new Date().toISOString()
};

apiV1Router.get('/', (req, res) => {
    res.status(200).json(welcomeMessage);
});

apiV1Router.use('/auth', authRoutes);

app.use('/api/v1', apiV1Router);
