import React from 'react';
import classNames from 'classnames';
import { FormattedMessage } from '../../../util/reactIntl';

import { PrimaryButton, SecondaryButton } from '../../../components';

import css from './TransactionPanel.module.css';

// Functional component as a helper to build ActionButtons
const ActionButtonsMaybe = props => {
  const {
    className,
    rootClassName,
    showButtons,
    primaryButtonProps,
    secondaryButtonProps,
    isListingDeleted,
    isProvider,
    processState,
  } = props;

  // In default processes default processes need special handling
  // Booking: provider should not be able to accept on-going transactions
  // Product: customer should be able to dispute etc. on-going transactions
  if (isListingDeleted && isProvider) {
    return null;
  }

  const buttonsDisabled = primaryButtonProps?.inProgress || secondaryButtonProps?.inProgress;

  // Determine which reminder message to show based on state and role
  const getReminderMessage = () => {
    if (isProvider) {
      // Provider reminders
      if (processState === 'preauthorized') {
        // Before accepting a request
        return {
          icon: '📹',
          messageId: 'ActionButtonsMaybe.providerAcceptReminder',
        };
      }
      if (processState === 'accepted') {
        // Before marking as sent
        return {
          icon: '📦',
          messageId: 'ActionButtonsMaybe.providerSentReminder',
        };
      }
    } else {
      // Customer reminders
      if (processState === 'sent') {
        // Before confirming received
        return {
          icon: '📸',
          messageId: 'ActionButtonsMaybe.customerReceivedReminder',
        };
      }
    }
    return null;
  };

  const reminderInfo = getReminderMessage();

  const primaryButton = primaryButtonProps ? (
    <PrimaryButton
      inProgress={primaryButtonProps.inProgress}
      disabled={buttonsDisabled}
      onClick={primaryButtonProps.onAction}
    >
      {primaryButtonProps.buttonText}
    </PrimaryButton>
  ) : null;
  const primaryErrorMessage = primaryButtonProps?.error ? (
    <p className={css.actionError}>{primaryButtonProps?.errorText}</p>
  ) : null;

  const secondaryButton = secondaryButtonProps ? (
    <SecondaryButton
      inProgress={secondaryButtonProps?.inProgress}
      disabled={buttonsDisabled}
      onClick={secondaryButtonProps.onAction}
    >
      {secondaryButtonProps.buttonText}
    </SecondaryButton>
  ) : null;
  const secondaryErrorMessage = secondaryButtonProps?.error ? (
    <p className={css.actionError}>{secondaryButtonProps?.errorText}</p>
  ) : null;

  const classes = classNames(rootClassName || css.actionButtons, className);

  return showButtons ? (
    <div className={classes}>
      {/* Reminder message */}
      {reminderInfo && (
        <div className={css.actionReminder}>
          <span className={css.actionReminderIcon}>{reminderInfo.icon}</span>
          <p className={css.actionReminderText}>
            <FormattedMessage id={reminderInfo.messageId} />
          </p>
        </div>
      )}
      <div className={css.actionErrors}>
        {primaryErrorMessage}
        {secondaryErrorMessage}
      </div>
      <div className={css.actionButtonWrapper}>
        {secondaryButton}
        {primaryButton}
      </div>
    </div>
  ) : null;
};

export default ActionButtonsMaybe;
