const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/adminMiddleware');

// List all applications, with optional filtering by status
router.get('/applications', verifyToken, isAdmin, adminController.getAllApplications);

// Update an application (approve/reject)
router.patch('/applications/:ulid', verifyToken, isAdmin, adminController.updateApplicationStatus);

module.exports = router;
