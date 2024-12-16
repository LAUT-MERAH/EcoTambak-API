const express = require('express');
const router = express.Router();
const certificationController = require('../controllers/certificationController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, certificationController.getAllCertificates);
router.post('/:enrollmentId/generate', verifyToken, certificationController.generateCertificate);

module.exports = router;
