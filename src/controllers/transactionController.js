const db = require('../config/db');
const snap = require('../config/midtrans');
const { ulid } = require('ulid');
const crypto = require('crypto');

const { mapTransactionStatus } = require('../utils/statusMapper');

function validateSignatureKey(body) {
    const { order_id, status_code, gross_amount, signature_key } = body;
    const serverKey = process.env.MIDTRANS_SERVER_KEY;

    const input = `${order_id}${status_code}${gross_amount}${serverKey}`;
    const generatedSignature = crypto.createHash('sha512').update(input).digest('hex');

    return generatedSignature === signature_key;
}

exports.createTransaction = async (req, res) => {
    try {
        const userId = req.user.id;

        const { moduleUlid } = req.params;

        const [module] = await db.promise().query(
            'SELECT id, title, price FROM modules WHERE ulid = ?',
            [moduleUlid]
        );

        if (module.length === 0) {
            return res.status(404).json({ error: 'Module not found!' });
        }

        const { id: moduleId, title, price } = module[0];

        const ulidValue = ulid();
        const orderId = `MODULE-${ulidValue}`;

        const parameter = {
            transaction_details: {
                order_id: orderId,
                gross_amount: price
            },
            item_details: [
                {
                    id: moduleId,
                    price: price,
                    quantity: 1,
                    name: title
                }
            ],
            customer_details: {
                email: req.user.email || 'customer@example.com',
                first_name: req.user.first_name || 'Guest',
                last_name: req.user.last_name || '',
            }
        };

        const transaction = await snap.createTransaction(parameter);

        await db.promise().query(
            `INSERT INTO transactions 
            (ulid, module_id, user_id, order_id, transaction_status, gross_amount, payment_type) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [ulidValue, moduleId, userId, orderId, 'PENDING', price, null]
        );

        res.status(201).json({
            status: 'success',
            message: 'Transaction created successfully!',
            paymentUrl: transaction.redirect_url
        });
    } catch (error) {
        console.error('Error creating transaction:', error);
        res.status(500).json({ error: 'Internal server error!' });
    }
};

exports.handleNotification = async (req, res) => {
    try {
        const notification = req.body;
        
        if (!validateSignatureKey(notification)) {
            console.error('Invalid signature key');
            return res.status(401).json({ error: 'Invalid signature key' });
        }

        const { order_id, transaction_status, payment_type } = notification;
        const appStatus = mapTransactionStatus(transaction_status);

        await db.promise().query(
            `UPDATE transactions 
             SET transaction_status = ?, payment_type = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE order_id = ?`,
            [appStatus, payment_type, order_id]
        );

        res.status(200).json({ status: 'success', message: 'Notification handled successfully' });
    } catch (error) {
        console.error('Error handling notification:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
