import { readFile, writeFile, rename } from 'node:fs/promises';
import { generateFourthStreetPdf, fourthStreetHtml } from '../src/lib/server/fourth-street-pdf';
async function main() {
  const payload = JSON.parse(await readFile('menu.json', 'utf8'));
  const menu = payload.menu ?? payload;
  for (const key of ['signature', 'flights', 'cocktails', 'beer', 'food-1', 'food-2'])
    if (!menu[key]?.categories) throw new Error(`Missing menu section: ${key}`);
  const { pdf, issues } = await generateFourthStreetPdf(menu);
  await writeFile('menu.pdf.tmp', pdf);
  await rename('menu.pdf.tmp', 'menu.pdf');
  if (process.argv.includes('--html')) await writeFile('menu-preview.html', await fourthStreetHtml(menu));
  console.log(JSON.stringify({ output: 'menu.pdf', bytes: pdf.length, issues }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
