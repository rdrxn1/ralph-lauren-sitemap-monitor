const fs = require('fs');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

/*
 * Node.js script to fetch new URLs from Ralph Lauren sitemaps using Puppeteer.
 *
 * This script mirrors the behaviour of the Python version but uses
 * `puppeteer-extra` with the stealth plugin to retrieve the sitemap XMLs.
 * It navigates to each sitemap URL, extracts all <loc> tags, and
 * determines which URLs are new relative to the archive in `all_urls.txt`.
 *
 * The script writes new URLs to `new_urls_YYYY-MM-DD.txt`, updates
 * `latest_new_urls.txt` and `all_urls.txt`, and appends a summary entry
 * to `run_log.json` with counts for new, existing and total URLs.
 */

puppeteer.use(StealthPlugin());

async function fetchSitemapXML(url) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  // Navigate with networkidle2 to ensure the page has loaded.
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  const content = await page.content();
  await browser.close();
  return content;
}

function extractLocs(xmlString) {
  // Use a simple regex to extract the contents of <loc> tags. This avoids
  // relying on an XML parser, which may choke on non-XML responses.
  const matches = [...xmlString.matchAll(/<loc>([^<]+)<\/loc>/g)];
  return matches.map((m) => m[1].trim());
}

async function main() {
  const sitemapIndex = 'https://www.ralphlauren.com/index';
  const fallback = [
    'https://www.ralphlauren.com/seocontent?n=contentsitemap_0',
    'https://www.ralphlauren.com/seocontent?n=productsitemap_0',
    'https://www.ralphlauren.com/seocontent?n=categorysitemap',
    'https://www.ralphlauren.com/seocontent?n=StoreSiteMap',
    'https://www.ralphlauren.com/seocontent?n=facetsitemap',
  ];
  let sitemapUrls;
  try {
    const indexXml = await fetchSitemapXML(sitemapIndex);
    sitemapUrls = extractLocs(indexXml);
    if (!sitemapUrls || sitemapUrls.length === 0) {
      sitemapUrls = fallback;
    }
  } catch (err) {
    sitemapUrls = fallback;
  }
  const urlSet = new Set();
  for (const sm of sitemapUrls) {
    try {
      const xml = await fetchSitemapXML(sm);
      extractLocs(xml).forEach((u) => urlSet.add(u));
    } catch (err) {
      console.warn(`Failed to fetch ${sm}: ${err.message}`);
    }
  }
  const currentUrls = Array.from(urlSet).sort();
  console.log(`Retrieved ${currentUrls.length} unique URLs`);
  // Load previous URLs from archive
  const archiveFile = 'all_urls.txt';
  const previousUrls = fs.existsSync(archiveFile)
    ? new Set(fs.readFileSync(archiveFile, 'utf8').split(/\r?\n/).filter(Boolean))
    : new Set();
  // Determine new URLs
  const newUrls = currentUrls.filter((u) => !previousUrls.has(u));
  const existingCount = currentUrls.length - newUrls.length;
  const dateStr = new Date().toISOString().slice(0, 10);
  const newFile = `new_urls_${dateStr}.txt`;
  fs.writeFileSync(newFile, newUrls.join('\n'), 'utf8');
  fs.writeFileSync('latest_new_urls.txt', newUrls.join('\n'), 'utf8');
  fs.writeFileSync(archiveFile, currentUrls.join('\n'), 'utf8');
  // Update run log
  const logFile = 'run_log.json';
  const runLog = fs.existsSync(logFile)
    ? JSON.parse(fs.readFileSync(logFile, 'utf8'))
    : [];
  const entry = {
    date: dateStr,
    timestamp: new Date().toISOString(),
    new_urls_count: newUrls.length,
    existing_urls_count: existingCount,
    total_urls_count: currentUrls.length,
  };
  const filtered = runLog.filter((e) => e.date !== dateStr);
  filtered.unshift(entry);
  fs.writeFileSync(logFile, JSON.stringify(filtered, null, 2), 'utf8');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
