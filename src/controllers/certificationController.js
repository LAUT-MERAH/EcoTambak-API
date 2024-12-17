const fs = require('fs');
const puppeteer = require('puppeteer');
const db = require('../config/db');
const bucket = require('../config/cloudStorage');


exports.getAllCertificates = async (req, res) => {
    try {
        const userId = req.user.id;

        const [certificates] = await db.promise().query(
            `SELECT 
                e.ulid AS enrollment_id, 
                e.certificate_url, 
                m.title AS module_title, 
                m.thumbnail_url,  -- Fetch thumbnail_url from modules table
                e.completion_date
             FROM enrollments e
             JOIN modules m ON e.module_id = m.id
             WHERE e.user_id = ? AND e.status = "COMPLETED"`,
            [userId]
        );

        if (certificates.length === 0) {
            return res.status(404).json({ error: 'No certificates found!' });
        }

        const formattedData = certificates.map((cert) => ({
            enrollment_id: cert.enrollment_id,
            module_title: cert.module_title,
            completion_date: cert.completion_date,
            certificate_url: cert.certificate_url,
            thumbnail_url: cert.thumbnail_url
        }));

        res.status(200).json({
            status: 'success',
            message: 'Certificates fetched successfully!',
            data: formattedData
        });
    } catch (error) {
        console.error('Error fetching certificates:', error);
        res.status(500).json({ error: 'Internal server error!' });
    }
};