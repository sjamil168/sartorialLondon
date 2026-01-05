import {
  TX_TRANSITION_ACTOR_CUSTOMER as CUSTOMER,
  TX_TRANSITION_ACTOR_PROVIDER as PROVIDER,
  CONDITIONAL_RESOLVER_WILDCARD,
  ConditionalResolver,
} from '../../transactions/transaction';

/**
 * Get state data against booking process for TransactionPage's UI.
 * I.e. info about showing action buttons, current state etc.
 *
 * @param {*} txInfo detials about transaction
 * @param {*} processInfo  details about process
 */
export const getStateDataForBookingProcess = (txInfo, processInfo) => {
  const { transaction, transactionRole, nextTransitions } = txInfo;
  const isProviderBanned = transaction?.provider?.attributes?.banned;
  const isCustomerBanned = transaction?.provider?.attributes?.banned;
  const _ = CONDITIONAL_RESOLVER_WILDCARD;

  const {
    processName,
    processState,
    states,
    transitions,
    isCustomer,
    actionButtonProps,
    leaveReviewProps,
  } = processInfo;

  return new ConditionalResolver([processState, transactionRole])
    .cond([states.INQUIRY, CUSTOMER], () => {
      const transitionNames = Array.isArray(nextTransitions)
        ? nextTransitions.map(t => t.attributes.name)
        : [];
      const requestAfterInquiry = transitions.REQUEST_PAYMENT_AFTER_INQUIRY;
      const hasCorrectNextTransition = transitionNames.includes(requestAfterInquiry);
      const showOrderPanel = !isProviderBanned && hasCorrectNextTransition;
      return { processName, processState, showOrderPanel };
    })
    .cond([states.INQUIRY, PROVIDER], () => {
      return { processName, processState, showDetailCardHeadings: true };
    })
    .cond([states.PREAUTHORIZED, CUSTOMER], () => {
      return { processName, processState, showDetailCardHeadings: true, showExtraInfo: true };
    })
    .cond([states.PREAUTHORIZED, PROVIDER], () => {
      const primary = isCustomerBanned ? null : actionButtonProps(transitions.ACCEPT, PROVIDER);
      const secondary = isCustomerBanned ? null : actionButtonProps(transitions.DECLINE, PROVIDER);
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showActionButtons: true,
        primaryButtonProps: primary,
        secondaryButtonProps: secondary,
      };
    })
    // ====================================
    // RENTAL WORKFLOW: ACCEPTED STATE
    // Provider can mark item as sent
    // ====================================
    .cond([states.ACCEPTED, PROVIDER], () => {
      const primary = actionButtonProps(transitions.MARK_SENT, PROVIDER);
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showActionButtons: true,
        primaryButtonProps: primary,
      };
    })
    .cond([states.ACCEPTED, CUSTOMER], () => {
      return { 
        processName, 
        processState, 
        showDetailCardHeadings: true,
        showExtraInfo: true, // Show info that lender will ship soon
      };
    })
    // ====================================
    // RENTAL WORKFLOW: SENT STATE
    // Customer can confirm receipt
    // ====================================
    .cond([states.SENT, CUSTOMER], () => {
      const primary = actionButtonProps(transitions.CONFIRM_RECEIVED, CUSTOMER);
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showActionButtons: true,
        primaryButtonProps: primary,
      };
    })
    .cond([states.SENT, PROVIDER], () => {
      return { 
        processName, 
        processState, 
        showDetailCardHeadings: true,
        showExtraInfo: true, // Show info waiting for customer to confirm receipt
      };
    })
    // ====================================
    // RENTAL WORKFLOW: CUSTOMER_RECEIVED STATE
    // Customer can mark item as returned
    // ====================================
    .cond([states.CUSTOMER_RECEIVED, CUSTOMER], () => {
      const primary = actionButtonProps(transitions.MARK_RETURNED, CUSTOMER);
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showActionButtons: true,
        primaryButtonProps: primary,
      };
    })
    .cond([states.CUSTOMER_RECEIVED, PROVIDER], () => {
      return { 
        processName, 
        processState, 
        showDetailCardHeadings: true,
        showExtraInfo: true, // Show info waiting for customer to return item
      };
    })
    // ====================================
    // RENTAL WORKFLOW: CUSTOMER_RETURNED STATE
    // Provider can confirm return received
    // ====================================
    .cond([states.CUSTOMER_RETURNED, PROVIDER], () => {
      const primary = actionButtonProps(transitions.CONFIRM_RETURN_RECEIVED, PROVIDER);
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showActionButtons: true,
        primaryButtonProps: primary,
      };
    })
    .cond([states.CUSTOMER_RETURNED, CUSTOMER], () => {
      return { 
        processName, 
        processState, 
        showDetailCardHeadings: true,
        showExtraInfo: true, // Show info waiting for provider to confirm return
      };
    })
    // ====================================
    // DELIVERED STATE - Reviews
    // ====================================
    .cond([states.DELIVERED, _], () => {
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showReviewAsFirstLink: true,
        showActionButtons: true,
        primaryButtonProps: leaveReviewProps,
      };
    })
    .cond([states.REVIEWED_BY_PROVIDER, CUSTOMER], () => {
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showReviewAsSecondLink: true,
        showActionButtons: true,
        primaryButtonProps: leaveReviewProps,
      };
    })
    .cond([states.REVIEWED_BY_CUSTOMER, PROVIDER], () => {
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showReviewAsSecondLink: true,
        showActionButtons: true,
        primaryButtonProps: leaveReviewProps,
      };
    })
    .cond([states.REVIEWED, _], () => {
      return { processName, processState, showDetailCardHeadings: true, showReviews: true };
    })
    .default(() => {
      // Default values for other states
      return { processName, processState, showDetailCardHeadings: true };
    })
    .resolve();
};
