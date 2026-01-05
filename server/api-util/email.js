/**
 * Email utility for sending notifications
 * 
 * This module handles sending email notifications for damage reports
 * and other marketplace communications.
 */

const nodemailer = require('nodemailer');

// Support email address
const SUPPORT_EMAIL = 'taiyab.mailbox@gmail.com';

// Email subjects with common prefix for easy filtering
const EMAIL_SUBJECTS = {
  RENTER_DAMAGE_REPORT: '[Sartorial London - Renter] Damage Report',
  PROVIDER_DAMAGE_REPORT: '[Sartorial London - Provider] Damage Claim',
};

/**
 * Create email transporter
 * 
 * In production, you should use a proper SMTP service (SendGrid, Mailgun, etc.)
 * For development, we'll use a simple configuration
 */
const createTransporter = () => {
  // Check for SMTP configuration in environment
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  
  if (smtpHost && smtpUser && smtpPass) {
    // Production SMTP configuration
    return nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort, 10),
      secure: smtpPort === '465',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }
  
  // Development: Log emails to console instead of sending
  console.log('⚠️ SMTP not configured. Emails will be logged to console.');
  return null;
};

/**
 * Send damage report email from RENTER (customer)
 * When the renter receives a damaged item
 */
const sendRenterDamageReport = async ({
  transactionId,
  listingTitle,
  renterEmail,
  renterName,
  providerName,
  description,
}) => {
  const subject = EMAIL_SUBJECTS.RENTER_DAMAGE_REPORT;
  
  const htmlContent = `
    <h2>🚨 Renter Damage Report</h2>
    <p>A renter has reported that they received a damaged outfit.</p>
    
    <h3>Details:</h3>
    <table style="border-collapse: collapse; width: 100%;">
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Transaction ID:</strong></td>
        <td style="padding: 8px; border: 1px solid #ddd;">${transactionId}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Listing:</strong></td>
        <td style="padding: 8px; border: 1px solid #ddd;">${listingTitle}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Renter:</strong></td>
        <td style="padding: 8px; border: 1px solid #ddd;">${renterName} (${renterEmail})</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Provider:</strong></td>
        <td style="padding: 8px; border: 1px solid #ddd;">${providerName}</td>
      </tr>
    </table>
    
    <h3>Issue Description:</h3>
    <p style="background: #f5f5f5; padding: 15px; border-radius: 5px;">${description}</p>
    
    <hr>
    <p style="color: #666; font-size: 12px;">
      This is an automated message from Sartorial London.
      Please review this report and contact both parties to resolve the issue.
    </p>
  `;

  const textContent = `
RENTER DAMAGE REPORT

A renter has reported that they received a damaged outfit.

Transaction ID: ${transactionId}
Listing: ${listingTitle}
Renter: ${renterName} (${renterEmail})
Provider: ${providerName}

Issue Description:
${description}

---
This is an automated message from Sartorial London.
  `;

  return sendEmail({
    to: SUPPORT_EMAIL,
    subject,
    html: htmlContent,
    text: textContent,
  });
};

/**
 * Send damage claim email from PROVIDER (outfit owner)
 * When the provider receives a damaged item back
 */
const sendProviderDamageReport = async ({
  transactionId,
  listingTitle,
  providerEmail,
  providerName,
  renterName,
  renterEmail,
  description,
  estimatedCost,
}) => {
  const subject = EMAIL_SUBJECTS.PROVIDER_DAMAGE_REPORT;
  
  const costDisplay = estimatedCost 
    ? `£${(estimatedCost / 100).toFixed(2)}` 
    : 'Not specified';
  
  const htmlContent = `
    <h2>⚠️ Provider Damage Claim</h2>
    <p>A provider has reported that their outfit was returned damaged.</p>
    
    <h3>Details:</h3>
    <table style="border-collapse: collapse; width: 100%;">
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Transaction ID:</strong></td>
        <td style="padding: 8px; border: 1px solid #ddd;">${transactionId}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Listing:</strong></td>
        <td style="padding: 8px; border: 1px solid #ddd;">${listingTitle}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Provider:</strong></td>
        <td style="padding: 8px; border: 1px solid #ddd;">${providerName} (${providerEmail})</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Renter:</strong></td>
        <td style="padding: 8px; border: 1px solid #ddd;">${renterName} (${renterEmail})</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Estimated Cost:</strong></td>
        <td style="padding: 8px; border: 1px solid #ddd;">${costDisplay}</td>
      </tr>
    </table>
    
    <h3>Damage Description:</h3>
    <p style="background: #f5f5f5; padding: 15px; border-radius: 5px;">${description}</p>
    
    <h3>Next Steps:</h3>
    <ol>
      <li>Review the damage claim with the provider</li>
      <li>Contact the renter for their response</li>
      <li>If valid, charge the renter's saved card via Stripe Dashboard</li>
    </ol>
    
    <hr>
    <p style="color: #666; font-size: 12px;">
      This is an automated message from Sartorial London.
      The customer's payment method is on file and can be charged via Stripe Dashboard.
    </p>
  `;

  const textContent = `
PROVIDER DAMAGE CLAIM

A provider has reported that their outfit was returned damaged.

Transaction ID: ${transactionId}
Listing: ${listingTitle}
Provider: ${providerName} (${providerEmail})
Renter: ${renterName} (${renterEmail})
Estimated Cost: ${costDisplay}

Damage Description:
${description}

Next Steps:
1. Review the damage claim with the provider
2. Contact the renter for their response
3. If valid, charge the renter's saved card via Stripe Dashboard

---
This is an automated message from Sartorial London.
The customer's payment method is on file and can be charged via Stripe Dashboard.
  `;

  return sendEmail({
    to: SUPPORT_EMAIL,
    subject,
    html: htmlContent,
    text: textContent,
  });
};

/**
 * Core email sending function
 */
const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = createTransporter();
  
  if (!transporter) {
    // Development mode: log the email
    console.log('\n========== EMAIL (DEV MODE) ==========');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Text:', text);
    console.log('========================================\n');
    return { success: true, mode: 'development' };
  }

  try {
    const result = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@sartoriallondon.com',
      to,
      subject,
      html,
      text,
    });
    
    console.log('Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
};

module.exports = {
  sendRenterDamageReport,
  sendProviderDamageReport,
  SUPPORT_EMAIL,
  EMAIL_SUBJECTS,
};

