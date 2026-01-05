/**
 * Transaction process graph for security deposits:
 *   - rental-deposit
 * 
 * This process runs alongside the main booking process to handle
 * security deposit holds, releases, and captures.
 * 
 * Updated flow: request-deposit now goes directly to deposit-held
 * using :confirm :off-session for auto-confirmation with saved payment method.
 */

/**
 * Transitions
 */
export const transitions = {
  // Customer initiates deposit hold (auto-confirmed with :off-session)
  // Goes directly to deposit-held state
  REQUEST_DEPOSIT: 'transition/request-deposit',
  
  // Provider releases deposit (refund authorization)
  RELEASE_DEPOSIT: 'transition/release-deposit',
  OPERATOR_RELEASE_DEPOSIT: 'transition/operator-release-deposit',
  
  // Provider captures deposit (charge the card)
  CAPTURE_DEPOSIT: 'transition/capture-deposit',
  OPERATOR_CAPTURE_DEPOSIT: 'transition/operator-capture-deposit',
  
  // Auto-capture before Stripe authorization expires
  AUTO_CAPTURE_DEPOSIT: 'transition/auto-capture-deposit',
};

/**
 * States
 */
export const states = {
  INITIAL: 'initial',
  DEPOSIT_HELD: 'deposit-held',
  DEPOSIT_RELEASED: 'deposit-released',
  DEPOSIT_CAPTURED: 'deposit-captured',
};

/**
 * Process name constant
 */
export const DEPOSIT_PROCESS_NAME = 'rental-deposit';

/**
 * Description of transaction process graph
 * 
 * Updated: request-deposit goes directly to deposit-held
 */
export const graph = {
  id: 'rental-deposit/release-1',
  initial: states.INITIAL,

  states: {
    [states.INITIAL]: {
      on: {
        [transitions.REQUEST_DEPOSIT]: states.DEPOSIT_HELD,
      },
    },

    [states.DEPOSIT_HELD]: {
      on: {
        [transitions.RELEASE_DEPOSIT]: states.DEPOSIT_RELEASED,
        [transitions.OPERATOR_RELEASE_DEPOSIT]: states.DEPOSIT_RELEASED,
        [transitions.CAPTURE_DEPOSIT]: states.DEPOSIT_CAPTURED,
        [transitions.OPERATOR_CAPTURE_DEPOSIT]: states.DEPOSIT_CAPTURED,
        [transitions.AUTO_CAPTURE_DEPOSIT]: states.DEPOSIT_CAPTURED,
      },
    },

    [states.DEPOSIT_RELEASED]: { type: 'final' },
    [states.DEPOSIT_CAPTURED]: { type: 'final' },
  },
};

// Check if deposit is currently being held
export const isDepositHeld = transition => {
  return transition === transitions.REQUEST_DEPOSIT;
};

// Check if deposit was released
export const isDepositReleased = transition => {
  return [
    transitions.RELEASE_DEPOSIT,
    transitions.OPERATOR_RELEASE_DEPOSIT,
  ].includes(transition);
};

// Check if deposit was captured (charged)
export const isDepositCaptured = transition => {
  return [
    transitions.CAPTURE_DEPOSIT,
    transitions.OPERATOR_CAPTURE_DEPOSIT,
    transitions.AUTO_CAPTURE_DEPOSIT,
  ].includes(transition);
};

// Check if the given transition is privileged
export const isPrivileged = transition => {
  return transition === transitions.REQUEST_DEPOSIT;
};

// Check if a transition is the kind that should be rendered
// when showing transition history (e.g. ActivityFeed)
export const isRelevantPastTransition = transition => {
  return [
    transitions.REQUEST_DEPOSIT,
    transitions.RELEASE_DEPOSIT,
    transitions.OPERATOR_RELEASE_DEPOSIT,
    transitions.CAPTURE_DEPOSIT,
    transitions.OPERATOR_CAPTURE_DEPOSIT,
    transitions.AUTO_CAPTURE_DEPOSIT,
  ].includes(transition);
};

// Check when transaction is completed (deposit resolved)
export const isCompleted = transition => {
  return [
    transitions.RELEASE_DEPOSIT,
    transitions.OPERATOR_RELEASE_DEPOSIT,
    transitions.CAPTURE_DEPOSIT,
    transitions.OPERATOR_CAPTURE_DEPOSIT,
    transitions.AUTO_CAPTURE_DEPOSIT,
  ].includes(transition);
};

// Check when transaction is refunded
export const isRefunded = transition => {
  return [
    transitions.RELEASE_DEPOSIT,
    transitions.OPERATOR_RELEASE_DEPOSIT,
  ].includes(transition);
};

// Reviews don't apply to deposits
export const isCustomerReview = transition => false;
export const isProviderReview = transition => false;

// States needing provider attention
export const statesNeedingProviderAttention = [states.DEPOSIT_HELD];

// Fixed deposit amount in subunits (£100.00 = 10000 pence)
export const FIXED_DEPOSIT_AMOUNT_SUBUNITS = 10000;
export const FIXED_DEPOSIT_CURRENCY = 'GBP';
