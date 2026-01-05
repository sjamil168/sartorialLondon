const { getTrustedSdk, handleError, serialize } = require('../api-util/sdk');
const sharetribeSdk = require('sharetribe-flex-sdk');
const { UUID } = sharetribeSdk.types;
const { sendProviderDamageReport } = require('../api-util/email');

/**
 * API endpoint to submit a damage claim (Provider reporting returned item is damaged)
 * 
 * This sends an email notification to the marketplace owner for review.
 * The marketplace owner will then decide whether to charge the customer
 * via Stripe Dashboard.
 * 
 * Request body:
 * - transactionId: UUID string of the rental transaction
 * - description: Description of the damage
 * - estimatedCost: Estimated repair/replacement cost in pence (optional)
 */
module.exports = async (req, res) => {
  const { transactionId, description, estimatedCost } = req.body;

  console.log('Provider damage claim received:', {
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
    // Get the trusted SDK to fetch transaction details
    const trustedSdk = await getTrustedSdk(req);

    // Fetch the transaction with related users and listing
    const txResponse = await trustedSdk.transactions.show({
      id: new UUID(transactionId),
      include: ['customer', 'provider', 'listing'],
    });

    const transaction = txResponse.data.data;
    const included = txResponse.data.included || [];
    
    // Extract customer, provider, and listing from included
    const customer = included.find(i => i.type === 'user' && i.id.uuid === transaction.relationships.customer.data.id.uuid);
    const provider = included.find(i => i.type === 'user' && i.id.uuid === transaction.relationships.provider.data.id.uuid);
    const listing = included.find(i => i.type === 'listing');

    const customerEmail = customer?.attributes?.email || 'Email not available';
    const customerName = customer?.attributes?.profile?.displayName || 'Customer';
    const providerEmail = provider?.attributes?.email || 'Email not available';
    const providerName = provider?.attributes?.profile?.displayName || 'Provider';
    const listingTitle = listing?.attributes?.title || 'Unknown listing';

    // Send email notification to support
    await sendProviderDamageReport({
      transactionId,
      listingTitle,
      providerEmail,
      providerName,
      renterName: customerName,
      renterEmail: customerEmail,
      description,
      estimatedCost: estimatedCost || null,
    });

    console.log('Provider damage claim email sent for transaction:', transactionId);

    res.status(200).json({
      success: true,
      message: 'Damage claim submitted successfully. Our team will review your claim and contact you shortly.',
    });

  } catch (error) {
    console.error('Failed to submit damage claim:', error);
    res.status(500).json({
      error: 'Failed to submit damage claim',
      message: error.message,
    });
  }
};
