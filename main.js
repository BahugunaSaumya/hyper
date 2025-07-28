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
    if (document.getElementById('carouselContainer')) {
        setupProducts();
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

window.addEventListener('DOMContentLoaded', initializeApp);

// ---------------------------- PRODUCTS -----------------------------
let productIndex = 0;
let products = [];

async function setupProducts() {
    const response = await fetch('./assets/hyper-products-sample.csv');
    const csv = await response.text();
    console.log("csv= " + csv)
    const rows = csv.trim().split('\n').slice(1);
    products = rows.map(row => {
        const parts = row.split(',');
        console.log("parts" + parts)
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
    console.log("products" + products)
    if (products.length === 0) {
        console.warn('No valid products found.');
        return;
    }

    updateProductCarousel();
    setInterval(() => cycleProduct(1), 4000); // auto-slide every 4s
}


function updateProductCarousel() {
    const container = document.getElementById('carouselContainer');
    if (!container) return;

    container.innerHTML = '';
    const total = products.length;
    const left = (productIndex - 1 + total) % total;
    const right = (productIndex + 1) % total;

    [left, productIndex, right].forEach((i, pos) => {
        const img = document.createElement('img');
        img.src = products[i].image;
        img.className = 'carousel-item mx-90';
        if (pos === 0) img.classList.add('carousel-left');
        if (pos === 1) img.classList.add('carousel-center');
        if (pos === 2) img.classList.add('carousel-right');
        img.addEventListener('click', () => showProductDetail(products[i]));
        container.appendChild(img);
    });

    const p = products[productIndex];

    document.getElementById('highlightedTitle').textContent = p.title;
    document.getElementById('highlightedDesc').textContent = p.desc;
    document.getElementById('highlightedPrice').textContent = '' + p.price;
    document.getElementById('highlightedRating').innerHTML = '★'.repeat(Number(p.rating));

    document.getElementById('highlightedAddToCart').onclick = () => {
        showProductDetail(p);
    };
    // const sizeSelect = document.getElementById('highlightedSizeSelect');
    // sizeSelect.innerHTML = '<option disabled selected>Select size</option>' +
    //     p.sizes.map(s => `<option value="${s}">${s}</option>`).join('');

    // // Enable/disable Add to Cart based on size selection
    // const addBtn = document.getElementById('highlightedAddToCart');
    // addBtn.disabled = true;
    // sizeSelect.onchange = () => {
    //     addBtn.disabled = !sizeSelect.value;
    // };

    // addBtn.onclick = () => {
    //     const selectedSize = sizeSelect.value;
    //     if (!selectedSize) {
    //         alert('Please select a size before adding to cart.');
    //         return;
    //     }
    //     addToCart(p.title, p.price, selectedSize);
    // };

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
    const main = document.getElementById('mainContent');
    if (!main) return;

    // Load cart page
    const res = await fetch('./cart.html');
    const html = await res.text();
    main.innerHTML = html;

    // Load other sections
    await loadHTML('faq', './faq.html');
    await loadHTML('contact', './contact.html');
    await loadHTML('header', './header.html');
    document.getElementById('header')?.classList.add('outlined-header');
    document.getElementById('mainContent')?.classList.add('offset-header');

    // Make sure DOM is ready, then render cart content
    await new Promise(resolve => setTimeout(resolve, 50));
    updateCartPageUI();
}



function updateCartUI() {
    console.log('CART STATE:', window.cart);

    const totalDesktop = document.getElementById("cartTotalDesktop");
    document.getElementById('mainContent')?.classList.add('offset-header');

    const totalMobile = document.getElementById("cartTotalMobile");
    const desktopContainer = document.getElementById("cartItemsDesktop");
    const mobileContainer = document.getElementById("cartItemsMobile");

    let total = 0;
    desktopContainer.innerHTML = '';
    mobileContainer.innerHTML = '';

    Object.entries(window.cart).forEach(([key, item]) => {
        const subtotal = parseFloat(item.price.replace(/[^\d.]/g, "")) * item.quantity;
        total += subtotal;

        const html = `
  <div class="flex justify-between items-center border-b border-gray-700 pb-4">
    <div class="flex-1">
      <h4 class="font-bold text-base">${item.name}</h4>
      <p class="text-xs text-gray-400">Size: ${item.size}</p>
      <p class="text-sm text-gray-400">₹${item.price} × ${item.quantity}</p>
    </div>
    <div class="flex items-center gap-2">
      <button onclick="decreaseQuantity('${key}')" class="w-8 h-8 bg-white text-black rounded-full font-bold text-lg hover:bg-pink-500 hover:text-white transition">−</button>
      <span class="text-lg font-semibold">${item.quantity}</span>
      <button onclick="increaseQuantity('${key}')" class="w-8 h-8 bg-white text-black rounded-full font-bold text-lg hover:bg-pink-500 hover:text-white transition">+</button>
    </div>
  </div>
`;
        desktopContainer.innerHTML += html;
        mobileContainer.innerHTML += html;
    });

    const formatted = `₹${total.toLocaleString('en-IN')}`;
    totalDesktop.textContent = formatted;
    totalMobile.textContent = formatted;
}


function updateCartPageUI() {
    const container = document.getElementById('cartPageItems');
    const totalElem = document.getElementById('cartPageTotal');
    if (!container || !totalElem) return;

    const cart = window.cart;
    let total = 0;
    container.innerHTML = '';

    const keys = Object.keys(cart);
    if (keys.length === 0) {
        container.innerHTML = `
          <div class="text-center text-gray-500 text-lg py-20">
            Your cart is empty.
          </div>`;
        totalElem.textContent = '';
        return;
    }

    keys.forEach((key) => {
        const item = cart[key];
        const subtotal = parseFloat(item.price.replace(/[^\d.]/g, "")) * item.quantity;
        total += subtotal;
        console.log(cart[key])

        const productHTML = `
      <div class="flex items-center justify-between border rounded-lg p-4 shadow-sm">
        <div class="flex items-center gap-4">
          <img src="${item.image}" alt="${item.name}" class="w-20 h-20 object-cover rounded" />
          <div>
            <h4 class="font-bold text-lg">${item.name}</h4>
            <p class="text-sm text-gray-500">Size: ${item.size}</p>
            <p class="text-sm text-gray-500">${item.price} × ${item.quantity}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="decreaseQuantity('${key}')" class="w-8 h-8 bg-black text-white rounded-full font-bold text-lg hover:bg-pink-500 hover:text-white transition">−</button>
          <span class="text-lg font-semibold">${item.quantity}</span>
          <button onclick="increaseQuantity('${key}')" class="w-8 h-8 bg-black text-white rounded-full font-bold text-lg hover:bg-pink-500 hover:text-white transition">+</button>
        </div>
      </div>
        `;

        container.innerHTML += productHTML;
    });

    totalElem.textContent = `Total: ₹${total.toLocaleString('en-IN')}`;
}

function increaseQuantity(id) {
    if (window.cart[id]) {
        window.cart[id].quantity++;
        localStorage.setItem('cart', JSON.stringify(window.cart)); // ADD THIS
        updateCartUI();
        updateCartPageUI();
    }
}

function decreaseQuantity(id) {
    if (window.cart[id]) {
        window.cart[id].quantity--;
        if (window.cart[id].quantity < 1) delete window.cart[id];
        localStorage.setItem('cart', JSON.stringify(window.cart)); // ADD THIS
        updateCartUI();
        updateCartPageUI();
    }
}


function addToCart(productTitle, productPrice, selectedSize = 'M', productImage) {
    const key = `${productTitle}_${selectedSize}`;
    if (window.cart[key]) {
        window.cart[key].quantity++;
    } else {
        window.cart[key] = {
            name: productTitle,
            price: productPrice,
            size: selectedSize,
            quantity: 1,
            image: productImage,
        };
    }

    localStorage.setItem('cart', JSON.stringify(window.cart));
    updateCartUI();

    // ✅ Show "Added to cart" notification like checkout does
    const notif = document.getElementById("cartNotification");
    const summary = document.getElementById("cartSummary");

    const itemCount = Object.values(window.cart).reduce((sum, item) => sum + item.quantity, 0);
    const total = Object.values(window.cart).reduce((sum, item) =>
        sum + parseFloat(item.price.replace(/[^\d.]/g, "")) * item.quantity, 0);

    notif.textContent = "Added to cart!";
    notif.classList.remove("opacity-0");
    notif.classList.add("opacity-100");

    summary.textContent = `Items: ${itemCount} | Total: ₹${total}`;
    summary.classList.remove("opacity-0");
    summary.classList.add("opacity-100");

    setTimeout(() => {
        notif.classList.remove("opacity-100");
        notif.classList.add("opacity-0");
        summary.classList.remove("opacity-100");
        summary.classList.add("opacity-0");
    }, 3000);
}


function handleCheckout() {
    const notif = document.getElementById("cartNotification");
    const summary = document.getElementById("cartSummary");

    const itemCount = Object.values(window.cart).reduce((sum, item) => sum + item.quantity, 0);
    const total = Object.values(window.cart).reduce((sum, item) =>
        sum + parseFloat(item.price.replace(/[^\d.]/g, "")) * item.quantity, 0);

    notif.classList.remove("opacity-0");
    notif.classList.add("opacity-100");
    summary.textContent = `Items: ${itemCount} | Total: ₹${total}`;
    summary.classList.remove("opacity-0");
    summary.classList.add("opacity-100");

    setTimeout(() => {
        notif.classList.remove("opacity-100");
        notif.classList.add("opacity-0");
        summary.classList.remove("opacity-100");
        summary.classList.add("opacity-0");
    }, 3000);

    toggleCart(false);
}

async function showProductDetail(product) {
    const main = document.getElementById('mainContent');
    main?.classList.add('offset-header');


    if (main) main.innerHTML = '';


    // Load detail HTML shell
    const res = await fetch('./product-details.html');
    const html = await res.text();
    if (main) main.innerHTML = html;

    // Load FAQ and Contact
    await loadHTML('header', './header.html');
    document.getElementById('header')?.classList.add('outlined-header');

    await loadHTML('faq', './faq.html');
    await loadHTML('contact', './contact.html');

    // Populate product detail
    const container = document.getElementById('productDetailContainer');
    container.innerHTML = `
      <section class="flex flex-col md:flex-row justify-center gap-10 px-6 py-10">
        <div class="flex-1 flex justify-center items-center">
          <img src="${product.image}" class="max-w-md w-full object-contain" />
        </div>
        <div class="flex-1 max-w-md">
          <h2 class="text-3xl font-bold mb-2">${product.title}</h2>
          <p class="text-pink-500 font-semibold text-lg mb-2">${product.price}</p>
          <div class="text-yellow-400 mb-4">
            ${'★'.repeat(Number(product.rating))} ${'☆'.repeat(5 - Number(product.rating))}
          </div>
          <div class="mb-4">
  <label class="block mb-2 font-semibold">SELECT SIZE</label>
  <div id="sizeOptions" class="flex gap-2 flex-wrap">
    ${product.sizes.map(size => `
      <button class="size-btn border px-4 py-2 rounded-full text-sm hover:bg-black hover:text-white transition"
        data-size="${size}">
        ${size}
      </button>
    `).join('')}
  </div>
</div>

          <div class="flex items-center gap-4 mb-4">
            <label>Quantity</label>
            <div class="flex items-center border px-2">
              <button id="qtyMinus">−</button>
              <input type="number" value="1" id="qty" class="w-12 text-center border-0" />
              <button id="qtyPlus">+</button>
            </div>
          </div>
          <button id="detailAddToCart"
            class="bg-black text-white px-6 py-3 rounded-full hover:bg-pink-600 transition">
            + ADD TO CART
          </button>
        </div>
      </section>
    `;

    let selectedSize = null;
    document.querySelectorAll('.size-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('bg-black', 'text-white'));
            btn.classList.add('bg-black', 'text-white');
            selectedSize = btn.dataset.size;
        });
    });

    // Quantity controls
    document.getElementById('qtyMinus').onclick = () => {
        const qty = document.getElementById('qty');
        qty.value = Math.max(1, Number(qty.value) - 1);
    };
    document.getElementById('qtyPlus').onclick = () => {
        const qty = document.getElementById('qty');
        qty.value = Number(qty.value) + 1;
    };

    // Add to Cart
    document.getElementById('detailAddToCart').onclick = () => {
        const quantity = Number(document.getElementById('qty').value);
        if (!selectedSize) {
            alert('Please select a size first.');
            return;
        }
        for (let i = 0; i < quantity; i++) {
            addToCart(product.title, product.price, selectedSize, product.image);
        }
    };
    renderYouMayAlsoLike(product);

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
        const visibleItems = [...others, ...others]; // for wrap-around
        const itemsToShow = visibleItems.slice(index, index + 3);

        itemsToShow.forEach(product => {
            const card = document.createElement('div');
            card.className = 'border rounded-xl p-4 bg-white text-black shadow-md hover:shadow-lg transition';

            card.innerHTML = `
              <img src="${product.image}" alt="${product.title}" class="rounded mb-4 w-full object-contain max-h-64 cursor-pointer" />
              <h3 class="font-semibold text-lg mb-1">${product.title}</h3>
              <p class="text-pink-500 font-semibold mb-2">₹ ${product.price}</p>
              <div class="text-yellow-400 mb-4">
                ${'★'.repeat(Number(product.rating))} ${'☆'.repeat(5 - Number(product.rating))}
              </div>
              <button class="addToCartBtn w-full border border-black py-2 rounded-full text-sm hover:bg-black hover:text-white transition">+ ADD TO CART</button>
            `;

            card.querySelector('img').addEventListener('click', () => showProductDetail(product));
            card.querySelector('.addToCartBtn').addEventListener('click', (e) => {
                e.stopPropagation(); // prevent image click from firing
                addToCart(product.title, product.price, product.sizes[0], product.image);
            });

            container.appendChild(card);
        });

        index = (index + 3) % others.length;
    }

    renderBatch();
    setInterval(renderBatch, 300000); // change every 3s
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


