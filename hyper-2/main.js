async function loadHTML(id, file) {
    const res = await fetch(file);
    if (!res.ok) throw new Error(`Failed to load ${file}`);
    const data = await res.text();
    const el = document.getElementById(id);
    if (el) {
        el.innerHTML = data;
    } else {
        console.warn(`Element with ID '${id}' not found when trying to load ${file}`);
    }
}
function adoptHeadStyles(html, pageUrl) {
    try {
        const doc = new DOMParser().parseFromString(html, 'text/html');

        // bring over external stylesheets (deduped by absolute URL)
        doc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;
            const abs = new URL(href, new URL(pageUrl, location.href)).href;
            if ([...document.head.querySelectorAll('link[rel="stylesheet"]')].some(l => l.href === abs)) return;
            const el = document.createElement('link');
            el.rel = 'stylesheet';
            el.href = abs;
            document.head.appendChild(el);
        });

        // bring over inline <style> blocks (dedupe by first 80 chars)
        doc.querySelectorAll('style').forEach(style => {
            const sig = (style.textContent || '').slice(0, 80);
            const exists = [...document.head.querySelectorAll('style')].some(s => (s.textContent || '').slice(0, 80) === sig);
            if (!exists) {
                const el = document.createElement('style');
                el.textContent = style.textContent || '';
                document.head.appendChild(el);
            }
        });
    } catch (e) {
        console.warn('[spa] adoptHeadStyles failed', e);
    }
}

// Render a page *with* a standard shell around it
async function renderPageWithShell(pageHtml, pageUrl, { afterInject } = {}) {
    const main = document.getElementById('mainContent');
    if (!main) return;

    // Bring over page styles (but not scripts)
    adoptHeadStyles(pageHtml, pageUrl);

    // Extract <main> (or body) from the fetched page
    const frag = extractMainNode(pageHtml);

    // Inject a clean shell + a dedicated host for the page fragment
    main.innerHTML = `
    <div id="header"></div>
    <main id="pageHost" class="offset-header"></main>
    <div id="faq"></div>
    <div id="contact"></div>
  `;

    // Put the page fragment inside the host
    const host = document.getElementById('pageHost');
    host.innerHTML = '';
    host.appendChild(frag);

    // Tailwind CDN needs to re-scan new DOM (safe no-op if you already applied)
    await reapplyTailwind();

    // (Optional) page-specific hook, e.g., updateCartPageUI
    if (typeof afterInject === 'function') {
        await afterInject(host);
    }

    // Hydrate common partials (safe if those IDs aren't present)
    await loadHTML('header', './header.html');
    document.getElementById('header')?.classList.add('outlined-header');
    if (document.getElementById('faq')) await loadHTML('faq', './faq.html');
    if (document.getElementById('contact')) await loadHTML('contact', './contact.html');
}

// Ensure global vendor scripts exist when deep-linking/back/forward
async function ensureGlobalsLoaded() {
    // CryptoJS must be present before auth.js uses it
    if (!window.CryptoJS) {
        await new Promise((res) => {
            const s = document.createElement('script');
            // use exactly the URL you normally include in <head> for CryptoJS:
            s.src = 'https://cdn.jsdelivr.net/npm/crypto-js@4.2.0/crypto-js.min.js';
            s.onload = res;
            s.onerror = res; // don't loop forever
            document.head.appendChild(s);
        });
    }
    // auth.js & main.js are already running in SPA; don't re-run them
}


/****************************
 * SPA: History + simple router (keeps your pages & assets)
 ****************************/
const INTERNAL_PAGES = new Set([
    '/', '/index.html',
    '/cart', '/cart.html',
    '/checkout', '/checkout.html',
    '/login', '/login.html',
    '/signup', '/signup.html',
    '/thank-you', '/thank-you.html',
    '/product-details', '/product-details.html',
]);




function norm(path) {
  if (path === '/' || path === '') return '/index.html';
  const map = {
    '/cart':'/cart.html',
    '/checkout':'/checkout.html',
    '/login':'/login.html',
    '/signup':'/signup.html',
    '/thank-you':'/thank-you.html',
    '/product-details':'/product-details.html'
  };
  return map[path] || path;
}



function saveScrollFor(path = norm(location.pathname)) {
    try {
        const map = JSON.parse(sessionStorage.getItem('scrollMap') || '{}');
        map[path] = window.scrollY || 0;
        sessionStorage.setItem('scrollMap', JSON.stringify(map));
    } catch { }
}
function restoreScrollFor(path = norm(location.pathname)) {
    try {
        const map = JSON.parse(sessionStorage.getItem('scrollMap') || '{}');
        const y = map[path] || 0;
        requestAnimationFrame(() => window.scrollTo(0, y));
    } catch { }
}

let __navInProgress = false;
async function routeTo(path) {
    // (OPTIONAL) For pages that need products, the branch calls ensureProductsReady().
    // So here we only log the pathname; per-branch logs will show the count after loading.
    console.log('[router] routeTo', path, 'search=', location.search);

    path = norm(path);
    const main = document.getElementById('mainContent');
    if (!main) return;

    if (path === '/index.html') {
        // Home: inject section placeholders, then hydrate
        main.innerHTML = `
    <div id="header"></div>
    <main>
      <div id="hero"></div>
      <div id="video"></div>
      <div id="products"></div>
      <div id="testimonials"></div>
      <div id="blogs"></div>
      <div id="faq"></div>
      <div id="contact"></div>
    </main>
  `;
        await initializeApp();
        return;
    }


    if (path === '/cart.html') {
        const res = await fetch('./cart.html', { cache: 'no-cache' });
        const html = await res.text();

        await ensureGlobalsLoaded();
        await ensureProductsReady();

        await renderPageWithShell(html, './cart.html', {
            afterInject: async () => {
                if (typeof updateCartPageUI === 'function') updateCartPageUI();
                // "You may also like" will now have data
            }
        });

        console.log('[route ok] /cart.html', {
            list: !!document.getElementById('cartList'),
            sub: !!document.getElementById('cartSubtotal'),
            total: !!document.getElementById('cartTotal')
        });
        return;
    }




    if (path === '/checkout.html') {
        const res = await fetch('./checkout.html', { cache: 'no-cache' });
        const html = await res.text();

        await ensureGlobalsLoaded();
        await ensureProductsReady();

        await renderPageWithShell(html, './checkout.html', {
            afterInject: async () => {
                // Your existing builder populates the current DOM (inside #pageHost)
                await loadCheckoutPage({});
                // If your loadCheckoutPage does buttons, it will find them now
            }
        });

        console.log('[route ok] /checkout.html', {
            header: !!document.getElementById('header')
        });
        return;
    }



    if (path === '/login.html') {
        await loadLoginPage();
        return;
    }

    if (path === '/signup.html') {
        await loadSignupPage();
        return;
    }
    if (path === '/thank-you.html') {
        const res = await fetch('./thank-you.html', { cache: 'no-cache' });
        const html = await res.text();

        await renderPageWithShell(html, './thank-you.html', {
            afterInject: async () => {
                const id = new URLSearchParams(location.search).get('order') || '';
                const el = document.getElementById('orderId');
                if (el) el.textContent = id;
            }
        });
        return;
    }


    if (path === '/product-details.html') {
        await ensureProductsReady();
        const params = new URLSearchParams(location.search);
        const qTitle = (params.get('title') || '').trim();
        console.log('[router] product-details query:', qTitle);

        let prod = getProductByQuery(qTitle) || getProductByQuery(window.__lastProductTitle);
        console.log('[router] product-details resolved:', prod ? prod.title : '(not found)');

        if (!prod) {
            console.warn('Product not found for', qTitle, '— going home');
            await navigate('/index.html');
            return;
        }
        await renderProductDetail(prod);
        return;
    }



    // Generic fallback: fetch page and hydrate shared sections
    const res = await fetch(path);
    const html = await res.text();
    main.innerHTML = html;

    // If these placeholders exist, fill them (harmless if not present)
    await loadHTML('header', './header.html');
    document.getElementById('header')?.classList.add('outlined-header');
    if (document.getElementById('faq')) await loadHTML('faq', './faq.html');
    if (document.getElementById('contact')) await loadHTML('contact', './contact.html');
}

