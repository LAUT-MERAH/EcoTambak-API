const { Storage } = require('@google-cloud/storage');
const path = require('path');
require('dotenv').config();

// Load the service account key
const keyPath = path.join(__dirname, 'gcs-key.json');

const storage = new Storage({
    keyFilename: keyPath, 
});

const bucketName = process.env.BUCKET_NAME;
const bucket = storage.bucket(bucketName);

module.exports = bucket;
