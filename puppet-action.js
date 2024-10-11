const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

async function generatePDF() {
    const browser = await puppeteer.launch();
    const pdfDocuments = [];

    const urls = [
        `https://kyles-awesome-site-952238.webflow.io/signature`,
        `https://kyles-awesome-site-952238.webflow.io/flights`,
        `https://kyles-awesome-site-952238.webflow.io/cocktails`,
        `https://kyles-awesome-site-952238.webflow.io/beer`,
        `https://kyles-awesome-site-952238.webflow.io/food-1`,
        `https://kyles-awesome-site-952238.webflow.io/food-2`
    ];

    for (const url of urls) {
        const page = await browser.newPage();

        console.log(`Loading URL: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle0' });

        console.log(`Generating PDF for ${url}...`);
        const pdfBuffer = await page.pdf({
            width: '612px',
            height: '792px',
            printBackground: true,
            margin: {
                top: 1,
                right: 1,
                bottom: 1,
                left: 1,
            },
        });

        const uint8Array = new Uint8Array(pdfBuffer);
        pdfDocuments.push(await PDFDocument.load(uint8Array));
        await page.close();
    }

    const combinedPdf = await PDFDocument.create();

    for (const pdfDoc of pdfDocuments) {
        const [copiedPage] = await combinedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        combinedPdf.addPage(copiedPage);
    }

    const combinedPdfBytes = await combinedPdf.save();
    await browser.close();

    return combinedPdfBytes; // Return the combined PDF bytes
}

async function main() {
    try {
        const pdfBytes = await generatePDF();
        fs.writeFileSync('output.pdf', pdfBytes); // Save the PDF to the repository
        console.log('PDF generated and saved as output.pdf');
    } catch (error) {
        console.error('Error generating PDF:', error);
        process.exit(1); // Exit with error code
    }
}

main();
