const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

async function generatePDF() {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
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
            format: 'letter', // This sets the PDF to 8.5 x 11 inches (612 x 792 points)
            printBackground: true, // Include background graphics
            scale: 1.33;
            margin: {
                top: '0in',   // You can adjust this if you need margins
                right: '0in',
                bottom: '0in',
                left: '0in',
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
        fs.writeFileSync('menu.pdf', pdfBytes); // Save the PDF to the repository
        console.log('PDF generated and saved as menu.pdf');
    } catch (error) {
        console.error('Error generating PDF:', error);
        process.exit(1); // Exit with error code
    }
}

main();
