# Sharetribe Console Changes Guide

This document outlines the changes that need to be made in the **Sharetribe Console** to support:
- **Requirement 2**: Stripe Card Holds (Security Deposits)
- **Requirement 4**: Sent/Returned Status Buttons

These changes cannot be made through code alone - they require manual configuration in the Sharetribe Console.

---

## Table of Contents
1. [Requirement 4: Sent/Returned Buttons](#requirement-4-sentreturned-buttons)
2. [Requirement 2: Stripe Card Holds](#requirement-2-stripe-card-holds)
3. [How to Make These Changes](#how-to-make-these-changes)
4. [After Console Changes](#after-console-changes)

---

## Requirement 4: Sent/Returned Buttons

### Overview
Currently, the `default-booking` process has these states:
```
PENDING_PAYMENT → PREAUTHORIZED → ACCEPTED → DELIVERED → REVIEWED
```

We need to add intermediate states for the rental workflow:
```
PENDING_PAYMENT → PREAUTHORIZED → ACCEPTED → SENT → CUSTOMER_RECEIVED → CUSTOMER_RETURNED → DELIVERED → REVIEWED
```

### New States to Add

| State | Description |
|-------|-------------|
| `state/sent` | Provider has shipped the outfit to the customer |
| `state/customer-received` | Customer confirmed they received the outfit |
| `state/customer-returned` | Customer has shipped the outfit back to provider |

### New Transitions to Add

| Transition | Actor | From State | To State | Description |
|------------|-------|------------|----------|-------------|
| `transition/mark-sent` | Provider | `accepted` | `sent` | Provider marks outfit as shipped |
| `transition/operator-mark-sent` | Operator | `accepted` | `sent` | Operator can also mark as sent |
| `transition/confirm-received` | Customer | `sent` | `customer-received` | Customer confirms receipt |
| `transition/auto-confirm-received` | System | `sent` | `customer-received` | Auto-confirm after X days if customer doesn't respond |
| `transition/mark-returned` | Customer | `customer-received` | `customer-returned` | Customer marks outfit as returned/shipped back |
| `transition/confirm-return-received` | Provider | `customer-returned` | `delivered` | Provider confirms return, triggers payout |
| `transition/operator-confirm-return-received` | Operator | `customer-returned` | `delivered` | Operator can confirm return |
| `transition/auto-confirm-return-received` | System | `customer-returned` | `delivered` | Auto-confirm return after X days |

### Process.edn Changes for default-booking

Add these to your `default-booking` process.edn file:

```clojure
;; ====================================
;; RENTAL WORKFLOW STATES
;; ====================================

{:name :state/sent
 :initial false}

{:name :state/customer-received
 :initial false}

{:name :state/customer-returned
 :initial false}

;; ====================================
;; RENTAL WORKFLOW TRANSITIONS
;; ====================================

;; Provider marks outfit as sent
{:name :transition/mark-sent
 :actor :actor.role/provider
 :actions []
 :from :state/accepted
 :to :state/sent}

{:name :transition/operator-mark-sent
 :actor :actor.role/operator
 :actions []
 :from :state/accepted
 :to :state/sent}

;; Customer confirms receipt
{:name :transition/confirm-received
 :actor :actor.role/customer
 :actions []
 :from :state/sent
 :to :state/customer-received}

;; Auto-confirm received after 7 days (optional)
{:name :transition/auto-confirm-received
 :at {:fn/plus [{:fn/timepoint [:time/first-entered-state :state/sent]}
                {:fn/period ["P7D"]}]}
 :actions []
 :from :state/sent
 :to :state/customer-received}

;; Customer marks outfit as returned
{:name :transition/mark-returned
 :actor :actor.role/customer
 :actions []
 :from :state/customer-received
 :to :state/customer-returned}

;; Provider confirms return received - triggers payout
{:name :transition/confirm-return-received
 :actor :actor.role/provider
 :actions [{:name :action/stripe-create-payout}]
 :from :state/customer-returned
 :to :state/delivered}

{:name :transition/operator-confirm-return-received
 :actor :actor.role/operator
 :actions [{:name :action/stripe-create-payout}]
 :from :state/customer-returned
 :to :state/delivered}

;; Auto-confirm return after 14 days (optional safety net)
{:name :transition/auto-confirm-return-received
 :at {:fn/plus [{:fn/timepoint [:time/first-entered-state :state/customer-returned]}
                {:fn/period ["P14D"]}]}
 :actions [{:name :action/stripe-create-payout}]
 :from :state/customer-returned
 :to :state/delivered}
```

---

## Requirement 2: Stripe Card Holds

### Overview
For security deposits, we need a **separate transaction process** because:
- A single Sharetribe transaction can only have ONE PaymentIntent
- Deposits require a separate PaymentIntent with manual capture mode
- The deposit needs to be held for up to 7 days and either released or captured

### New Process: rental-deposit

Create a new transaction process called `rental-deposit` with these characteristics:

### States

| State | Description |
|-------|-------------|
| `state/pending-payment` | Payment is being processed |
| `state/deposit-held` | Deposit is pre-authorized (held on card) |
| `state/deposit-released` | Deposit was released back to customer |
| `state/deposit-captured` | Deposit was charged (item damaged/not returned) |
| `state/payment-expired` | Authorization expired (after 7 days without action) |

### Transitions

| Transition | Actor | From State | To State | Description |
|------------|-------|------------|----------|-------------|
| `transition/request-deposit` | Customer | (initial) | `pending-payment` | Initiate deposit hold |
| `transition/confirm-deposit` | System | `pending-payment` | `deposit-held` | Stripe confirms pre-auth |
| `transition/release-deposit` | Provider | `deposit-held` | `deposit-released` | Release deposit (outfit returned OK) |
| `transition/operator-release-deposit` | Operator | `deposit-held` | `deposit-released` | Operator releases deposit |
| `transition/capture-deposit` | Provider | `deposit-held` | `deposit-captured` | Capture deposit (damage/loss) |
| `transition/operator-capture-deposit` | Operator | `deposit-held` | `deposit-captured` | Operator captures deposit |
| `transition/auto-capture-deposit` | System | `deposit-held` | `deposit-captured` | Auto-capture before 7-day expiry |
| `transition/expire-deposit` | System | `deposit-held` | `payment-expired` | Authorization expired |

### Process.edn for rental-deposit

```clojure
{:format :v3
 :transitions
 [{:name :transition/request-deposit
   :actor :actor.role/customer
   :actions [{:name :action/create-pending-booking}
             {:name :action/privileged-set-line-items}
             {:name :action/stripe-create-payment-intent
              :config {:capture-method :manual}}]
   :to :state/pending-payment
   :privileged? true}

  {:name :transition/confirm-deposit
   :actor :actor.role/operator
   :actions [{:name :action/accept-booking}]
   :from :state/pending-payment
   :to :state/deposit-held}

  ;; Release deposit - refunds the pre-authorization
  {:name :transition/release-deposit
   :actor :actor.role/provider
   :actions [{:name :action/stripe-refund-payment}
             {:name :action/calculate-full-refund}]
   :from :state/deposit-held
   :to :state/deposit-released}

  {:name :transition/operator-release-deposit
   :actor :actor.role/operator
   :actions [{:name :action/stripe-refund-payment}
             {:name :action/calculate-full-refund}]
   :from :state/deposit-held
   :to :state/deposit-released}

  ;; Capture deposit - charges the card
  {:name :transition/capture-deposit
   :actor :actor.role/provider
   :actions [{:name :action/stripe-capture-payment-intent}]
   :from :state/deposit-held
   :to :state/deposit-captured}

  {:name :transition/operator-capture-deposit
   :actor :actor.role/operator
   :actions [{:name :action/stripe-capture-payment-intent}]
   :from :state/deposit-held
   :to :state/deposit-captured}

  ;; Auto-capture before 7-day authorization expiry
  ;; Set to 6 days, 23 hours, 50 minutes for safety margin
  {:name :transition/auto-capture-deposit
   :at {:fn/plus [{:fn/timepoint [:time/first-entered-state :state/deposit-held]}
                  {:fn/period ["P6DT23H50M"]}]}
   :actions [{:name :action/stripe-capture-payment-intent}]
   :from :state/deposit-held
   :to :state/deposit-captured}

  ;; Expire if payment wasn't confirmed
  {:name :transition/expire-deposit
   :at {:fn/plus [{:fn/timepoint [:time/first-entered-state :state/pending-payment]}
                  {:fn/period ["P1D"]}]}
   :actions [{:name :action/decline-booking}
             {:name :action/calculate-full-refund}
             {:name :action/stripe-refund-payment}]
   :from :state/pending-payment
   :to :state/payment-expired}]}
```

### Deposit Amount Calculation

The deposit amount should be the **full RRP (Recommended Retail Price)** of the item. This is stored in the listing's `publicData.rrp` field.

In your line items calculation (server-side), you'll need to:
1. Fetch the listing's RRP from `publicData`
2. Create a line item for the deposit amount
3. Use this for the deposit transaction

---

## How to Make These Changes

### Step 1: Access Sharetribe Console
1. Go to [Sharetribe Console](https://console.sharetribe.com/)
2. Log in with your admin credentials
3. Select your marketplace

### Step 2: Navigate to Transaction Processes
1. Click on **Build** in the left sidebar
2. Click on **Transaction processes**

### Step 3: Modify default-booking Process
1. Click on **default-booking**
2. Click **Edit process**
3. Add the new states and transitions from the Requirement 4 section above
4. Click **Save**
5. Create a new **process alias** (e.g., `default-booking/release-2`)

### Step 4: Create rental-deposit Process (for Requirement 2)
1. Click **Create new process**
2. Name it `rental-deposit`
3. Add the states and transitions from the Requirement 2 section above
4. Click **Save**
5. Create a **process alias** (e.g., `rental-deposit/release-1`)

### Step 5: Test in Dev Environment
1. Use the **Dev** environment first
2. Test all transitions manually
3. Verify Stripe integration works correctly

### Step 6: Deploy to Production
1. After testing, deploy changes to **Production** environment

---

## After Console Changes

Once the Console changes are made, we can implement the frontend code:

### For Requirement 4 (Sent/Returned Buttons):
1. Update `src/transactions/transactionProcessBooking.js` with new states/transitions
2. Update `src/containers/TransactionPage/TransactionPage.stateDataBooking.js` with button configs
3. Add translation keys for new buttons and messages
4. Test the full flow

### For Requirement 2 (Deposits):
1. Create `src/transactions/transactionProcessDeposit.js`
2. Create API endpoint for initiating deposit transactions
3. Modify checkout flow to create both rental and deposit transactions
4. Update TransactionPage to show deposit status
5. Test the full flow

---

## Important Notes

### 7-Day Authorization Limit
- Stripe pre-authorizations expire after **7 days**
- The `auto-capture-deposit` transition is set to fire at 6 days, 23 hours, 50 minutes
- This gives a 10-minute safety margin before expiry

### Edge Cases to Handle
1. **Late returns**: If customer doesn't return within 7 days, deposit is auto-captured
2. **Damaged items**: Provider can manually capture deposit
3. **Good returns**: Provider releases deposit when item returned in good condition
4. **Disputes**: Use operator transitions for manual intervention

### Email Notifications
After implementing the process changes, you should also configure email notifications for:
- When provider marks item as sent
- When customer confirms receipt
- When customer marks item as returned
- When deposit is released
- When deposit is captured

These can be configured in **Sharetribe Console → Build → Email notifications**.

---

## Questions?

If you need help with any of these changes, please:
1. Check [Sharetribe Flex documentation](https://www.sharetribe.com/docs/)
2. Contact Sharetribe support
3. Ask in the Sharetribe community forums




