/**
 * Maps Midtrans transaction statuses to simplified application statuses.
 * @param {string} transactionStatus - Status returned by Midtrans.
 * @returns {string} - Simplified app status (PENDING, SUCCESS, CANCEL, FAILED).
 */
const mapTransactionStatus = (transactionStatus) => {
    switch (transactionStatus) {
        case 'settlement':
            return 'SUCCESS';
        case 'pending':
            return 'PENDING';
        case 'deny':
        case 'expire':
        case 'cancel':
            return 'FAILED';
        default:
            return 'PENDING'; // Default fallback
    }
};

module.exports = { mapTransactionStatus };
