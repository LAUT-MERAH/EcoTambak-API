require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'API is up and running! 🚀 Welcome To EcoTambak API'
  });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});