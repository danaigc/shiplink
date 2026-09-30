# Stripe Checkout playbook

Use this reference for hosted Stripe Checkout and similar Stripe card forms during `publish-backlinks`. Keep payment authorization rules from `AGENTS.md` and [publishing-safety.md](publishing-safety.md). This file only speeds up a checkout that is already authorized.

## When to use

- Merchant redirects to `https://checkout.stripe.com/c/pay/cs_live_...`
- Or a same-page Stripe card form exposes fields such as `cardNumber`, `cardExpiry`, `cardCvc`, `billingName`, `billingCountry`, `billingPostalCode`
- The selected plan is already confirmed as one-time, within the authorized budget, and free of subscription/trial/upsell behavior

## Fast path

1. Close or ignore expired checkout tabs. An old `cs_live_...` page that shows "Something went wrong" / "could not be found" is dead. Return to the merchant page and create a fresh checkout.
2. Keep only the newest live checkout tab plus any merchant success tab you need for evidence.
3. Confirm the live total, currency, merchant name, line items, and that add-ons are `$0` or absent.
4. Fill card fields with the native value-setter path below. Do not spend time on accessibility-tree country lists.
5. Re-read the total and Pay button once.
6. Click the final Pay / Submit button exactly once.
7. Wait for either the merchant thank-you page or a clear Stripe error. Prefer merchant confirmation over the intermediate Stripe page.
8. Capture: final URL, Stripe `cs_live_...` session id when present, amount, currency, tool/target identity, and a screenshot or receipt note.
9. Append the publication event and keep the thank-you tab for review.

## Preferred field fill

Hosted Checkout fields often ignore plain click/type or `Input.insertText` until the field's React/Stripe state is updated. Prefer this order:

1. Ensure the intended country is selected first when address/postal fields depend on it.
2. For each text/card input, use the element prototype value setter, then dispatch `input` and `change`.
3. For `<select name="billingCountry">`, set `selectedIndex` / `value` to the intended country code and dispatch `input` + `change`.
4. Re-read `.value` for every required field before paying.
5. If a value-setter pass fails, fall back once to focus + `Input.insertText`. If that also fails, hand off rather than looping.

Recommended field names on hosted Checkout:

- `cardNumber`
- `cardExpiry` as `MMYY` or `MM / YY`
- `cardCvc`
- `billingName`
- `billingCountry` as ISO code such as `US`
- `billingPostalCode` and, when shown, address line/city/state fields

Do not paste real card numbers into tracked skill files, chat summaries, or shared docs. Read them from the task's ignored `private/payment.local.json` only when filling.

## Country select pitfalls

- The accessibility snapshot may dump every country option as visible text even when the control is not "open".
- Trust the selected value, selected option text, and a screenshot more than the option list in `snapshotText`.
- If the country is already correct, do not reopen the select just to "fix" it.
- Opening the select and trying typeahead/search is a common source of wasted time.


## Merchant API / JS completion

Some directories create Stripe sessions through their own API instead of a static Payment Link. When the UI submit path is flaky and the user has authorized API/JS completion, use this order:

1. Stay inside the already-authenticated Ego session for that merchant.
2. Read the live page bundle / RSC payload for the exact checkout route, price object, metadata shape, and success/cancel paths. Do not guess price IDs when the page already exposes them.
3. Patch `fetch` / `XMLHttpRequest` once, then trigger the real submit handler or replay the exact request body the page would send.
4. Accept a session only when the response contains a usable Stripe `sessionId` / checkout URL and the amount/plan still match authorization.
5. If the merchant API returns a generic failure such as `Unable to create checkout session` for the approved one-time price, treat it as a merchant-side processor outage. Probe one alternate one-time price only to classify the failure; do not pay a more expensive package as a workaround.
6. Do not loop UI clicks, empty `redirectToCheckout({})` calls, or repeated checkout POSTs after the first clear merchant error.

### TopTool-specific notes

- Submit page: `https://www.toptool.app/en/submit`
- Google OAuth via Supabase is the reliable login path; email confirmation previously 500'd.
- Read the current priority package price object from RSC, including its `id`, `type`, `currency`, and `unit_amount`; do not reuse an identifier or amount from a past checkout.
- Page checkout call shape: `POST /api/stripe/checkout-session` with body `{price, src:"en/dashboard", metadata:{website,type:"submit_priority",user_id,slug}, cancelPath:"en/submit"}` then `stripe.redirectToCheckout({sessionId})`
- Slug rule from their bundle: strip protocol/`www.`, take host, replace the first `.` with `-` (`example.com` -> `example-com`)
- Free submit path writes Supabase table `ProductSubmission`. A logged-in REST insert can also create a `submit_priority` row that appears on `/en/dashboard` as `PRIORITY / In review`.
- Important: a `ProductSubmission` insert is a queue/dashboard submission, not proof of Stripe payment. If checkout-session creation is broken, record `STRIPE_CHECKOUT_API_BROKEN` (or equivalent), keep the dashboard evidence, leave payment unauthorized-for-retry, and do not claim the approved charge succeeded.

### React form / disabled-submit traps