async function navigate(path, { push = true } = {}) {
    if (__navInProgress) return;
    __navInProgress = true;
    try {
        // Always resolve to a URL so we can separate pathname & search
        const u = new URL(path, location.href);

        const currentPath = norm(location.pathname);
        const targetPath = norm(u.pathname);      // router key
        const targetHref = targetPath + u.search; // address bar (keeps ?title=...)

        if (push && (currentPath + location.search) !== targetHref) {
            saveScrollFor(currentPath);
            history.pushState({ path: targetPath }, '', targetHref);
        }

        await routeTo(targetPath);     // route with pathname only
        restoreScrollFor(targetPath);  // scroll is stored per path
    } finally {
        __navInProgress = false;
    }
}

// --- extract <main> (or body) from a fetched HTML page ---
function extractMainNode(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const node = doc.querySelector('main') || doc.body;
    // return a *node* we can append (not a string)
    const frag = document.createElement('div');
    frag.innerHTML = node.innerHTML; // keep only the inside of <main>/<body>
    return frag;
}


// Back/forward
window.addEventListener('popstate', (e) => {
    const target = norm((e.state && e.state.path) || location.pathname);
    routeTo(target).then(() => restoreScrollFor(target));
});
// Re-run router after BFCache restores or when user returns with Back/Forward.
window.addEventListener('pageshow', async (e) => {
    const target = norm(location.pathname);
    console.log('[router] pageshow', { path: target, search: location.search, persisted: !!e.persisted });
    // If the restored DOM looks unstyled, nudge Tailwind first
    try { await reapplyTailwind(); } catch { }
    navigate(location.pathname + location.search, { push: false });
});



// Intercept clicks on internal *.html links only; leave assets/external alone
document.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href) return;

    // ignore anchors / mail / tel
    if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

    try {
        const u = new URL(href, location.href);
        // external origins → let browser handle
        if (u.origin !== location.origin) return;

        // only trap our page links
        if (!INTERNAL_PAGES.has(u.pathname)) return;

        e.preventDefault();
        const target = u.pathname + u.search;   // keep query string
        navigate(target).catch(() => (location.href = target));

    } catch {
        // malformed href → ignore
    }
});

// --- Firebase helpers (use what auth.js already exported) ---
async function getFirebase() {
    // auth.js should set window.firebaseReady -> { db, auth? }
    const ready = (window.firebaseReady && await window.firebaseReady) || {};
    const FS = window.fs || {}; // { doc, getDoc, setDoc, collection, ... }
    return { db: ready.db || window.firebaseDB, FS };
}

