const { chromium, devices } = require('playwright');
(async () => {
  const [url, out, mode, wait] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = mode === 'mobile' ? await b.newContext({ ...devices['iPhone 13'] }) : await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on('console', m => { if (m.type() === 'error' || m.type()==='warning') console.log('console:', m.text().slice(0, 300)) });
  p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.goto(url);
  await p.waitForTimeout(+(wait || 8000));
  await p.screenshot({ path: out });
  await b.close();
})();
