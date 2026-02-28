const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    page.on('pageerror', err => {
        console.log('PAGE ERROR:', err.toString());
    });

    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log('CONSOLE ERROR:', msg.text());
        }
    });

    try {
        await page.goto('http://localhost:3001/dashboard', { waitUntil: 'networkidle0' });
        console.log('Page loaded successfully');
    } catch (err) {
        console.log('NAVIGATION ERROR:', err.toString());
    }

    await browser.close();
})();
