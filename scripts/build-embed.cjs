/* Copyright 2026 AIDevKSH. Licensed under the Apache License, Version 2.0. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const inlineScript = source => source.replace(/<\/script/gi, '<\\/script');
const css = `${read('assets/style.css').trim()}\n\n${read('assets/embed.css').trim()}`;
if (/<\/style/i.test(css)) throw new Error('Styles must not contain a closing HTML style tag.');
let html = read('index.html')
  .replace('<body>', '<body class="embed-report">')
  .replace(/\n\s*<aside class="toc"[\s\S]*?<\/aside>\n/, '\n')
  .replace(/\n\s*<nav class="nav-links"[\s\S]*?<\/nav>/, '')
  .replace(/<link rel="icon"[^>]+>/, () => `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,${encodeURIComponent(read('assets/favicon.svg').trim())}">`)
  .replace('<link rel="stylesheet" href="assets/style.css">', () => `<style>\n${css}\n</style>`)
  .replace(/\n\s*<script src="assets\/(?:visuals|report)\.js" defer><\/script>/g, '')
  .replace('href="LICENSE"', 'href="https://github.com/aidevksh/Navier-Stokes_Equations/blob/main/LICENSE"')
  .replace('</body>', () => `<script>\n${inlineScript(read('assets/visuals.js').trim())}\n</script>\n<script>\n${inlineScript(read('assets/report.js').trim())}\n</script>\n</body>`);
html = html.replace('<head>', '<head>\n  <!-- Single-file iframe edition. Generated with npm run build:embed. Apache-2.0. -->');
const destination = path.join(root, 'embed.html');
if (process.argv.includes('--check')) {
  if (!fs.existsSync(destination) || read('embed.html') !== html) {
    console.error('embed.html is out of date. Run npm run build:embed and commit the result.');
    process.exitCode = 1;
  } else console.log('PASS: embed.html matches its source report, styles, and scripts.');
} else {
  fs.writeFileSync(destination, html);
  console.log(`Built embed.html (${Buffer.byteLength(html).toLocaleString('en-US')} bytes; no external rendering assets).`);
}
