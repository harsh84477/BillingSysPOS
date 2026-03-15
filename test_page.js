import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`PAGE LOG [${msg.type()}]:`, msg.text());
  });
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });

  try {
    await page.goto('http://localhost:8080/settings?tab=print', { waitUntil: 'networkidle0', timeout: 20000 });
  } catch (err) {
    console.error("Navigation error:", err.message);
  }
  
  await browser.close();
  process.exit(0);
})();