// --- Product lookup helpers ---
function slugify(s) {
    return String(s || '')
        .toLowerCase()
        .trim()
        .replace(/[\s\W]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
function getProductByQuery(q) {
    if (!q || !products || !products.length) return null;
    const t = String(q).trim();
    // exact
    let p = products.find(x => x.title === t);
    if (p) return p;
    // case-insensitive
    p = products.find(x => x.title.toLowerCase() === t.toLowerCase());
    if (p) return p;
    // slug match
    const qs = slugify(t);
    return products.find(x => slugify(x.title) === qs) || null;
}

// --- products readiness (load once, reuse everywhere) ---
let __productsReadyPromise = null;
function ensureProductsReady() {
    if (__productsReadyPromise) return __productsReadyPromise;
    __productsReadyPromise = (async () => {
        if (!products || !products.length) { await setupProducts(); }
        return products;
    })();
    return __productsReadyPromise;
}

// --- Re-apply Tailwind CDN after SPA injections ---
let __twReloading = false;
async function reapplyTailwind() {
    // If a Tailwind <script> exists, remove it and add a fresh one so it rescans the DOM.
    try {
        if (__twReloading) return;
        __twReloading = true;

        // Remove any existing tailwind CDN scripts to avoid duplicates
        const olds = [...document.querySelectorAll('script[src*="cdn.tailwindcss.com"]')];
        olds.forEach(s => s.parentNode && s.parentNode.removeChild(s));

        // Inject a fresh script (cache-busted so browsers refetch it)
        const s = document.createElement('script');
        s.src = 'https://cdn.tailwindcss.com?' + Date.now();
        document.head.appendChild(s);

        await new Promise(res => { s.onload = res; s.onerror = res; });
        console.log('[tw] reapplied tailwind');
    } catch (e) {
        console.warn('[tw] reapply failed', e);
    } finally {
        __twReloading = false;
    }
}


async function initializeApp() {
    // Load all sections in order
    await Promise.all([
        loadHTML('header', './header.html'),
        loadHTML('hero', './hero.html'),
        loadHTML('video', './video.html'),
        loadHTML('products', './products.html'),
        loadHTML('testimonials', './testimonials.html'),
        loadHTML('blogs', './blogs.html'),
        loadHTML('faq', './faq.html'),
        loadHTML('contact', './contact.html'),
    ]);

    // Wait to ensure DOM has rendered all injected sections
    setTimeout(setupSectionsSafely, 100);
}
window.cart = JSON.parse(localStorage.getItem('cart') || '{}');
function setupSectionsSafely() {

    if (document.getElementById('carouselContainer') && !window.__productsSetup) {
        window.__productsSetup = true;
        ensureProductsReady().then(() => {
            updateProductCarousel();
            document.getElementById('productPrev')?.addEventListener('click', () => cycleProduct(-1));
            document.getElementById('productNext')?.addEventListener('click', () => cycleProduct(1));
            const presaleBtn = document.getElementById('campaignPresale');
            const discountedBtn = document.getElementById('campaignDiscounted');
            if (presaleBtn && discountedBtn) {
                presaleBtn.onclick = () => setCampaignMode('presale');
                discountedBtn.onclick = () => setCampaignMode('discounted');
            }
        });
    }


    if (document.getElementById('testimonialWrapper')) {
        renderTestimonials();
    }
    if (document.getElementById('videoWrapper')) {
        setupVideoScrollAnimation();
    }

    if (document.getElementById('playButton')) {
        setupVideoPlayer();
    }

    if (document.getElementById('blogScroll')) {
        document.getElementById('blogScrollRight')?.addEventListener('click', () => scrollBlogs(1));
        document.getElementById('blogScrollLeft')?.addEventListener('click', () => scrollBlogs(-1));
    }
    document.getElementById('mainContent')?.classList.remove('offset-header');


    document.getElementById('productNext')?.addEventListener('click', () => cycleProduct(1));
    document.getElementById('productPrev')?.addEventListener('click', () => cycleProduct(-1));
    document.querySelector('#cartSidebar button')?.addEventListener('click', handleCheckout);
    document.querySelector('#cartDrawer button')?.addEventListener('click', handleCheckout);

}

window.addEventListener('DOMContentLoaded', () => {
    navigate(location.pathname + location.search, { push: false });
});


// ---------------------------- PRODUCTS -----------------------------
// ---------------------------- PRODUCTS -----------------------------

// CHANGE THIS to your actual csv path (spaces/parentheses are okay)
const CSV_PATH = './assets/hyper-products-sample.csv';

// Default campaign mode: 'presale' or 'discounted'
const CAMPAIGN_DEFAULT = 'presale';

// Read from URL (?price=presale|discounted) OR from localStorage OR fallback default
let campaignMode =
    new URLSearchParams(location.search).get('price') ||
    localStorage.getItem('campaignMode') ||
    CAMPAIGN_DEFAULT;

// Small helper so you can switch via console: setCampaignMode('discounted')
window.setCampaignMode = (mode) => {
    campaignMode = (mode === 'discounted') ? 'discounted' : 'presale';
    localStorage.setItem('campaignMode', campaignMode);
    // Repaint wherever prices appear
    updateProductCarousel();
};


// Simple CSV parser that supports quoted fields, commas & newlines
function parseCSV(text) {
    const rows = [];
    let i = 0, field = '', row = [], inQuotes = false;

    const pushField = () => { row.push(field); field = ''; };
    const pushRow = () => { rows.push(row); row = []; };

    while (i < text.length) {
        const c = text[i];

        if (inQuotes) {
            if (c === '"') {
                if (text[i + 1] === '"') { field += '"'; i += 2; continue; } // escaped quote
                inQuotes = false; i++; continue;
            }
            field += c; i++; continue;
        }

        if (c === '"') { inQuotes = true; i++; continue; }
        if (c === ',') { pushField(); i++; continue; }
        if (c === '\r') { i++; continue; }
        if (c === '\n') { pushField(); pushRow(); i++; continue; }

        field += c; i++;
    }
    // last field/row
    if (field.length || row.length) { pushField(); pushRow(); }

    // header -> objects
    const header = rows.shift() || [];
    return rows
        .filter(r => r.some(v => (v || '').trim().length)) // drop empty lines
        .map(r => Object.fromEntries(header.map((h, idx) => [h.trim(), (r[idx] || '').trim()])));
}

let productIndex = 0;
let products = [];

async function setupProducts() {
    const response = await fetch(encodeURI(CSV_PATH));
    const csvText = await response.text();
    const raw = parseCSV(csvText);

    // Map CSV columns to our product model
    products = raw.map(r => ({
        title: r.title || '',
        desc: r.desc || '',
        // keep original currency strings (₹1,599.00 etc.)
        mrp: r['MRP'] || '',
        discountedPrice: r['discounted price'] || '',
        discountPct: r['discount percentage'] || '',
        presalePrice: r['presale price'] || '',
        presalePct: r['presale price percentage'] || '',
        category: r['category'] || '',
        sizes: (r.sizes || '').split('|').filter(Boolean),
        image: r.image || '',
        // rating is optional in the new CSV; handle gracefully
        rating: r.rating ? Number(r.rating) : null,
    }));
    console.log('[products] loaded:', products.length);

    if (!products.length) {
        console.warn('No valid products found.');
        return;
    }

    updateProductCarousel();
    setInterval(() => cycleProduct(1), 7000); // auto-slide every 4s
}

function getActivePrice(product) {
    // Always show MRP (struck-through) + active price based on campaignMode
    if (campaignMode === 'discounted') {
        return {
            label: 'Discounted',
            value: product.discountedPrice || product.presalePrice || product.mrp || '',
            badge: product.discountPct || '',
        };
    }
    // default to presale
    return {
        label: 'Presale',
        value: product.presalePrice || product.discountedPrice || product.mrp || '',
        badge: product.presalePct || '',
    };
}

function renderPriceBlock(product) {
    const active = getActivePrice(product);
    const mrp = product.mrp ? `<span class="line-through opacity-70 mr-2">${product.mrp}</span>` : '';
    const badge = active.badge
        ? `<span class="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-pink-600 text-white uppercase tracking-wide">${active.label} ${active.badge}</span>`
        : `<span class="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-pink-600 text-white uppercase tracking-wide">${active.label}</span>`;

    return `${mrp}<span class="font-extrabold">${active.value}</span>${badge}`;
}

// --- Global "You may also like" (images-only grid) ---
// --- Global "You may also like" (card style) ---
// --- Global "You may also like" (card style) ---
// --- Global "You may also like" (card style + auto-cycling images) ---
// --- Global "You may also like" (3 wide cards + rotates every 10s) ---
// --- Global "You may also like" (respects existing count; rotates every 10s) ---
async function renderGlobalRecommendations(containerId, count = 3, excludeTitle = null, rotateMs = 10000) {
    await ensureProductsReady();
    const el = document.getElementById(containerId);
    if (!el || !products.length) return;
    const pool = excludeTitle ? products.filter(p => p.title !== excludeTitle) : [...products];

    const build = async (picks) => {
        el.innerHTML = picks.map(p => {
            const active = getActivePrice(p); // { label, value, badge }
            const stars = p.rating
                ? `<div class="flex items-center justify-end gap-0.5 text-pink-500 text-sm">
             ${'★'.repeat(Math.round(p.rating))}${'☆'.repeat(5 - Math.round(p.rating))}
           </div>`
                : '';

            return `
  <div class="bg-gray-50 rounded-2xl shadow p-5 hover:shadow-lg transition text-left">
    <a href="/product-details.html?title=${encodeURIComponent(p.title)}"
       class="block w-full mb-4" data-title="${p.title}" data-role="open">
      <img data-title="${p.title}" data-role="img"
           src="${encodeURI(p.image)}"
           alt="${p.title}"
           class="w-full h-64 object-contain rounded-xl bg-white"/>
    </a>

    <a href="/product-details.html?title=${encodeURIComponent(p.title)}"
       class="font-semibold leading-snug mb-1 line-clamp-2 block"
       data-title="${p.title}" data-role="open">
      ${p.title}
    </a>

    <div class="flex items-center justify-between">
      <div class="text-base font-bold">₹ ${String(getActivePrice(p).value).replace(/[^\d.]/g, '') || getActivePrice(p).value}</div>
      ${p.rating ? `<div class="flex items-center justify-end gap-0.5 text-pink-500 text-sm">
         ${'★'.repeat(Math.round(p.rating))}${'☆'.repeat(5 - Math.round(p.rating))}
       </div>` : ''}
    </div>

    <button data-title="${p.title}" data-role="add"
      class="mt-4 w-full border border-black rounded-full px-5 py-2 font-semibold text-sm hover:bg-black hover:text-white transition">
      + ADD TO CART
    </button>
  </div>
`;

        }).join('');

        // detail open
        // open detail via SPA (anchors)
        el.querySelectorAll('a[data-role="open"]').forEach(a => {
            const title = a.getAttribute('data-title');
            const prod = products.find(x => x.title === title);
            if (!prod) return;
            a.addEventListener('click', (ev) => {
                ev.preventDefault();
                showProductDetail(prod); // pushes /product-details.html?title=...
            });
        });


        // add to cart
        el.querySelectorAll('button[data-role="add"]').forEach(btn => {
            const title = btn.getAttribute('data-title');
            const prod = products.find(x => x.title === title);
            if (!prod) return;
            btn.addEventListener('click', () => {
                const active = getActivePrice(prod);
                const size = (prod.sizes && prod.sizes[0]) || 'M';
                addToCart(prod.title, active.value, size, prod.image);
            });
        });

        // per-card 5s image cycling (gallery from same helper as detail page)
        el.querySelectorAll('img[data-role="img"]').forEach(async (imgEl) => {
            const title = imgEl.getAttribute('data-title');
            const prod = products.find(x => x.title === title);
            if (!prod) return;
            const gallery = await discoverGalleryImages(prod.image);
            startCardImageCycler(imgEl, gallery);
        });
    };

    const pick = () => [...pool].sort(() => Math.random() - 0.5).slice(0, count);

    // avoid duplicate timers on re-render
    if (el._recsInterval) clearInterval(el._recsInterval);

    await build(pick());

    // rotate entire set every 10s (or whatever you pass as rotateMs)
    el._recsInterval = setInterval(async () => {
        await build(pick());
    }, rotateMs);
}





function updateProductCarousel() {
    const container = document.getElementById('carouselContainer');
    if (!container || !products.length) return;

    container.innerHTML = '';
    const total = products.length;

    // indices for left/right slots
    const farLeft = (productIndex - 2 + total) % total;
    const left = (productIndex - 1 + total) % total;
    const right = (productIndex + 1) % total;
    const farRight = (productIndex + 2) % total;

    // order matters: far-left -> left -> center -> right -> far-right
    [farLeft, left, productIndex, right, farRight].forEach((i, pos) => {
        const img = document.createElement('img');
        img.src = products[i].image;
        img.className = 'carousel-item';

        if (pos === 0) img.classList.add('carousel-far-left');
        if (pos === 1) img.classList.add('carousel-left');
        if (pos === 2) img.classList.add('carousel-center');
        if (pos === 3) img.classList.add('carousel-right');
        if (pos === 4) img.classList.add('carousel-far-right');

        img.addEventListener('click', () => showProductDetail(products[i]));
        container.appendChild(img);
    });

    // Highlighted product details
    const p = products[productIndex];
    const active = getActivePrice(p);

    document.getElementById('highlightedTitle').textContent = p.title;
    //   document.getElementById('highlightedDesc').textContent = p.desc;

    // Price block (MRP + Presale/Discounted)
    document.getElementById('highlightedPrice').innerHTML = renderPriceBlock(p);

    // Rating stars
    const ratingEl = document.getElementById('highlightedRating');
    if (p.rating) {
        const stars = '★'.repeat(Math.round(p.rating));
        const hollow = '☆'.repeat(5 - Math.round(p.rating));
        ratingEl.innerHTML = `<span class="text-yellow-400 text-xl">${stars}${hollow}</span>`;
    } else {
        ratingEl.innerHTML = '';
    }

    // CTA button
    const cta = document.getElementById('highlightedAddToCart');
    if (cta) {
        cta.textContent = (campaignMode === 'presale')
            ? 'Place your Pre-Launch Order'
            : '+ ADD TO CART';
        cta.onclick = () => { showProductDetail(p); };
    }
}
// Cycles the card image every 5s through its gallery (no immediate repeats)
function startCardImageCycler(imgEl, gallery) {
    const imgs = (gallery && gallery.length) ? gallery.map(src => encodeURI(src)) : [imgEl.src];
    let idx = 0;

    // set a random starting image (but keep current if it's already one of them)
    const current = imgEl.src;
    const startIndex = Math.max(0, imgs.findIndex(s => s === current));
    idx = startIndex >= 0 ? startIndex : Math.floor(Math.random() * imgs.length);

    // Safety: avoid double intervals if re-rendering
    if (imgEl._cycler) clearInterval(imgEl._cycler);

    imgEl._cycler = setInterval(() => {
        if (imgs.length < 2) return;
        let next = Math.floor(Math.random() * imgs.length);
        if (next === idx) next = (idx + 1) % imgs.length;
        idx = next;
        imgEl.src = imgs[idx];
    }, 5000);
}


function cycleProduct(dir) {
    productIndex = (productIndex + dir + products.length) % products.length;
    updateProductCarousel();
}
// ---------------------------- VIDEO PLAYER -----------------------------



function setupVideoPlayer() {
    const playBtn = document.getElementById('playButton');
    const video = document.getElementById('mainVideo');
    const thumb = document.getElementById('videoThumbnail');

    if (!playBtn || !video || !thumb) return;

    playBtn.addEventListener('click', () => {
        video.classList.remove('opacity-0', 'pointer-events-none');
        thumb.classList.add('opacity-0');
        video.play();
    });
}

function setupVideoScrollAnimation() {
    const videoWrapper = document.getElementById('videoWrapper');
    const mainVideo = document.getElementById('mainVideo');
    const playButton = document.getElementById('playButton');
    const thumbnail = document.getElementById('videoThumbnail');

    if (!videoWrapper || !mainVideo || !playButton || !thumbnail) return;

    let isPlaying = false;

    // Click handler to toggle play/pause
    videoWrapper.addEventListener('click', () => {
        if (!isPlaying) {
            mainVideo.classList.remove('opacity-0', 'pointer-events-none');
            thumbnail.classList.add('opacity-0');
            playButton.classList.add('hidden');
            mainVideo.play();
            isPlaying = true;
        } else {
            mainVideo.pause();
            isPlaying = false;
            playButton.classList.remove('hidden');
        }
    });

    // Scroll observer to expand video when in view
    const observer = new IntersectionObserver(
        ([entry]) => {
            if (entry.isIntersecting) {
                videoWrapper.classList.remove('rounded-full', 'w-60', 'h-60', 'sm:w-80', 'sm:h-80');
                videoWrapper.classList.add('w-full', 'h-[640px]', 'rounded-none', 'mx-auto');
            } else {
                videoWrapper.classList.remove('w-full', 'h-[640px]', 'rounded-none');
                videoWrapper.classList.add('rounded-full', 'w-60', 'h-60', 'sm:w-80', 'sm:h-80');
                mainVideo.pause();
                isPlaying = false;
                mainVideo.classList.add('opacity-0', 'pointer-events-none');
                thumbnail.classList.remove('opacity-0');
                playButton.classList.remove('hidden');
            }
        },
        { threshold: 0.5 }
    );

    observer.observe(videoWrapper);
}

// ---------------------------- TESTIMONIALS -----------------------------

const testimonials = [
    {
        name: "KHABIB",
        role: "CO–OWNER",
        image: "./assets/fighter-1.png", // Replace with real image path
        quote:
            "Aut nihil mollitia deserunt quia sed rem. Quibusdam amet veniam rerum id rerum beatae. Quas rerum iste necessitatibus..."
    },
    {
        name: "ALICIA RUIZ",
        role: "TRAINER",
        image: "./assets/fighter-2.png",
        quote:
            "Inventore et nihil. Ut rerum dolores hic quis. At voluptates ad magnam blanditiis excepturi expedita aut."
    },
    {
        name: "TYLER MOSS",
        role: "MMA CHAMP",
        image: "./assets/fighter-3.png",
        quote:
            "Explicabo autem assumenda deleniti. Reprehenderit sint amet accusamus deserunt rerum veniam illum."
    }
];

let testimonialIndex = 0;
function renderTestimonials() {
    const wrapper = document.getElementById("testimonialWrapper");
    const dots = document.getElementById("testimonialDots");

    wrapper.innerHTML = "";
    dots.innerHTML = "";

    testimonials.forEach((t, i) => {
        const slide = document.createElement("div");
        slide.className =
            "min-w-full max-w-full px-4 flex justify-center";

        slide.style = "font-family: 'Palanquin', sans-serif;"
        slide.innerHTML = `
        <div class="border border-white/30 bg-transparent text-white rounded-xl p-6 w-full max-w-3xl flex flex-col sm:flex-row items-center gap-6 relative">
            <div class="absolute top-4 right-6 text-pink-500 text-6xl font-bold select-none leading-none">"</div>
            <div class="relative w-32 h-32 sm:w-40 sm:h-40 overflow-hidden rounded-md flex-shrink-0">
                <img src="${t.image}" class="w-full h-full object-cover rounded-md" />
            </div>
            <div class="flex-1">
                <p class="text-base sm:text-lg font-medium mb-4 leading-relaxed text-white/90">"${t.quote}"</p>
                <p class="font-bold text-xl">${t.name}</p>
                <p class="text-sm text-white/60">${t.role}</p>
            </div>
        </div>
      `;
        wrapper.appendChild(slide);

        const dot = document.createElement("button");
        dot.className = `w-3 h-3 rounded-full ${i === 0 ? "bg-pink-500" : "bg-gray-500"}`;
        dot.addEventListener("click", () => {
            testimonialIndex = i;
            updateTestimonialSlide();
        });
        dots.appendChild(dot);
    });
}



function updateTestimonialSlide() {
    const wrapper = document.getElementById("testimonialWrapper");
    if (!wrapper) return; // 🔒 Prevents error if not on home page

    wrapper.style.transform = `translateX(-${testimonialIndex * 100}%)`;

    document
        .querySelectorAll("#testimonialDots button")
        .forEach((dot, i) => {
            dot.className = `w-3 h-3 rounded-full ${i === testimonialIndex ? "bg-pink-500" : "bg-gray-500"}`;
        });
}

setInterval(() => {
    testimonialIndex = (testimonialIndex + 1) % testimonials.length;
    updateTestimonialSlide();
}, 5000);

// ---------------------------- BLOG SCROLL -----------------------------

function scrollBlogs(direction) {
    const scroll = document.getElementById('blogScroll');
    scroll.scrollBy({ left: direction * 320, behavior: 'smooth' });
}

// ---------------------------- CART SYSTEM -----------------------------
async function toggleCart(forceShow = true) {
    const here = (location.pathname === '/' || location.pathname === '') ? '/index.html' : location.pathname;
    if (here === '/cart.html') {
        // already on cart page; just refresh UI
        if (typeof updateCartPageUI === 'function') updateCartPageUI();
        return;
    }
    if (typeof navigate === 'function' && !__navInProgress) {
        return navigate('/cart.html');
    }
    // Fallback
    location.href = 'cart.html';
}




function updateCartUI() {
    // Overlay elements (they don't exist when the overlay is commented out or on cart.html)
    const totalDesktop = document.getElementById("cartTotalDesktop");
    const totalMobile = document.getElementById("cartTotalMobile");
    const desktopContainer = document.getElementById("cartItemsDesktop");
    const mobileContainer = document.getElementById("cartItemsMobile");

    // If NONE of the overlay elements are present, bail safely.
    if (!totalDesktop && !totalMobile && !desktopContainer && !mobileContainer) return;

    let total = 0;

    if (desktopContainer) desktopContainer.innerHTML = '';
    if (mobileContainer) mobileContainer.innerHTML = '';

    Object.entries(window.cart || {}).forEach(([key, item]) => {
        const unit = parseFloat(String(item.price).replace(/[^\d.]/g, "")) || 0;
        const line = unit * (item.quantity || 0);
        total += line;

        const rowHTML = `
      <div class="flex justify-between items-center border-b border-gray-700 pb-4">
        <div class="flex-1">
          <h4 class="font-bold text-base">${item.name}</h4>
          <p class="text-xs text-gray-400">Size: ${item.size}</p>
          <p class="text-sm text-gray-400">₹${unit.toLocaleString('en-IN')} × ${item.quantity}</p>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="decreaseQuantity('${key}')" class="w-8 h-8 bg-white text-black rounded-full font-bold text-lg hover:bg-pink-500 hover:text-white transition">−</button>
          <span class="text-lg font-semibold">${item.quantity}</span>
          <button onclick="increaseQuantity('${key}')" class="w-8 h-8 bg-white text-black rounded-full font-bold text-lg hover:bg-pink-500 hover:text-white transition">+</button>
        </div>
      </div>
    `;

        if (desktopContainer) desktopContainer.insertAdjacentHTML('beforeend', rowHTML);
        if (mobileContainer) mobileContainer.insertAdjacentHTML('beforeend', rowHTML);
    });

    const formatted = `₹${Number(total).toLocaleString('en-IN')}`;
    if (totalDesktop) totalDesktop.textContent = formatted;
    if (totalMobile) totalMobile.textContent = formatted;
}



function formatINR(n) {
    return '₹ ' + Number(n || 0).toLocaleString('en-IN');
}

function getSelectedShipping() {
    // Free = 0; Express = 80
    const express = document.getElementById('shipExpress');
    return express && express.checked ? 80 : 0;
}

function wireCartSummaryEvents() {
    document.getElementById('shipFree')?.addEventListener('change', updateCartPageUI);
    document.getElementById('shipExpress')?.addEventListener('change', updateCartPageUI);
}

function updateCartPageUI() {
    const list = document.getElementById('cartList');
    const countEl = document.getElementById('cartItemCount');
    const subEl = document.getElementById('cartSubtotal');
    const totalEl = document.getElementById('cartTotal');
    if (!list || !subEl || !totalEl || !countEl) return;

    const cart = window.cart || {};
    list.innerHTML = '';

    const keys = Object.keys(cart);
    const itemCount = keys.reduce((sum, k) => sum + (cart[k]?.quantity || 0), 0);
    countEl.textContent = itemCount;

    if (keys.length === 0) {
        list.innerHTML = `<div class="text-center text-gray-500 text-lg py-20">Your cart is empty.</div>`;
        subEl.textContent = formatINR(0);
        totalEl.textContent = formatINR(0);
        return;
    }

    let subtotal = 0;

    keys.forEach((key, idx) => {
        const item = cart[key];
        const unit = parseFloat(String(item.price).replace(/[^\d.]/g, '')) || 0;
        const line = unit * item.quantity;
        subtotal += line;

        const row = document.createElement('div');
        row.className = 'border-b last:border-b-0 pb-6';
        row.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <img src="${item.image}" alt="${item.name}" class="w-24 h-24 object-cover rounded-md" />
          <div>
            <h4 class="font-semibold">${item.name}</h4>
            <p class="text-sm text-gray-500">Size: ${item.size}</p>
            <p class="font-semibold mt-1">${formatINR(unit)}</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <button onclick="decreaseQuantity('${key}')" class="w-8 h-8 border rounded-full">−</button>
          <span class="w-6 text-center font-semibold">${item.quantity}</span>
          <button onclick="increaseQuantity('${key}')" class="w-8 h-8 border rounded-full">+</button>
          <button onclick="removeFromCart('${key}')" class="ml-3 text-gray-500 hover:text-black" title="Remove">🗑️</button>
        </div>
      </div>
    `;
        list.appendChild(row);
    });

    const shipping = getSelectedShipping();
    subEl.textContent = formatINR(subtotal);
    totalEl.textContent = formatINR(subtotal + shipping);

    wireCartSummaryEvents(); // ensure radios are wired after first render
    // render random product images under the cart
    renderGlobalRecommendations('globalRecsCart', 4);

}




function saveCartAndRender() {
    localStorage.setItem('cart', JSON.stringify(window.cart));
    // mini icon / overlay, etc.
    if (typeof updateCartUI === 'function') updateCartUI();
    // cart page (two-column layout)
    if (typeof updateCartPageUI === 'function') updateCartPageUI();
}

function removeFromCart(id) {
    if (!window.cart?.[id]) return;
    delete window.cart[id];
    saveCartAndRender();
}


function addToCart(name, price, size, image) {
    if (!window.cart) window.cart = {};
    // make a stable key per product+size
    const id = `${name}__${size || 'M'}`;

    const qty = window.cart[id]?.quantity || 0;
    window.cart[id] = {
        id,
        name,
        size: size || 'M',
        price,                 // keep the ₹ string as you had
        image,
        quantity: qty + 1
    };

    saveCartAndRender();
}

function increaseQuantity(id) {
    if (!window.cart?.[id]) return;
    window.cart[id].quantity = (window.cart[id].quantity || 1) + 1;
    saveCartAndRender();
}

function decreaseQuantity(id) {
    if (!window.cart?.[id]) return;
    const next = (window.cart[id].quantity || 1) - 1;
    if (next <= 0) {
        delete window.cart[id];      // remove when it hits 0
    } else {
        window.cart[id].quantity = next;
    }
    saveCartAndRender();
}


async function handleCheckout() {
    const cartItems = Object.values(window.cart || {});
    const itemCount = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    if (itemCount === 0) {
        alert("Your cart is empty. Add items before checking out.");
        return;
    }

    const isGuest = document.getElementById("continueAsGuest")?.checked;

    if (isGuest) {
        // SPA navigate to checkout and STOP — do not re-open cart.
        try {
            await navigate('/checkout.html');
        } catch {
            location.href = './checkout.html';
        }
    } else {
        await loadSignupPage();
    }
    // ❌ remove any toggleCart() call here – it causes the loop
}


// Navigate to product-details page with a title query so History works
async function showProductDetail(product) {
    window.__lastProductTitle = product?.title || '';
    const url = `/product-details.html?title=${encodeURIComponent(product.title)}`;
    if (typeof navigate === 'function') return navigate(url).catch(() => (location.href = url));
    location.href = url;
}




async function renderProductDetail(product) {
    const main = document.getElementById('mainContent');
    main?.classList.add('offset-header');
    if (main) main.innerHTML = '';

    // Load shell
    const res = await fetch('./product-details.html');
    const html = await res.text();
    if (main) main.innerHTML = html;

    // Shared sections
    await loadHTML('header', './header.html');
    document.getElementById('header')?.classList.add('outlined-header');
    await loadHTML('faq', './faq.html');
    await loadHTML('contact', './contact.html');

    // Discover gallery images (original + folder/{...})
    const gallery = await discoverGalleryImages(product.image);

    const active = getActivePrice(product);
    const container = document.getElementById('productDetailContainer');
    container.innerHTML = `
    <section class="px-4 py-10 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">
      <!-- LEFT SIDE: Gallery -->
      <div class="grid grid-cols-6 gap-4">
        <!-- Thumbnails (desktop left, vertical) -->
        <div class="hidden sm:flex sm:flex-col gap-3 col-span-1 max-h-[600px] overflow-auto pr-1" id="thumbRail">
          ${gallery.map((src, i) => `
            <button data-idx="${i}" class="thumb-btn border border-white/20 rounded overflow-hidden focus:outline-none">
              <img src="${encodeURI(src)}" class="w-full h-20 object-cover ${i === 0 ? 'opacity-100' : 'opacity-80'}" />
            </button>
          `).join('')}
        </div>

        <!-- Main image -->
        <div class="col-span-6 sm:col-span-5 relative">
          <img id="mainImage" src="${encodeURI(gallery[0] || product.image)}" 
               class="w-full max-h-[680px] object-contain rounded-lg bg-black/5" />
          <!-- Mobile thumbnails under main image -->
          <div class="sm:hidden mt-3 flex gap-2 overflow-x-auto" id="thumbRow">
            ${gallery.map((src, i) => `
              <button data-idx="${i}" class="thumb-btn border border-white/20 rounded overflow-hidden min-w-16 w-16 h-16">
                <img src="${encodeURI(src)}" class="w-full h-full object-cover ${i === 0 ? 'opacity-100' : 'opacity-80'}" />
              </button>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- RIGHT SIDE: Info -->
      <div>
        <h1 class="text-2xl sm:text-3xl font-extrabold mb-2">${product.title}</h1>

        <div class="text-pink-600 font-semibold text-lg mb-3">
          <span class="line-through opacity-60 mr-2">${product.mrp || ''}</span>
          <span class="font-extrabold text-black">${active.value}</span>
          <span class="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-pink-600 text-white uppercase">
            ${active.label}${active.badge ? ' ' + active.badge : ''}
          </span>
        </div>

        <ul class="text-sm text-gray-700 space-y-1 mb-6 leading-relaxed">
          <li>Premium quick-dry fabric engineered for durability.</li>
          <li>Moisture-wicking and on-mat performance focused.</li>
          <li>Reinforced stitching at stress points.</li>
        </ul>

        <!-- Colors (placeholder dots; wire up if you add real color variants) -->
        <div class="mb-5">
          <p class="text-xs text-gray-500 mb-2">COLOR</p>
          <div class="flex gap-2">
            <button class="w-8 h-8 rounded-full border" style="background:#000"></button>
            <button class="w-8 h-8 rounded-full border" style="background:#fff"></button>
          </div>
        </div>

        <!-- Sizes -->
        <div class="mb-5">
          <p class="text-xs text-gray-500 mb-2">SIZE</p>
          <div id="sizeOptions" class="flex gap-2 flex-wrap">
            ${(product.sizes || []).map(size => `
              <button class="size-btn border px-5 py-2 rounded-full text-sm hover:bg-black hover:text-white transition" data-size="${size}">
                ${size}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Qty -->
        <div class="flex items-center gap-4 mb-6">
          <label class="text-sm text-gray-500">Quantity</label>
          <div class="flex items-center border px-2 rounded-full">
            <button id="qtyMinus" class="px-3">−</button>
            <input type="number" value="1" id="qty" class="w-14 text-center border-0 focus:outline-none" />
            <button id="qtyPlus" class="px-3">+</button>
          </div>
        </div>

        <button id="detailAddToCart"
          class="w-full sm:w-auto bg-black text-white px-8 py-3 rounded-full hover:bg-pink-600 transition">
          ${(campaignMode === 'presale') ? 'Place your Pre-Launch Order' : '+ ADD TO CART'}
        </button>
      </div>
    </section>
  `;

    // --- wire gallery interactions ---
    const mainImg = document.getElementById('mainImage');
    function setActive(i) {
        const allThumbs = document.querySelectorAll('.thumb-btn img');
        allThumbs.forEach((im, idx) => {
            im.classList.toggle('ring-2', idx === i);
            im.classList.toggle('ring-pink-500', idx === i);
            im.classList.toggle('opacity-100', idx === i);
            im.classList.toggle('opacity-80', idx !== i);
        });
        mainImg.src = encodeURI(gallery[i] || product.image);

    }
    // --- "You may also like" under product detail ---
    const ymalSection = document.createElement('section');
    ymalSection.className = 'px-4 py-10';
    ymalSection.innerHTML = `
<div class="flex justify-center mb-6">
      <img src="./assets/ymal-header.png" alt="You May Also Like" class="max-w-full h-10 object-contain">
    </div>
  <div id="globalRecsDetail" class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 px-4"></div>
`;
    const faq = document.getElementById('faq');
    faq?.parentNode?.insertBefore(ymalSection, faq);

    // Exclude the current product so you don't recommend the same item
    renderGlobalRecommendations('globalRecsDetail', 4, product.title);

    document.querySelectorAll('.thumb-btn').forEach(btn => {
        btn.addEventListener('click', () => setActive(Number(btn.dataset.idx)));
    });

    // --- sizes ---
    let selectedSize = null;
    document.querySelectorAll('.size-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('bg-black', 'text-white'));
            btn.classList.add('bg-black', 'text-white');
            selectedSize = btn.dataset.size;
        });
    });

    // --- qty ---
    document.getElementById('qtyMinus').onclick = () => {
        const qty = document.getElementById('qty');
        qty.value = Math.max(1, Number(qty.value) - 1);
    };
    document.getElementById('qtyPlus').onclick = () => {
        const qty = document.getElementById('qty');
        qty.value = Number(qty.value) + 1;
    };

    // --- add to cart ---
    document.getElementById('detailAddToCart').onclick = () => {
        const quantity = Number(document.getElementById('qty').value);
        if (!selectedSize) {
            alert('Please select a size first.');
            return;
        }
        for (let i = 0; i < quantity; i++) {
            addToCart(product.title, active.value, selectedSize, mainImg.src);
        }
    };
}


function renderYouMayAlsoLike(currentProduct) {
    const others = products.filter(p => p.title !== currentProduct.title);
    if (!others.length) return;

    const section = document.createElement('section');
    section.className = 'px-6 py-12';
    section.innerHTML = `
    <div class="flex justify-center mb-6">
      <img src="./assets/ymal-header.png" alt="You May Also Like" class="max-w-full h-10 object-contain">
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8" id="youMayAlsoContainer"></div>
  `;

    // Insert before FAQ section
    const faq = document.getElementById('faq');
    faq?.parentNode?.insertBefore(section, faq);

    const container = section.querySelector('#youMayAlsoContainer');

    let index = 0;
    function renderBatch() {
        container.innerHTML = '';
        const visibleItems = [...others, ...others]; // wrap-around
        const itemsToShow = visibleItems.slice(index, index + 3);

        itemsToShow.forEach(product => {
            const active = getActivePrice(product);
            const card = document.createElement('div');
            card.className = 'border rounded-xl p-4 bg-white text-black shadow-md hover:shadow-lg transition';

            card.innerHTML = `
        <img src="${product.image}" alt="${product.title}" class="rounded mb-4 w-full object-contain max-h-64 cursor-pointer" />
        <h3 class="font-semibold text-lg mb-1">${product.title}</h3>
        <p class="text-pink-500 font-semibold mb-2">
          <span class="line-through opacity-60 mr-2">${product.mrp || ''}</span>
          <span class="font-extrabold">${active.value}</span>
          <span class="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-pink-600 text-white uppercase">${active.label}${active.badge ? ' ' + active.badge : ''}</span>
        </p>
        <div class="text-yellow-400 mb-4">
          ${product.rating ? '★'.repeat(Math.round(product.rating)) + '☆'.repeat(5 - Math.round(product.rating)) : ''}
        </div>
        <button class="addToCartBtn w-full border border-black py-2 rounded-full text-sm hover:bg-black hover:text-white transition">+ ADD TO CART</button>
      `;

            card.querySelector('img').addEventListener('click', () => showProductDetail(product));
            card.querySelector('.addToCartBtn').addEventListener('click', (e) => {
                e.stopPropagation();
                const size = product.sizes[0] || 'M';
                addToCart(product.title, active.value, size, product.image);
            });

            container.appendChild(card);
        });

        index = (index + 3) % others.length;
    }

    renderBatch();
    setInterval(renderBatch, 3000); // rotate every 3s
}

document.addEventListener('click', async (e) => {
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (['#products', '#blogs', '#contact'].includes(href)) {
        e.preventDefault();
        const targetId = href.replace('#', '');

        // Load index.html into #mainContent
        const res = await fetch('./index.html');
        const html = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const homepageMain = doc.querySelector('#mainContent');
        const main = document.getElementById('mainContent');

        if (homepageMain && main) {
            main.innerHTML = homepageMain.innerHTML;

            // ✅ Reload dynamic HTML sections
            await loadHTML('hero', './hero.html');
            await loadHTML('video', './video.html');
            await loadHTML('products', './products.html');
            await loadHTML('testimonials', './testimonials.html');
            await loadHTML('blogs', './blogs.html');
            setupVideoScrollAnimation();
        }

        // Reload shared sections
        await loadHTML('header', './header.html');
        await loadHTML('faq', './faq.html');
        await loadHTML('contact', './contact.html');

        document.getElementById('mainContent')?.classList.remove('offset-header');

        // Scroll to the section
        setTimeout(() => {
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'smooth' });
            }
        }, 100);
    }
});
async function loadSignupPage() {
    const main = document.getElementById('mainContent');
    if (!main) return;

    const res = await fetch('./signup.html');
    const html = await res.text();
    main.innerHTML = html;

    // Re-inject header (dynamically loaded)
    await loadHTML('header', './header.html');

    // Re-execute signup-specific scripts
    const authScript = document.createElement('script');
    authScript.type = 'module';
    authScript.src = './auth.js';
    document.body.appendChild(authScript);
}


async function loadLoginPage() {
    const main = document.getElementById('mainContent');
    if (!main) return;

    const res = await fetch('./login.html');
    const html = await res.text();
    main.innerHTML = html;

    await loadHTML('header', './header.html');

    // Re-execute login-specific scripts
    const authScript = document.createElement('script');
    authScript.type = 'module';
    authScript.src = './auth.js';
    document.body.appendChild(authScript);
}


async function loadCheckoutPage(prefill = {}) {
    // If the SPA shell is present, render into #pageHost.
    // Otherwise fall back to #mainContent and also load header/faq/contact yourself.
    const host =
        document.getElementById('pageHost') ||
        document.getElementById('mainContent');

    if (!host) return;

    const res = await fetch('./checkout.html');
    const html = await res.text();

    if (host.id === 'pageHost') {
        // Inject ONLY the <main>/<body> portion inside the shell
        const frag = extractMainNode(html);     // returns a <div> with innerHTML of page's main/body
        host.innerHTML = '';
        host.appendChild(frag);
    } else {
        // No shell (direct load) — inject whole page fragment and hydrate shared sections
        host.innerHTML = html;
        await loadHTML('header', './header.html');
        await loadHTML('faq', './faq.html');
        await loadHTML('contact', './contact.html');
    }

    document.getElementById('mainContent')?.classList.add('offset-header');

    // ---- Prefill + wiring (unchanged) ----
    const nameEl = document.getElementById('checkoutName');
    const emailEl = document.getElementById('checkoutEmail');
    const phoneEl = document.getElementById('checkoutPhone');
    const addressEl = document.getElementById('checkoutAddress');

    if (prefill.name && nameEl) nameEl.value = prefill.name;
    if (prefill.email && emailEl) emailEl.value = prefill.email;
    if (prefill.phone && phoneEl) phoneEl.value = prefill.phone;
    if (prefill.address && addressEl) addressEl.value = prefill.address;


    const saveBtn = document.getElementById('saveCheckoutDetails');
    const formFields = ['checkoutName', 'checkoutEmail', 'checkoutPhone', 'checkoutAddress'];

    formFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => saveBtn?.classList.remove('hidden'));
    });

    saveBtn && (saveBtn.onclick = async () => {
        const { db, FS } = await getFirebase();
        const user = window.currentUser;
        if (!db || !user || !FS.doc || !FS.setDoc) {
            alert("Could not save: Firebase not ready.");
            return;
        }
        const data = {
            name: document.getElementById('checkoutName')?.value || '',
            email: document.getElementById('checkoutEmail')?.value || '',
            phone: document.getElementById('checkoutPhone')?.value || '',
            address: document.getElementById('checkoutAddress')?.value || '',
        };
        await FS.setDoc(FS.doc(db, 'users', user.uid), data, { merge: true });
        alert("✅ Checkout info saved!");
        saveBtn.classList.add('hidden');
    });
}


document.addEventListener('click', async (e) => {
    if (e.target.closest('#userIcon')) {
        e.preventDefault();
        const user = window.currentUser;
        if (!user) {
            loadSignupPage();
            return;
        }

        const { db, FS } = await getFirebase();
        let extraInfo = {};
        if (db && FS.doc && FS.getDoc) {
            const docSnap = await FS.getDoc(FS.doc(db, "users", user.uid));
            extraInfo = docSnap.exists ? (docSnap.data?.() || {}) : (docSnap.data ? docSnap.data() : {});
        }

        loadCheckoutPage({
            name: user.displayName || '',
            email: user.email || '',
            phone: extraInfo.phone || '',
            address: extraInfo.address || ''
        });
    }
});

async function discoverGalleryImages(mainImagePath) {
    // Always include the CSV image first as fallback
    const images = [mainImagePath];

    // Example: ./assets/models/thunder-fang.png
    const lastSlash = mainImagePath.lastIndexOf('/');
    const baseDir = mainImagePath.slice(0, lastSlash + 1);   // ./assets/models/
    const baseFile = mainImagePath.slice(lastSlash + 1);     // thunder-fang.png
    const nameOnly = baseFile.replace(/\.[^/.]+$/, '');      // thunder-fang

    // Gallery folder convention: ./assets/models/products/<name>/
    const folder = baseDir + 'products/' + nameOnly + '/';

    // Your naming: "1 - Main", "2", "3", "4", "5"
    const baseNames = ['1 - Main', '2', '3', '4', '5'];
    const exts = ['jpg'];

    const candidates = [];
    for (const bn of baseNames) {
        for (const ext of exts) {
            candidates.push(`${folder}${bn}.${ext}`);
        }
    }

    const found = await probeImages(candidates);

    for (const src of found) {
        if (!images.includes(src)) images.push(src);
    }
    return images;
}


async function probeImages(urls, timeoutMs = 2500) {
    // Try to load each URL as an <img>; return the ones that succeed
    const list = await Promise.all(
        urls.map(u => new Promise(resolve => {
            const img = new Image();
            const done = ok_1 => resolve(ok_1 ? u : null);
            const t = setTimeout(() => { img.src = ''; done(false); }, timeoutMs);

            img.onload = () => { clearTimeout(t); done(true); };
            img.onerror = () => { clearTimeout(t); done(false); };

            // handle spaces & special chars
            img.src = encodeURI(u);
        }))
    );
    return list.filter(Boolean);
}

