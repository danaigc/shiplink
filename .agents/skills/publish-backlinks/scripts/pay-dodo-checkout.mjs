
import { chromium } from 'playwright';
const url = process.argv[2];
if (!url) { console.error('need url'); process.exit(2); }
const need = ['PAY_CARD_NUMBER','PAY_CARD_EXP','PAY_CARD_CVC','PAY_CARD_NAME','PAY_EMAIL'];
for (const k of need) if (!process.env[k]) { console.error('missing '+k); process.exit(2); }
const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
const page = await ctx.newPage();
try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);
  if (await page.locator('input[name="fullName"]').count()) {
    await page.fill('input[name="fullName"]', process.env.PAY_CARD_NAME);
    await page.fill('input[name="email"]', process.env.PAY_EMAIL);
    const country = page.locator('select[name="country"]');
    if (await country.count()) { try { await country.selectOption('US'); } catch {} }
    if (await page.locator('input[name="addressLine"]').count()) {
      await page.fill('input[name="addressLine"]', process.env.PAY_ADDRESS_LINE1 || '');
      await page.fill('input[name="city"]', process.env.PAY_CITY || '');
      await page.fill('input[name="zipCode"]', process.env.PAY_POSTAL || '');
      await page.fill('input[name="state"]', process.env.PAY_STATE || '');
    }
    const cont = page.locator('#step1, button:has-text("继续付款"), button:has-text("Continue")');
    if (await cont.count()) { await cont.first().click(); await page.waitForTimeout(4000); }
  }
  const body = await page.locator('body').innerText();
  if (!/25\.00/.test(body)) throw new Error('amount mismatch: '+body.slice(0,200));
  let cardFrame = null;
  for (let i=0;i<40;i++) {
    cardFrame = page.frames().find(f => /dodo|card|checkout\.html|airwallex|stripe/i.test((f.url()||'')+' '+(f.name()||'')) && /checkout\.html|card/i.test(f.url()||''));
    if (!cardFrame) cardFrame = page.frames().find(f => /checkout\.html/i.test(f.url()||''));
    if (cardFrame && (await cardFrame.locator('input').count().catch(()=>0)) >= 1) break;
    await page.waitForTimeout(500);
  }
  console.log(JSON.stringify({frames: page.frames().map(f => ({name:f.name(), url:f.url()}))}));
  if (cardFrame) {
    const inputs = cardFrame.locator('input');
    const n = await inputs.count();
    console.log('iframe inputs', n);
    const pan = cardFrame.locator('input[autocomplete="cc-number"], input[name*="card"], input[placeholder*="1234"]');
    const exp = cardFrame.locator('input[autocomplete="cc-exp"], input[name*="exp"]');
    const cvc = cardFrame.locator('input[autocomplete="cc-csc"], input[name*="cvc"], input[name*="cvv"]');
    if (await pan.count()) { await pan.first().click(); await pan.first().pressSequentially(process.env.PAY_CARD_NUMBER, {delay:30}); }
    if (await exp.count()) { await exp.first().click(); await exp.first().pressSequentially(process.env.PAY_CARD_EXP, {delay:40}); }
    if (await cvc.count()) { await cvc.first().click(); await cvc.first().pressSequentially(process.env.PAY_CARD_CVC, {delay:40}); }
  }
  const payBtn = page.locator('#submit, button:has-text("立即支付"), button:has-text("Pay now"), button:has-text("Pay")');
  await payBtn.first().click();
  await page.waitForTimeout(12000);
  const after = await page.locator('body').innerText();
  console.log(JSON.stringify({url:page.url(), head: after.slice(0,400)}));
} finally {
  await browser.close();
}
