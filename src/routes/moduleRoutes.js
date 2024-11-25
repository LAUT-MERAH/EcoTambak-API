const express = require('express');
const router = express.Router();
const moduleController = require('../controllers/moduleController');
const { verifyToken } = require('../middleware/authMiddleware');
const { isInstructor } = require('../middleware/instructorMiddleware');

router.get('/', moduleController.getAllModules);
router.get('/my-modules', verifyToken, isInstructor, moduleController.getInstructorModules);
router.post('/', verifyToken, isInstructor, moduleController.createModule);

module.exports = router;
