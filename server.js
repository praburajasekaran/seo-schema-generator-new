import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Browser automation endpoint
app.post('/api/scrape', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  let browser = null;
  
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ],
      timeout: 30000
    });

    const page = await browser.newPage();
    
    // Set realistic viewport and user agent
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Set additional headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'DNT': '1'
    });

    // Navigate to the page
    console.log(`Navigating to: ${url}`);
    await page.goto(url, { 
      waitUntil: 'domcontentloaded', 
      timeout: 20000 
    });

    // Wait for potential Cloudflare challenge
    try {
      const isCloudflareChallenge = await page.evaluate(() => {
        return document.title.includes('Just a moment') || 
               document.body.textContent?.includes('Checking your browser') ||
               document.body.textContent?.includes('Verifying you are human');
      });

      if (isCloudflareChallenge) {
        console.log('Detected Cloudflare challenge, waiting for completion...');
        await page.waitForFunction(
          () => !document.title.includes('Just a moment') && 
                !document.body.textContent?.includes('Checking your browser') &&
                !document.body.textContent?.includes('Verifying you are human'),
          { timeout: 15000 }
        );
        console.log('Cloudflare challenge completed');
      }
    } catch (error) {
      console.warn('Cloudflare challenge timeout or error:', error);
    }

    // Extract page title
    const pageTitle = await page.title() || url;

    // Extract existing JSON-LD schemas
    const existingSchemaText = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      return scripts
        .map(script => {
          try {
            const parsed = JSON.parse(script.textContent || '{}');
            return JSON.stringify(parsed, null, 2);
          } catch {
            return script.textContent || '';
          }
        })
        .join('\n---\n');
    });

    // Extract breadcrumbs
    const breadcrumbs = await page.evaluate(() => {
      const breadcrumbSelectors = [
        'nav[aria-label="breadcrumb"] ol li a',
        '.breadcrumb a',
        '.breadcrumbs a',
        '.crumbs a'
      ];
      
      let breadcrumbElements = [];
      for (const selector of breadcrumbSelectors) {
        const elements = Array.from(document.querySelectorAll(selector));
        if (elements.length > 0) {
          breadcrumbElements = elements;
          break;
        }
      }
      
      return breadcrumbElements.map(el => {
        const anchor = el;
        const name = anchor.textContent?.trim();
        const url = anchor.href;
        return { name: name || '', url: url || '' };
      }).filter(item => item.name && item.url);
    });

    // Extract main content
    const pageText = await page.evaluate(() => {
      // Remove unwanted elements
      const selectorsToRemove = [
        'header', 'footer', 'nav', 'aside', 'form', 'script', 'style',
        '[role="navigation"]', '[role="search"]', '[role="banner"]', '[role="contentinfo"]',
        '.advertisement', '.ads', '.sidebar', '.social-share', '.comments'
      ];
      
      selectorsToRemove.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => el.remove());
      });
      
      // Get main content
      const mainContentElement = document.querySelector('main') || 
                               document.querySelector('article') || 
                               document.querySelector('.content') ||
                               document.body;
      
      let text = mainContentElement?.textContent || '';
      
      // Clean up excessive whitespace
      text = text.replace(/\s\s+/g, ' ').trim();
      
      return text;
    });

    console.log(`Successfully scraped content via browser automation`);

    res.json({
      success: true,
      pageText,
      existingSchemaText,
      breadcrumbs,
      pageTitle
    });

  } catch (error) {
    console.error('Browser automation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'browser-automation-api' });
});

app.listen(PORT, () => {
  console.log(`Browser automation server running on port ${PORT}`);
});
