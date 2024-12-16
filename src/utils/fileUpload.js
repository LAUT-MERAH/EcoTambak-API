const multer = require('multer');

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB
    },
    fileFilter: (req, file, cb) => {
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPG, JPEG, and PNG files are allowed!'), false); // Reject the file
        }
    },
});

module.exports = upload;
