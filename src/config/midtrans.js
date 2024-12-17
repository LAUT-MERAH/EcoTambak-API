const midtransClient = require('midtrans-client');
require('dotenv').config();

const snap = new midtransClient.Snap({
    isProduction: false, // Set true for production
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

module.exports = snap;
