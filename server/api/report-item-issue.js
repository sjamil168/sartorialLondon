const { getTrustedSdk, handleError, serialize } = require('../api-util/sdk');
const sharetribeSdk = require('sharetribe-flex-sdk');
const { UUID } = sharetribeSdk.types;
const { sendRenterDamageReport } = require('../api-util/email');

/**
 * API endpoint for RENTERS to report an issue with a received item
 * 
 * This is used when a customer receives an item that is already damaged,
 * stained, or has other issues. An email notification is sent to the 
 * marketplace owner for review.
 * 
 * Request body:
 * - transactionId: UUID string of the rental transaction
 * - description: Description of the issue
 */
module.exports = async (req, res) => {
  const { transactionId, description } = req.body;

  console.log('Renter issue report received:', {
    transactionId,
    description,
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
    const providerName = provider?.attributes?.profile?.displayName || 'Provider';
    const listingTitle = listing?.attributes?.title || 'Unknown listing';

    // Send email notification to support
    await sendRenterDamageReport({
      transactionId,
      listingTitle,
      renterEmail: customerEmail,
      renterName: customerName,
      providerName,
      description,
    });

    console.log('Renter issue report email sent for transaction:', transactionId);

    res.status(200).json({
      success: true,
      message: 'Issue reported successfully. Our team will review your report and contact you shortly.',
    });

  } catch (error) {
    console.error('Failed to report issue:', error);
    res.status(500).json({
      error: 'Failed to report issue',
      message: error.message,
    });
  }
};

