/**
 * Renders the three CrazyGames cover sizes into ./covers
 *   npx vite --port 5199 &  then  node scripts/render-covers.mjs
 */
import { chromium } from 'playwright';
const base = process.env.URL || 'http://127.0.0.1:5199';
const sizes = [
  ['landscape-1920x1080', 1920, 1080],
  ['portrait-800x1200', 800, 1200],
  ['square-800x800', 800, 800],
];
const b = await chromium.launch({
  executablePath: process.env.CHROME || undefined,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
for (const [name, w, h] of sizes) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto(`${base}/cover.html?w=${w}&h=${h}`);
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `covers/cover-${name}.png` });
  await p.close();
}
await b.close();
console.log('covers written');
