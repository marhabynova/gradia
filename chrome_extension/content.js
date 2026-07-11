// content.js - Injected into Shopee & Tokopedia product pages

function injectScrapeButton() {
  // Cegah injeksi ganda
  if (document.getElementById('gradia-scrape-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'gradia-scrape-btn';
  btn.innerText = '🔥 Push to Gradia ERP';
  btn.style.cssText = `
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    border: none;
    padding: 10px 20px;
    font-size: 14px;
    font-weight: bold;
    border-radius: 8px;
    cursor: pointer;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    z-index: 99999;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 10px 0;
  `;

  // Coba cari elemen judul (H1) untuk menyisipkan tombol tepat di bawahnya
  let titleElement = null;
  
  if (window.location.hostname.includes('shopee')) {
    titleElement = document.querySelector('h1') || document.querySelector('.KL-0'); // Selector Shopee bisa berubah
  } else if (window.location.hostname.includes('tokopedia')) {
    titleElement = document.querySelector('h1[data-testid="lblPDPDetailProductName"]') || document.querySelector('h1');
  }

  if (titleElement && titleElement.parentNode) {
    titleElement.parentNode.insertBefore(btn, titleElement.nextSibling);
  } else {
    // Fallback: Floating button jika struktur DOM berubah
    btn.style.position = 'fixed';
    btn.style.bottom = '20px';
    btn.style.right = '20px';
    document.body.appendChild(btn);
  }

  btn.addEventListener('click', async () => {
    btn.innerText = 'Menganalisis...';
    btn.style.opacity = '0.7';

    try {
      const data = extractProductData();
      await pushToGradia(data);
      btn.innerText = '✅ Berhasil di-Push!';
      btn.style.background = '#3b82f6'; // Biru setelah sukses
      setTimeout(() => {
        btn.innerText = '🔥 Push to Gradia ERP';
        btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        btn.style.opacity = '1';
      }, 3000);
    } catch (err) {
      console.error("Gradia Scraper Error:", err);
      alert('Gagal mengirim ke Gradia ERP: ' + err.message);
      btn.innerText = '❌ Gagal. Coba lagi.';
      btn.style.background = '#ef4444';
    }
  });
}

function extractProductData() {
  const host = window.location.hostname;
  let name = '';
  let price = 0;
  let imageUrl = '';
  let description = '';
  let platform = 'Unknown';

  if (host.includes('shopee')) {
    platform = 'Shopee';
    const nameEl = document.querySelector('h1'); // Judul biasanya di H1
    if (nameEl) name = nameEl.innerText.trim();

    // Mencari elemen harga (ini heuristik karena kelas sering obfuscated)
    const priceText = document.body.innerText.match(/Rp\s*([0-9.,]+)/);
    if (priceText) {
      price = parseFloat(priceText[1].replace(/\./g, '').replace(',', '.'));
    }

    const imgEl = document.querySelector('div[style*="background-image"]');
    if (imgEl) {
      const match = imgEl.style.backgroundImage.match(/url\("?(.*?)"?\)/);
      if (match) imageUrl = match[1];
    }
    
    // Fallback image tag
    if (!imageUrl) {
        const imgTags = document.querySelectorAll('img');
        for(let img of imgTags) {
            if (img.width > 300 && img.height > 300) {
                imageUrl = img.src;
                break;
            }
        }
    }

  } else if (host.includes('tokopedia')) {
    platform = 'Tokopedia';
    const nameEl = document.querySelector('h1[data-testid="lblPDPDetailProductName"]') || document.querySelector('h1');
    if (nameEl) name = nameEl.innerText.trim();

    const priceEl = document.querySelector('div[data-testid="lblPDPDetailProductPrice"]');
    if (priceEl) {
      const p = priceEl.innerText.replace(/[^0-9]/g, '');
      if (p) price = parseFloat(p);
    }

    const imgEl = document.querySelector('img[data-testid="PDPMainImage"]');
    if (imgEl) imageUrl = imgEl.src;
  }

  // Fallback umum
  if (!name) name = document.title;
  if (!imageUrl) {
    const metaImg = document.querySelector('meta[property="og:image"]');
    if (metaImg) imageUrl = metaImg.content;
  }

  return {
    name,
    price,
    original_url: window.location.href,
    image_url: imageUrl,
    description: "Scraped via Chrome Extension",
    source_platform: platform
  };
}

async function pushToGradia(data) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['apiUrl', 'adminToken'], async (config) => {
      let url = config.apiUrl || 'http://localhost:8000/api/v1/admin/dropship/extension-scrape';
      let token = config.adminToken || '';

      const headers = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(data)
        });

        if (!response.ok) {
          throw new Error('Server returned status ' + response.status);
        }

        resolve(await response.json());
      } catch (err) {
        reject(err);
      }
    });
  });
}

