const db = require('../config/db');
const { ulid } = require('ulid');
const path = require('path');
const upload = require('../utils/fileUpload');
const bucket = require('../config/cloudStorage');

exports.getAllModules = async (req, res) => {
    try {
        const [modules] = await db.promise().query('SELECT ulid, title, description, thumbnail_url FROM modules WHERE is_hidden = FALSE');

        res.status(200).json({
            status: 'success',
            data: modules
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error!' });
    }
};

exports.getInstructorModules = async (req, res) => {
    try {
        const userId = req.user.id;

        const [modules] = await db.promise().query(
            'SELECT * FROM modules WHERE user_id = ?',
            [userId]
        );

        res.status(200).json({
            status: 'success',
            data: modules
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error!' });
    }
};

exports.getModuleDetails = async (req, res) => {
    try {
        const { moduleUlid } = req.params;
        const userId = req.user?.id || null;

        if (!moduleUlid) {
            return res.status(400).json({ error: 'Module ULID is required!' });
        }

        const [moduleDetails] = await db.promise().query(
            `SELECT 
                modules.ulid, 
                modules.title, 
                modules.description, 
                modules.thumbnail_url, 
                users.username AS instructor 
            FROM modules 
            JOIN users ON modules.user_id = users.id 
            WHERE modules.ulid = ?`,
            [moduleUlid]
        );

        if (moduleDetails.length === 0) {
            return res.status(404).json({ error: 'Module not found!' });
        }

        const module = moduleDetails[0];
        const [lessons] = await db.promise().query(
            `SELECT ulid, title, video_url, thumbnail_url 
             FROM lessons 
             WHERE module_id = (SELECT id FROM modules WHERE ulid = ?)`,
            [moduleUlid]
        );
        
        let isEnrolled = false;
        if (userId) {
            const [enrollment] = await db.promise().query(
                'SELECT * FROM enrollments WHERE user_id = ? AND module_id = (SELECT id FROM modules WHERE ulid = ?)',
                [userId, moduleUlid]
            );
            isEnrolled = enrollment.length > 0;
        }

        res.status(200).json({
            status: 'success',
            data: {
                ...module,
                lessons,
                isEnrolled
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error!' });
    }
};

exports.createModule = [
    upload.single('thumbnail'), 

    async (req, res) => {
        try {
            const userId = req.user.id;
            const { title, description, playlistUrl, price } = req.body;

            if (!title || !description || !playlistUrl || price === undefined) {
                return res.status(400).json({ error: 'All required fields (title, description, playlistUrl, price) must be filled!' });
            }

            const parsedPrice = parseFloat(price);
            if (isNaN(parsedPrice) || parsedPrice < 0) {
                return res.status(400).json({ error: 'Price must be a valid positive number!' });
            }

           
            if (!req.file) {
                return res.status(400).json({ error: 'Thumbnail image is required!' });
            }

           
            const ulidValue = ulid();
            const fileName = `modules/thumbnails/${ulidValue}-${req.file.originalname}`;
            const file = bucket.file(fileName);

            await file.save(req.file.buffer, {
                metadata: { contentType: req.file.mimetype },
                resumable: false,
            });

            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

            await db.promise().query(
                'INSERT INTO modules (ulid, title, description, playlist_url, thumbnail_url, is_hidden, user_id, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [ulidValue, title, description, playlistUrl, publicUrl, false, userId, parsedPrice]
            );

            res.status(201).json({
                status: 'success',
                message: 'Module created successfully!',
                thumbnailUrl: publicUrl,
                price: parsedPrice,
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal server error!' });
        }
    }
];

exports.updateModule = [
    upload.single('thumbnail'),
    async (req, res) => {
        try {
            const userId = req.user.id;
            const { moduleUlid } = req.params;
            const { title, description, playlistUrl, is_hidden, price } = req.body;

            const [module] = await db.promise().query(
                'SELECT * FROM modules WHERE ulid = ? AND user_id = ?',
                [moduleUlid, userId]
            );

            if (module.length === 0) {
                return res.status(404).json({ error: 'Module not found or you do not have permission to update it!' });
            }

            let parsedPrice = module[0].price;
            if (price !== undefined) {
                parsedPrice = parseFloat(price);
                if (isNaN(parsedPrice) || parsedPrice < 0) {
                    return res.status(400).json({ error: 'Price must be a valid positive number!' });
                }
            }

            let thumbnailUrl = module[0].thumbnail_url;
            if (req.file) {
                const oldThumbnail = module[0].thumbnail_url;

                const fileExtension = path.extname(req.file.originalname);
                const fileName = `modules/thumbnails/${moduleUlid}-${Date.now()}${fileExtension}`;
                const file = bucket.file(fileName);

                await file.save(req.file.buffer, {
                    metadata: { contentType: req.file.mimetype },
                    resumable: false,
                });

                thumbnailUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

               
                if (oldThumbnail) {
                    const oldFileName = oldThumbnail.split(`https://storage.googleapis.com/${bucket.name}/`)[1];
                
                    if (oldFileName) { 
                        const oldFile = bucket.file(oldFileName);
                
                        try {
                            await oldFile.delete();
                            console.log(`Old thumbnail deleted: ${oldFileName}`);
                        } catch (deleteError) {
                            console.error(`Error deleting old thumbnail: ${deleteError.message}`);
                        }
                    } else {
                        console.warn('Old file name is invalid. Skipping deletion.');
                    }
                }
            }

            await db.promise().query(
                'UPDATE modules SET title = ?, description = ?, playlist_url = ?, thumbnail_url = ?, is_hidden = ?, price = ?, updated_at = CURRENT_TIMESTAMP WHERE ulid = ?',
                [
                    title || module[0].title,
                    description || module[0].description,
                    playlistUrl || module[0].playlist_url,
                    thumbnailUrl,
                    typeof is_hidden !== 'undefined' ? is_hidden : module[0].is_hidden,
                    parsedPrice,
                    moduleUlid
                ]
            );

            res.status(200).json({
                status: 'success',
                message: 'Module updated successfully!',
                thumbnailUrl,
                price: parsedPrice
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal server error!' });
        }
    }
];

