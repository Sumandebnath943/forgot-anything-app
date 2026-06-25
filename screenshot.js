import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true }); // iPhone 12 Pro dimensions

  console.log('Navigating to app...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

  console.log('Taking Splash screenshot...');
  await page.reload();
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: 'C:/Users/Admin/.gemini/antigravity/brain/b07e415d-e89d-48d0-a2bd-c8adfda607b4/splash_screenshot.png' });

  console.log('Taking Setup screenshot...');
  // The setup might only show on Android user agent, let's emulate Android!
  await page.setUserAgent('Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36');
  
  await page.evaluate(() => {
    localStorage.removeItem('forgetmenot_setup_v2_complete');
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: 'C:/Users/Admin/.gemini/antigravity/brain/b07e415d-e89d-48d0-a2bd-c8adfda607b4/setup_screenshot.png' });

  console.log('Taking Home screenshot...');
  await page.evaluate(() => {
    localStorage.setItem('forgetmenot_setup_v2_complete', 'true');
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 3000)); // wait for splash to finish
  await page.screenshot({ path: 'C:/Users/Admin/.gemini/antigravity/brain/b07e415d-e89d-48d0-a2bd-c8adfda607b4/home_screenshot.png' });

  await browser.close();
  console.log('Done!');
})();
