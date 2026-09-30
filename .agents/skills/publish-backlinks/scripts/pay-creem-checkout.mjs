#!/usr/bin/env node
/**
 * Fast Creem/Yuno checkout payment. Store real order IDs only in ignored task evidence.
 *
 * Usage:
 *   node pay-creem-checkout.mjs <checkoutUrl> [expectedAmountRegex]
 *
 * Env (never hardcode real values in repo):
 *   PAY_CARD_NUMBER, PAY_CARD_EXP (MMYY), PAY_CARD_CVC, PAY_CARD_NAME,
 *   PAY_EMAIL, PAY_ADDRESS_LINE1, PAY_CITY, PAY_POSTAL, PAY_COUNTRY (ISO, default US), PAY_STATE
 *
 * What it does:
 *   1. Opens the hosted Creem checkout in Playwright Chromium (no login needed).
 *   2. Fills billing identity (email/name/country/address) if the step exists.
 *   3. Continues to payment, waits for the zoid card_form frame, fills
 *      cc-number / cc-exp / cc-csc via autocomplete selectors with pressSequentially.
 *   4. Re-reads values, clicks Pay once, waits for the merchant thank-you/return page,
 *      and prints the order id to stdout.
 *
 * Safety: verifies the live total matches expectedAmountRegex (default /\\$/ any) before paying.
 */
import { chromium } from 'playwright';

const url = process.argv[2];
const amountRe = new RegExp(process.argv[3] || '\\$');
if (!url) { console.error('usage: node pay-creem-checkout.mjs <checkoutUrl> [amountRegex]'); process.exit(2); }

const need = ['PAY_CARD_NUMBER','PAY_CARD_EXP','PAY_CARD_CVC','PAY_CARD_NAME','PAY_EMAIL'];
for (const k of need) if (!process.env[k]) { console.error('missing env ' + k); process.exit(2); }

const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
const page = await ctx.newPage();

try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);

  // Billing step if present
  if (await page.locator('#email').count()) {
    await page.fill('#email', process.env.PAY_EMAIL);
    await page.fill('#name', process.env.PAY_CARD_NAME);
    const selects = page.locator('select');
    if (await selects.count()) {
      await selects.nth(0).selectOption(process.env.PAY_COUNTRY || 'US');
      await page.waitForTimeout(800);
    }
    if (await page.locator('input[name="addressLine1"]').count()) {
      await page.fill('input[name="addressLine1"]', process.env.PAY_ADDRESS_LINE1 || '');
      await page.fill('input[name="city"]', process.env.PAY_CITY || '');
      await page.fill('input[name="postalCode"]', process.env.PAY_POSTAL || '');
      if (process.env.PAY_STATE) { try { await selects.nth(1).selectOption(process.env.PAY_STATE); } catch {} }
    }
    await page.locator('button', { hasText: /Continue|继续付款/i }).first().click();
    await page.waitForTimeout(4000);
  }

  // Card frame: zoid names are __zoid__card_form__..., title is card_form
  let cardFrame = null;
  for (let i = 0; i < 40; i++) {
    const frames = page.frames();
    cardFrame = frames.find(f => {
      const name = f.name() || '';
      const url = f.url() || '';
      return /card_form|card-form|y\.uno|sdk-web-card/i.test(name + ' ' + url);
    });
    if (cardFrame && (await cardFrame.locator('input').count().catch(() => 0)) >= 1) break;
    await page.waitForTimeout(500);
  }
  if (!cardFrame) {
    const names = page.frames().map(f => ({name:f.name(), url:f.url()}));
    console.error(JSON.stringify({frames: names}, null, 2));
  }
  if (!cardFrame) throw new Error('card_form frame not found');

  const pan = cardFrame.locator('input[autocomplete="cc-number"]');
  const exp = cardFrame.locator('input[autocomplete="cc-exp"]');
  const cvc = cardFrame.locator('input[autocomplete="cc-csc"]');
  await pan.waitFor({ state: 'visible', timeout: 15000 });
  await pan.click(); await pan.pressSequentially(process.env.PAY_CARD_NUMBER, { delay: 30 });
  await exp.click(); await exp.pressSequentially(process.env.PAY_CARD_EXP, { delay: 40 });
  await cvc.click(); await cvc.pressSequentially(process.env.PAY_CARD_CVC, { delay: 40 });

  const holder = page.locator('input[name="cardHolderName"]');
  if (await holder.count()) await holder.fill(process.env.PAY_CARD_NAME);

  const body = await page.locator('body').innerText();
  if (!amountRe.test(body)) throw new Error('live total does not match expected amount: ' + amountRe);

  await page.locator('button', { hasText: /Pay|支付/i }).first().click();
  await page.waitForTimeout(12000);
  const after = await page.locator('body').innerText();
  const order = (after.match(/Order No:\s*([A-Z0-9-]+)/i) || [])[1] || null;
  console.log(JSON.stringify({ ok: /thank you|payment/i.test(after), orderId: order, url: page.url(), head: after.slice(0, 300) }));
} finally {
  await browser.close();
}
