const express = require('express');
const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

async function startStaticServer(port = 3000) {
  const app = express();
  // Serve all files in the repository root (adjust if needed)
  app.use(express.static(__dirname));
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`Static server running at http://localhost:${port}`);
      resolve(server);
    });
  });
}

async function generatePDF() {
  // Start a local server so your HTML pages (which reference menu.json relatively) work correctly
  const port = 3000;
  const server = await startStaticServer(port);

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const pdfDocuments = [];

  // Update these URLs to point to your locally served HTML files
  const urls = [
    `http://localhost:${port}/signature.html`,
    `http://localhost:${port}/flights.html`,
    `http://localhost:${port}/cocktails.html`,
    `http://localhost:${port}/beer.html`,
    `http://localhost:${port}/food-1.html`,
    `http://localhost:${port}/food-2.html`
  ];

  for (const url of urls) {
    const page = await browser.newPage();
    console.log(`Loading URL: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle0' });
    console.log(`Generating PDF for ${url}...`);
    const pdfBuffer = await page.pdf({
      format: 'letter', // 8.5 x 11 inches
      printBackground: true,
      scale: 1.33,
      margin: {
        top: '0in',
        right: '0in',
        bottom: '0in',
        left: '0in',
      },
    });
    pdfDocuments.push(await PDFDocument.load(new Uint8Array(pdfBuffer)));
    await page.close();
  }

  const combinedPdf = await PDFDocument.create();
  // Copy all pages from each document into one combined PDF
  for (const pdfDoc of pdfDocuments) {
    const copiedPages = await combinedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
    copiedPages.forEach((page) => combinedPdf.addPage(page));
  }
  const combinedPdfBytes = await combinedPdf.save();

  await browser.close();
  server.close(); // Shut down the static server

  return combinedPdfBytes;
}

async function main() {
  try {
    const pdfBytes = await generatePDF();
    fs.writeFileSync('menu.pdf', pdfBytes);
    console.log('PDF generated and saved as menu.pdf');
  } catch (error) {
    console.error('Error generating PDF:', error);
    process.exit(1);
  }
}

main();
