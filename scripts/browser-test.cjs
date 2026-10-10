/* Copyright 2026 AIDevKSH. Licensed under the Apache License, Version 2.0. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const artifacts = path.join(root, 'artifacts');
fs.mkdirSync(artifacts, { recursive: true });
const chrome = process.env.NS_BROWSER_EXECUTABLE || (process.platform === 'darwin'
  && fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
  ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined);

(async () => {
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const errors = [];
    context.on('page', p => p.on('pageerror', err => errors.push(err.message)));
    await context.route(/^https?:/, route => route.abort());
    const page = await context.newPage();
    await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
    await page.waitForFunction(() => window.NSViz && document.querySelector('#vortex-stats strong'));
    assert.equal(await page.locator('html').getAttribute('lang'), 'ko');
    assert.equal(await page.locator('math').count(), 8);
    assert.equal(await page.evaluate(() => NSViz.instances.flow.playing), false, 'Reduced motion must pause flow');
    const input = async (id, value) => page.locator(`#${id}`).evaluate((el, v) => {
      el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
    await page.locator('#blowup-chart').scrollIntoViewIfNeeded();
    await input('time-slider', .99);
    assert.equal(await page.locator('#time-value').textContent(), '0.99');
    const blowup = await page.locator('#blowup-values strong').allTextContents();
    assert(Math.abs(Number(blowup[0]) - 100) < .001, 't=.99 must yield 100');
    assert(Number(blowup[1]) < 3 && Number(blowup[2]) < 3, 'Comparison functions stay finite');
    await page.locator('#flow2d').scrollIntoViewIfNeeded();
    await input('swirl', 0); await input('inflow', 0);
    assert.match(await page.locator('#flow-status').textContent(), /정지|없/);
    await page.locator('#flow-reset').click();
    assert.equal(await page.locator('#swirl').inputValue(), '1.4');
    assert.equal(await page.locator('#inflow').inputValue(), '0.35');
    await page.locator('#vortex3d').scrollIntoViewIfNeeded();
    await input('stretch', 1);
    const ratios = await page.locator('#vortex-stats strong').allTextContents();
    assert(Math.abs(Number(ratios[0]) - Math.exp(-1)) < .001);
    assert(Math.abs(Number(ratios[1]) - Math.exp(2)) < .001);
    assert.equal(ratios[2], '1.000', 'Material volume must remain one');
    await page.locator('#vortex3d').focus();
    const before = await page.evaluate(() => NSViz.instances.vortex.yaw);
    await page.keyboard.press('ArrowRight');
    assert((await page.evaluate(() => NSViz.instances.vortex.yaw)) > before, 'Keyboard must rotate 3D camera');
    const box = await page.locator('#vortex3d').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 + 30, { steps: 6 }); await page.mouse.up();
    assert((await page.evaluate(() => NSViz.instances.vortex.yaw)) > before + .15, 'Drag must rotate camera');
    await page.locator('#vortex-reset').click();
    assert.equal(await page.locator('#stretch').inputValue(), '0.35');
    await page.locator('#vortex-toggle').click();
    assert.equal(await page.evaluate(() => NSViz.instances.vortex.auto), true);
    await page.locator('#vortex-toggle').click();
    assert.equal(await page.evaluate(() => NSViz.instances.vortex.auto), false);
    await page.locator('#vortex3d').screenshot({ path: path.join(artifacts, 'vortex-desktop.png') });
    await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
    await page.waitForFunction(() => window.NSViz);
    await page.screenshot({ path: path.join(artifacts, 'desktop.png') });
    await page.pdf({ path: path.join(artifacts, 'report.pdf'), printBackground: true, preferCSSPageSize: true });
    const printed = await page.evaluate(() => [...document.querySelectorAll('canvas')].map(c => {
      const data = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let distinct = false;
      for (let i = 4; i < data.length; i += 40) if (data[i] !== data[0] || data[i + 1] !== data[1]) { distinct = true; break; }
      return distinct;
    }));
    assert(printed.every(Boolean), 'Every canvas must render for print, including offscreen figures');
    for (const width of [375, 768]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
      await page.waitForFunction(() => window.NSViz);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `No page overflow at ${width}px`);
      await page.locator('#vortex3d').scrollIntoViewIfNeeded();
      await input('stretch', 1);
      assert.equal((await page.locator('#vortex-stats strong').allTextContents())[2], '1.000');
      await page.locator('#vortex3d').screenshot({ path: path.join(artifacts, `vortex-${width}.png`) });
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: path.join(artifacts, `mobile-${width}.png`) });
    }
    assert.deepEqual(errors, [], 'No JavaScript runtime errors');
    console.log('PASS: offline HTML, equations, finite-time graph, volume conservation, drag/keyboard, controls, reduced motion, mobile, PDF.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
