import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { PDFDocument, PDFDict, PDFName } from 'pdf-lib';
import { generateFourthStreetPdf } from '../src/lib/server/fourth-street-pdf';

test('generated menu is six letter pages with all text in embedded TrueType fonts', async () => {
  const pdf = await PDFDocument.load(await readFile('menu.pdf'));
  assert.equal(pdf.getPageCount(), 6);
  for (const page of pdf.getPages()) assert.deepEqual(page.getSize(), { width: 612, height: 792 });
  const fonts = pdf.context.enumerateIndirectObjects().map(([, value]) => value).filter((value): value is PDFDict => value instanceof PDFDict && value.get(PDFName.of('Type'))?.toString() === '/Font');
  assert.ok(fonts.length > 0);
  assert.ok(fonts.every(font => font.get(PDFName.of('Subtype'))?.toString() !== '/Type3'));
  const faces = fonts.filter(font => font.get(PDFName.of('Subtype'))?.toString() === '/CIDFontType2');
  assert.equal(faces.length, 5);
  for (const font of faces) assert.ok(font.lookup(PDFName.of('FontDescriptor'), PDFDict).has(PDFName.of('FontFile2')));
});

test('overflowing edits fail instead of publishing a clipped menu', async () => {
  const { menu } = JSON.parse(await readFile('menu.json', 'utf8'));
  menu['food-2'].categories.mains.items[0].description = 'This text cannot fit on the menu. '.repeat(300);
  await assert.rejects(() => generateFourthStreetPdf(menu), /exceeds|does not fit/);
});
