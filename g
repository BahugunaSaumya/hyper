    document.getElementById('productNext')?.addEventListener('click', () => cycleProduct(1));
    document.getElementById('productPrev')?.addEventListener('click', () => cycleProduct(-1));
}

window.addEventListener('DOMContentLoaded', initializeApp);

// ---------------------------- PRODUCTS -----------------------------
let productIndex = 0;
let products = [];

async function setupProducts() {
    const response = await fetch('./assets/hyper-products-sample.csv');
    const csv = await response.text();
    const rows = csv.trim().split('\n').slice(1);
    products = rows.map(row => {
        const parts = row.split(',');
        if (parts.length < 6) return null; // skip malformed rows
        const [title, desc, price, rating, sizes, image] = parts;
        return {
            title,
            desc,
            price,
            rating,
            sizes: sizes.split('|'),
            image
        };
    }).filter(Boolean); // remove nulls

    if (products.length === 0) {
        console.warn('No valid products found.');
        return;
    }

    updateProductCarousel();
    setInterval(() => cycleProduct(1), 4000); // auto-slide every 4s
}