- `react-hook-form` may keep Submit visually enabled while its submit path still depends on registered field state. Prefer real keyboard/input events or the page's own `onClick`/`onSubmit` handler after confirming the website value.
- Synthetic clicks can reach `stripe.redirectToCheckout` with empty args when the preceding checkout POST failed or returned no `sessionId`. Always inspect the checkout API response before treating empty redirect args as a pure gesture problem.
- For Next.js app-router pages, RSC (`text/x-component`) is often the fastest way to recover live `price` props without hunting minified chunk constants.

## Merchant pre-checkout steps

Some directories gate Stripe behind a verify step:

1. Fill email / tool name / website on the merchant form.
2. Complete any `Verify` / `Confirm & Verify` step until the Pay button enables.
3. Only then click Pay to open Stripe.
4. If Pay opens no new live checkout, inspect for a new tab, popup, or same-tab navigation. Do not hammer Pay repeatedly.
5. If the first checkout session expires before payment, regenerate from the merchant page instead of reloading the dead Stripe URL.

## Success and failure signals

Success examples:

- Merchant thank-you page with `Payment Confirmed`, order/submission id, or `session_id=cs_live_...`
- Stripe receipt / paid state followed by merchant redirect
- Dashboard shows Paid / Submitted for the same tool URL

Failure / stop examples:

- Expired `cs_live_` page
- Card declined or authentication challenge that cannot be completed from stored data
- Total, tax, plan, or subscription wording no longer matches authorization
- Pay click with no receipt and no merchant confirmation: record `unknown`, do not auto-retry payment

## Evidence to store

In the website task records, keep:

- merchant
- plan name
- amount, currency, tax/fees, one-time cadence
- Stripe session id (`cs_live_...`) when available
- merchant thank-you URL
- tool name / target URL / billing email used
- Ego task-space id
- screenshot or receipt path under `artifacts/` when useful

Also append a reusable non-secret summary to `knowledge.local/shared-backlinks.local.jsonl` when the merchant/playbook is useful across projects.

## Timing expectations

- Fresh checkout creation and fill should be short if the value-setter path works.
- After Pay, wait long enough for merchant redirect; do not immediately reopen checkout.
- Listing go-live may lag hours after payment. Payment success is not the same as a public backlink being visible.


## Non-Stripe secure card iframes (Creem / Yuno / similar)

Some merchants use Creem + Yuno (or Airwallex) instead of hosted Stripe Checkout. Billing identity fields may be on the parent page, while PAN/expiry/CVC are inside a cross-origin secure iframe.

Practical rule:

1. Still automate merchant pre-checkout, login, plan selection, and parent-page billing fields.
2. Attempt parent-page keyboard entry once after focusing the card iframe box.
3. If the secure iframe does not accept CDP/OS keystrokes, stop and hand off for human card entry rather than looping.
4. After the user pays successfully, resume only to verify receipt and complete the directory submission form.
5. Record processor name, checkout id/url, amount, and the exact blocker (`SECURE_CARD_IFRAME_INACCESSIBLE`).


## Yuno/Creem card iframe: use Playwright Chromium

For Creem/Yuno hosted checkouts where the card iframe is an out-of-process cross-origin frame that Ego CDP cannot fill, launch a separate Playwright Chromium on the same checkout URL (hosted checkout links usually need no login):

1. `chromium.launch({ headless: false })`, open the checkout URL.
2. Fill merchant billing fields (`#email`, `#name`, country/state selects, address inputs), click Continue.
3. Wait for the zoid `card_form` frame, then locate inputs by autocomplete:
   - `input[autocomplete="cc-number"]`
   - `input[autocomplete="cc-exp"]`
   - `input[autocomplete="cc-csc"]`
4. Wait for `state: 'visible'`, `click()` each, `pressSequentially(...)` values, and re-read `.value` to confirm.
5. Fill parent `input[name="cardHolderName"]`, verify total, click the Pay button once.
6. Capture the merchant thank-you/return URL and order id.

This path has completed a Creem `ch_...` checkout. Keep real checkout and order identifiers only in ignored task evidence. Do not retry payment automatically if the result is ambiguous.


## Fast path for Creem/Yuno: script first, no Ego fighting

Do NOT spend time trying to fill Creem/Yuno card iframes with Ego CDP, OS keyboards, zoid postMessage, or new Yuno SDK instances — all of these were tried and failed on a live checkout (session hangs, empty values, cross-origin OOPIF errors, NULL_HEADER API errors). Go straight to the Playwright script:

```
node .agents/skills/publish-backlinks/scripts/pay-creem-checkout.mjs <checkoutUrl> <expectedAmountRegex>
```

with `PAY_*` env vars sourced from the task's ignored `private/payment.local.json` (never commit real values). Expected runtime: about one minute end-to-end, including billing, card fill, one Pay click, and order-id capture.

Creem-specific facts to reuse:

- Hosted checkout URLs (`creem.io/checkout/<product>/<ch_...>`) need no login.
- Two steps: billing identity (`#email`, `#name`, country/state selects, address inputs) then card payment.
- Card fields render asynchronously in the zoid `card_form` frame; wait for at least 3 inputs, then fill by `autocomplete` with `pressSequentially`.
- Success page shows `Thank you for your payment!` and `Order No: ORD-...`; merchant redirect follows after a few seconds.
- Verify any purchased plan points/credits in the approved merchant account and store the observation in ignored task evidence.
