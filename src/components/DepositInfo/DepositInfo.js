import React from 'react';
import classNames from 'classnames';
import { FormattedMessage } from '../../util/reactIntl';
import css from './DepositInfo.module.css';

/**
 * DepositInfo - Shows damage protection status for rental transactions
 * 
 * This component displays information about saved card for damage protection.
 * When the transaction has a saved payment method, it shows the customer that
 * their card is on file and can be charged if there's damage to the item.
 */
const DepositInfo = props => {
  const { transaction, isProvider, damageCharges = [] } = props;

  // Get the protectedData to check for saved payment method
  // Payment method is stored in protectedData during confirm-payment transition
  const protectedData = transaction?.attributes?.protectedData || {};
  const hasSavedCard = !!protectedData.damageProtectionPaymentMethodId;
  const savedAt = protectedData.damageProtectionSavedAt;

  // If no saved card, don't render anything
  if (!hasSavedCard) {
    return null;
  }

  // Check if any damage charges have been made
  const hasCharges = damageCharges && damageCharges.length > 0;
  const totalCharged = hasCharges 
    ? damageCharges.reduce((sum, charge) => sum + (charge.amount || 0), 0)
    : 0;

  return (
    <div className={css.root}>
      {/* Card saved message */}
      <div className={css.cardSaved}>
        <span className={css.cardIcon}>💳</span>
        <div className={css.cardInfo}>
          <p className={css.description}>
            {isProvider ? (
              <FormattedMessage id="DepositInfo.providerDescription" />
            ) : (
              <FormattedMessage id="DepositInfo.customerDescription" />
            )}
          </p>
          <div className={classNames(css.status, css.statusActive)}>
            <FormattedMessage id="DepositInfo.status.cardOnFile" />
          </div>
        </div>
      </div>

      {/* Show damage charges if any */}
      {hasCharges && (
        <div className={css.chargesSection}>
          <h4 className={css.chargesTitle}>
            <FormattedMessage id="DepositInfo.damageChargesTitle" />
          </h4>
          {damageCharges.map((charge, index) => (
            <div key={index} className={css.chargeItem}>
              <span className={css.chargeAmount}>
                £{(charge.amount / 100).toFixed(2)}
              </span>
              <span className={css.chargeReason}>
                {charge.reason || 'Damage fee'}
              </span>
              <span className={classNames(css.chargeStatus, 
                charge.status === 'succeeded' ? css.statusSuccess : css.statusPending
              )}>
                {charge.status === 'succeeded' ? '✓ Paid' : 'Processing'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DepositInfo;

