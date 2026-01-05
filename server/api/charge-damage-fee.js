const { getTrustedSdk, handleError, serialize } = require('../api-util/sdk');
const sharetribeSdk = require('sharetribe-flex-sdk');
const { UUID } = sharetribeSdk.types;

/**
 * API endpoint to submit a damage claim
 * 
 * This records that the provider has reported damage to an item.
 * The marketplace owner will then review the claim and charge
 * the customer via Stripe Dashboard if warranted.
 * 
 * Request body:
 * - transactionId: UUID string of the rental transaction
 * - description: Description of the damage
 * - estimatedCost: Estimated repair/replacement cost in pence
 */
module.exports = async (req, res) => {
  const { transactionId, description, estimatedCost } = req.body;

  console.log('damage-claim received:', {
    transactionId,
    description,
    estimatedCost,
  });

  // Validate inputs
  if (!transactionId) {
    return res.status(400).json({ error: 'Missing transactionId' });
  }

  if (!description || description.length < 10) {
    return res.status(400).json({ error: 'Please provide a description of at least 10 characters' });
  }

  try {
    // Get the trusted SDK to update transaction metadata
    const trustedSdk = await getTrustedSdk(req);

    // Fetch the transaction first
    const txResponse = await trustedSdk.transactions.show({
      id: new UUID(transactionId),
    });

    const transaction = txResponse.data.data;
    const metadata = transaction.attributes.metadata || {};

    // Add the damage claim to metadata
    const damageClaim = {
      description,
      estimatedCost: estimatedCost || null,
      submittedAt: new Date().toISOString(),
      status: 'pending_review', // pending_review, approved, rejected
    };

    // Update the transaction's metadata with the damage claim
    await trustedSdk.transactions.updateMetadata({
      id: new UUID(transactionId),
      metadata: {
        ...metadata,
        damageClaim,
        // Keep the payment method for reference
        damageProtectionPaymentMethodId: metadata.damageProtectionPaymentMethodId,
      },
    });

    console.log('Damage claim submitted for transaction:', transactionId);

    res.status(200).json({
      success: true,
      message: 'Damage claim submitted successfully. The marketplace team will review your claim.',
    });

  } catch (error) {
    console.error('Failed to submit damage claim:', error);
    res.status(500).json({
      error: 'Failed to submit damage claim',
      message: error.message,
    });
  }
};

