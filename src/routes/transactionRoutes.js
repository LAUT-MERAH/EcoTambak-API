const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/notifications', transactionController.handleNotification);
router.post('/:moduleUlid', verifyToken, transactionController.createTransaction);

module.exports = router;
