/* Copyright 2026 AIDevKSH. Licensed under the Apache License, Version 2.0. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const isolated = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-embed-'));
const html = fs.readFileSync(path.join(root, 'embed.html'), 'utf8');
const file = path.join(isolated, 'report.html');
fs.writeFileSync(file, html);
const artifacts = path.join(root, 'artifacts');
fs.mkdirSync(artifacts, { recursive: true });
const chrome = process.env.NS_BROWSER_EXECUTABLE || (process.platform === 'darwin'
  && fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
  ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined);

(async () => {
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 950 }, reducedMotion: 'reduce' });
    const errors = [], requests = [];
    context.on('page', p => p.on('pageerror', e => errors.push(e.message)));
    context.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
    await context.route(/^https?:/, route => route.abort());
    const page = await context.newPage();
    await page.goto(pathToFileURL(file).href);
    await page.waitForFunction(() => window.NSViz?.instances.vortex);
    assert.equal(await page.locator('aside, .toc, .toc-link, .nav-links').count(), 0, 'Embed must have no table of contents');
    assert.equal(await page.locator('script[src], link[rel="stylesheet"]').count(), 0, 'CSS and JS must be inline');
    assert.equal(await page.locator('math').count(), 8);
    assert.equal(await page.locator('canvas').count(), 4);
    // The report is copied away from all other project files and must still run.
    await page.locator('#stretch').evaluate(el => { el.value = '1'; el.dispatchEvent(new Event('input')); });
    assert.equal((await page.locator('#vortex-stats strong').allTextContents())[2], '1.000');
    await page.locator('#time-slider').evaluate(el => { el.value = '.99'; el.dispatchEvent(new Event('input')); });
    assert.equal(Number((await page.locator('#blowup-values strong').allTextContents())[0]), 100);

    // Real iframe viewport: the outer blog stays wide while the report is narrow.
    await page.setContent('<!doctype html><html><body style="margin:0"><iframe name="report" title="나비에–스토크스 리포트" style="display:block;border:0;height:900px" sandbox="allow-scripts allow-popups"></iframe></body></html>');
    await page.locator('iframe').evaluate((el, source) => { el.srcdoc = source; }, html);
    const frame = page.frame({ name: 'report' });
    await frame.waitForFunction(() => window.NSViz?.instances.vortex);
    for (const width of [320, 375, 600, 760]) {
      await page.locator('iframe').evaluate((el, w) => { el.style.width = `${w}px`; }, width);
      await frame.waitForFunction(w => window.innerWidth === w, width);
      const layout = await frame.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        bodyWidth: document.querySelector('.report').getBoundingClientRect().width,
        columns: getComputedStyle(document.querySelector('.report-grid')).display,
      }));
      assert(!layout.overflow, `No whole-page horizontal overflow in ${width}px iframe`);
      assert(layout.bodyWidth >= width - 52 && layout.bodyWidth <= width, `Use narrow iframe width at ${width}px`);
      assert.equal(layout.columns, 'block', 'Report must use one column');
      await frame.locator('#vortex3d').scrollIntoViewIfNeeded();
      await frame.locator('#vortex3d').focus();
      const yaw = await frame.evaluate(() => NSViz.instances.vortex.yaw);
      await page.keyboard.press('ArrowRight');
      assert((await frame.evaluate(() => NSViz.instances.vortex.yaw)) > yaw, '3D keyboard interaction must work inside iframe');
      if (width === 320 || width === 600) {
        await frame.locator('#vortex3d').screenshot({ path: path.join(artifacts, `embed-vortex-${width}.png`) });
        await frame.evaluate(() => scrollTo(0, 0));
        await page.locator('iframe').screenshot({ path: path.join(artifacts, `embed-${width}.png`) });
      }
    }
    assert.deepEqual(requests, [], 'Single file must make no external rendering requests');
    assert.deepEqual(errors, [], 'No iframe runtime errors');
    console.log('PASS: isolated single file; no TOC/external assets; 320/375/600/760px iframes; equations; interactive charts and 3D.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => fs.rmSync(isolated, { recursive: true, force: true }));
