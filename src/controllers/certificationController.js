const fs = require('fs');
const puppeteer = require('puppeteer');
const db = require('../config/db');
const bucket = require('../config/cloudStorage');

exports.getAllCertificates = async (req, res) => {
    try {
        const userId = req.user.id;

        const [certificates] = await db.promise().query(
            `SELECT e.ulid AS enrollment_id, e.certificate_url, m.title AS module_title, e.completion_date
             FROM enrollments e
             JOIN modules m ON e.module_id = m.id
             WHERE e.user_id = ? AND e.status = "COMPLETED"`,
            [userId]
        );

        if (certificates.length === 0) {
            return res.status(404).json({ error: 'No certificates found!' });
        }

        res.status(200).json({
            status: 'success',
            message: 'Certificates fetched successfully!',
            data: certificates
        });
    } catch (error) {
        console.error('Error fetching certificates:', error);
        res.status(500).json({ error: 'Internal server error!' });
    }
};


exports.generateCertificate = async (req, res) => {
    try {
        const { enrollmentId } = req.params;

        const [enrollmentData] = await db.promise().query(
            `SELECT e.id, e.certificate_url, u.first_name, u.last_name, m.title, e.updated_at
             FROM enrollments e
             JOIN users u ON e.user_id = u.id
             JOIN modules m ON e.module_id = m.id
             WHERE e.ulid = ? AND e.status = "COMPLETED"`,
            [enrollmentId]
        );

        if (enrollmentData.length === 0) {
            return res.status(404).json({ error: 'Enrollment not found or not completed!' });
        }

        const { first_name, last_name, title, certificate_url, updated_at } = enrollmentData[0];

        if (certificate_url) {
            return res.status(200).json({
                status: 'success',
                message: 'Certificate already generated!',
                certificateUrl: certificate_url
            });
        }

        const templatePath = require('path').join(__dirname, '../templates/certificateTemplate.html');
        let htmlContent = require('fs').readFileSync(templatePath, 'utf8');

        const fullName = `${first_name} ${last_name || ''}`.trim();
        htmlContent = htmlContent
            .replace('{{name}}', fullName)
            .replace('{{module}}', title)
            .replace('{{date}}', new Date(updated_at).toLocaleDateString());

        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            landscape: true
        });

        await browser.close();

        const fileName = `certificates/${enrollmentId}.pdf`;
        const file = bucket.file(fileName);

        await file.save(pdfBuffer, {
            metadata: { contentType: 'application/pdf' },
            resumable: false
        });

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

        await db.promise().query(
            'UPDATE enrollments SET certificate_url = ? WHERE ulid = ?',
            [publicUrl, enrollmentId]
        );

        res.status(201).json({
            status: 'success',
            message: 'Certificate generated and uploaded successfully!',
            certificateUrl: publicUrl
        });
    } catch (error) {
        console.error('Error generating certificate:', error);
        res.status(500).json({ error: 'Internal server error!' });
    }
};