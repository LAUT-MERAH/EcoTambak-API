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

        const [transactionResult] = await db.promise().query(
            `SELECT id, user_id, module_id FROM transactions WHERE order_id = ?`,
            [order_id]
        );

        if (transactionResult.length === 0) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        const { user_id, module_id } = transactionResult[0];

        await db.promise().query(
            `UPDATE transactions 
             SET transaction_status = ?, payment_type = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE order_id = ?`,
            [appStatus, payment_type, order_id]
        );

        if (appStatus === 'SUCCESS') {
            const [existingEnrollment] = await db.promise().query(
                `SELECT id FROM enrollments WHERE user_id = ? AND module_id = ?`,
                [user_id, module_id]
            );

            if (existingEnrollment.length === 0) {
                const enrollmentUlid = ulid();
                await db.promise().query(
                    `INSERT INTO enrollments 
                     (ulid, module_id, user_id, status, enrollment_date, created_at, updated_at) 
                     VALUES (?, ?, ?, 'NOT_STARTED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                    [enrollmentUlid, module_id, user_id]
                );
                console.log(`User ${user_id} auto-enrolled in module ${module_id}`);
            } else {
                console.log(`User ${user_id} is already enrolled in module ${module_id}`);
            }
        }

        res.status(200).json({ status: 'success', message: 'Notification handled successfully' });
    } catch (error) {
        console.error('Error handling notification:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


exports.finishRedirect = async (req, res) => {
    try {
        const { order_id } = req.query;

        if (!order_id) {
            return res.status(400).send('Order ID is required.');
        }

        const [transaction] = await db.promise().query(
            'SELECT transaction_status FROM transactions WHERE order_id = ?',
            [order_id]
        );

        if (transaction.length === 0) {
            return res.status(404).send('Transaction not found.');
        }

        const status = transaction[0].transaction_status;
        const localFrontendUrl = process.env.LOCAL_FE_URL || 'http://localhost:3001';
        
        res.send(`
            <html>
    <head>
        <title>Payment Finished</title>
        <style>
            body {
                margin: 0;
                height: 100vh;
                display: flex;
                justify-content: center; /* Horizontally center */
                align-items: center; /* Vertically center */
                background-color: #f8f9fa; /* Light background */
                font-family: Arial, sans-serif;
                color: #333;
            }

            .container {
                text-align: center;
                background: #fff;
                padding: 30px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }

            h4 {
                margin-bottom: 10px;
                color: #28a745;
            }

            a {
                text-decoration: none;
                color: #007bff;
                font-weight: bold;
            }

            a:hover {
                text-decoration: underline;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h4>Payment Status: ${status}</h2>
            <p>Your order ID: <strong>${order_id}</strong></p>
            <p>Click <a href="${localFrontendUrl}">here</a> to back to dashboard.</p>
            <script>
                // Optional: Automatically redirect after 3 seconds
                setTimeout(() => {
                    window.location.href = "${localFrontendUrl}";
                }, 3000);
            </script>
        </div>
    </body>
</html>

        `);
    } catch (error) {
        console.error('Error handling finish redirect:', error);
        res.status(500).send('Internal server error.');
    }
};