async function pushBulkToGradia(items) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['apiUrl', 'adminToken'], async (config) => {
      const baseUrl = config.apiUrl || 'http://localhost:8000/api/v1/admin/dropship/extension-scrape';
      const bulkUrl = baseUrl.replace(/\/extension-scrape\/?$/, '/extension-scrape/bulk');
      const token = config.adminToken || '';

      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      try {
        const response = await fetch(bulkUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(items)
        });
        if (!response.ok) throw new Error('Server returned status ' + response.status);
        resolve(await response.json());
      } catch (err) {
        reject(err);
      }
    });
  });
}

// ==========================================
// BULK SCRAPE (LISTING / SEARCH PAGES)
// ==========================================

function isListingPage() {
  const href = window.location.href;
  const isProductPage = href.includes('/item/') || href.includes('/p/') || href.includes('-i.');
  if (isProductPage) return false;
  return href.includes('/search') || href.includes('/find') || href.includes('/c/') || href.includes('/mall/');
}

// Selector heuristics are fragile (marketplace DOM/class names change often) -
// same caveat as the single-product scraper above. We scope everything to
// anchors that look like product links so a broken card doesn't break the page.
function extractListingProducts() {
  const host = window.location.hostname;
  const items = [];
  let cardLinks = [];

  if (host.includes('shopee')) {
    cardLinks = Array.from(document.querySelectorAll('a[href*="-i."]'));
  } else if (host.includes('tokopedia')) {
    cardLinks = Array.from(document.querySelectorAll(
      'a[data-testid="lnkProductContainer"], div[data-testid="divProductWrapper"] a'
    ));
  }

  const seenUrls = new Set();
  const platform = host.includes('shopee') ? 'Shopee' : host.includes('tokopedia') ? 'Tokopedia' : 'Unknown';

  for (const card of cardLinks) {
    try {
      const url = card.href;
      if (!url || seenUrls.has(url)) continue;

      const nameEl = card.querySelector('[class*="name"], [data-testid*="Name"], h2, h3') || card;
      const name = (nameEl.innerText || '').trim().split('\n')[0];
      if (!name) continue;

      const priceMatch = card.innerText.match(/Rp\s*([0-9.,]+)/);
      const price = priceMatch ? parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.')) : 0;

      let imageUrl = '';
      const imgEl = card.querySelector('img');
      if (imgEl) imageUrl = imgEl.src;

      seenUrls.add(url);
      items.push({
        name,
        price,
        original_url: url,
        image_url: imageUrl,
        description: 'Bulk-scraped via Chrome Extension',
        source_platform: platform
      });
    } catch (e) {
      // Skip this card, keep going - one broken card shouldn't kill the whole batch
      continue;
    }
  }

  return items;
}

function injectBulkScrapeButton() {
  if (document.getElementById('gradia-bulk-scrape-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'gradia-bulk-scrape-btn';
  btn.innerText = '🔥 Bulk Push ke Gradia ERP';
  btn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    border: none;
    padding: 12px 22px;
    font-size: 14px;
    font-weight: bold;
    border-radius: 8px;
    cursor: pointer;
    box-shadow: 0 4px 6px rgba(0,0,0,0.2);
    z-index: 99999;
  `;

  btn.addEventListener('click', async () => {
    const original = btn.innerText;
    btn.innerText = 'Memindai produk...';
    btn.style.opacity = '0.7';

    try {
      const items = extractListingProducts();
      if (items.length === 0) {
        btn.innerText = 'Tidak ada produk terdeteksi';
        setTimeout(() => { btn.innerText = original; btn.style.opacity = '1'; }, 2500);
        return;
      }
      btn.innerText = `Mengirim ${items.length} produk...`;
      const result = await pushBulkToGradia(items);
      btn.innerText = `✅ ${result.count || items.length} produk terkirim!`;
      btn.style.background = '#3b82f6';
    } catch (err) {
      console.error('Gradia Bulk Scraper Error:', err);
      btn.innerText = '❌ Gagal. Coba lagi.';
      btn.style.background = '#ef4444';
    } finally {
      setTimeout(() => {
        btn.innerText = original;
        btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        btn.style.opacity = '1';
      }, 3000);
    }
  });

  document.body.appendChild(btn);
}

function runInjection() {
  const href = window.location.href;
  const isProductPage = href.includes('/item/') || href.includes('/p/') || href.includes('-i.');
  if (isProductPage) {
    injectScrapeButton();
  } else if (isListingPage()) {
    injectBulkScrapeButton();
  }
}

// Pantau perubahan DOM (berguna untuk SPA/React app seperti Tokopedia/Shopee)
const observer = new MutationObserver(runInjection);
observer.observe(document.body, { childList: true, subtree: true });

// Coba langsung inject saat pertama load
setTimeout(runInjection, 2000);
