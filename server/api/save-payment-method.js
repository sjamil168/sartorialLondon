const { getTrustedSdk, handleError, serialize } = require('../api-util/sdk');
const sharetribeSdk = require('sharetribe-flex-sdk');
const { UUID } = sharetribeSdk.types;

/**
 * API endpoint to save a payment method to a transaction's metadata
 * 
 * This stores the customer's payment method ID so we can charge them later
 * if there's damage to the rented item.
 * 
 * Request body:
 * - transactionId: UUID string of the rental transaction
 * - paymentMethodId: Stripe payment method ID (e.g., pm_xxx)
 */
module.exports = (req, res) => {
  const { transactionId, paymentMethodId } = req.body;

  console.log('=== SAVE PAYMENT METHOD API ===');
  console.log('Received transactionId:', transactionId);
  console.log('Received paymentMethodId:', paymentMethodId);
  console.log('Request body:', req.body);

  if (!transactionId) {
    const error = new Error('Missing transactionId');
    error.status = 400;
    error.statusText = 'Bad Request';
    error.data = {};
    return handleError(res, error);
  }

  if (!paymentMethodId) {
    const error = new Error('Missing paymentMethodId');
    error.status = 400;
    error.statusText = 'Bad Request';
    error.data = {};
    return handleError(res, error);
  }

  // Use trusted SDK to update the transaction's metadata
  getTrustedSdk(req)
    .then(trustedSdk => {
      // Convert to UUID if it's a string
      const txId = typeof transactionId === 'string' ? new UUID(transactionId) : transactionId;
      console.log('Updating transaction metadata for txId:', txId);
      
      // Update the transaction's metadata with the payment method
      return trustedSdk.transactions.updateMetadata({
        id: txId,
        metadata: {
          damageProtectionPaymentMethodId: paymentMethodId,
          damageProtectionSavedAt: new Date().toISOString(),
        },
      });
    })
    .then(apiResponse => {
      const { status, statusText, data } = apiResponse;
      
      console.log('Payment method saved successfully for transaction:', transactionId);
      
      res
        .status(status)
        .set('Content-Type', 'application/transit+json')
        .send(
          serialize({
            status,
            statusText,
            data,
          })
        )
        .end();
    })
    .catch(e => {
      console.error('Failed to save payment method:', e?.data?.errors || e.message);
      handleError(res, e);
    });
};






