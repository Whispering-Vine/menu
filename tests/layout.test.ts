import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
import { fourthStreetHtml } from '../src/lib/server/fourth-street-pdf';

test('flight rows flow independently and gluten-free markers use the original SVG', async () => {
  const payload = JSON.parse(await readFile('menu.json', 'utf8'));
  const menu = payload.menu ?? payload;
  const options = process.env.CHROME_EXECUTABLE_PATH
    ? { executablePath: process.env.CHROME_EXECUTABLE_PATH }
    : process.platform === 'darwin'
      ? { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' }
      : await import('@sparticuz/chromium').then(async ({ default: chromium }) => ({ executablePath: await chromium.executablePath(), args: chromium.args }));
  const browser = await puppeteer.launch({ ...options, headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(await fourthStreetHtml(menu));
    await page.emulateMediaType('print');
    await page.evaluate(() => document.fonts.ready);
    const actual = await page.evaluate(() => {
      const chardonnay = Array.from(document.querySelectorAll('.flight'))
        .find(flight => flight.querySelector('.flight-heading .name')!.textContent === 'Chardonnay Flight')!;
      const rows = Array.from(chardonnay.querySelectorAll('.flight-wine'));
      const before = rows.map(row => row.getBoundingClientRect().top - chardonnay.getBoundingClientRect().top);
      const gap = rows[2].getBoundingClientRect().top - rows[1].getBoundingClientRect().bottom;
      const right = document.querySelector('.flights-grid > div:last-child .flight-wine')!;
      const height = right.getBoundingClientRect().height;
      right.querySelector('.description')!.textContent = 'Long description with multiple wine regions and coastal vineyards '.repeat(3);
      const after = rows.map(row => row.getBoundingClientRect().top - chardonnay.getBoundingClientRect().top);
      const icons = Array.from(document.querySelectorAll('.badge.gf'));
      return { gap, before, after, height, wrappedHeight: right.getBoundingClientRect().height,
        icons: icons.map(icon => ({ tag: icon.tagName, label: icon.getAttribute('aria-label'), path: icon.querySelector('path')?.getAttribute('d') })),
        hasLegend: !!document.querySelector('.food-legend svg.gf') };
    });
    assert.ok(Math.abs(actual.gap) < 1, 'no blank line before the final Chardonnay');
    assert.ok(actual.wrappedHeight > actual.height, 'right-column description wraps');
    assert.deepEqual(actual.after, actual.before, 'right-column wrapping leaves left wine spacing unchanged');
    const path = (await readFile('images/no-gluten.svg', 'utf8')).match(/<path d="([^"]+)"/)![1];
    assert.ok(actual.icons.length > 1);
    assert.ok(actual.hasLegend);
    for (const icon of actual.icons) {
      assert.equal(icon.tag, 'svg');
      assert.equal(icon.label, 'Gluten free');
      assert.equal(icon.path, path);
    }
  } finally {
    await browser.close();
  }
});
