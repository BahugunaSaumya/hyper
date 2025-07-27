async function loadHTML(id, file) {
    const res = await fetch(file);
    if (!res.ok) throw new Error(`Failed to load ${file}`);
    const data = await res.text();
    document.getElementById(id).innerHTML = data;
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
        container.appendChild(img);
    });

    const p = products[productIndex];
    document.getElementById('highlightedTitle').textContent = p.title;
    document.getElementById('highlightedDesc').textContent = p.desc;
    document.getElementById('highlightedPrice').textContent = '' + p.price;
    document.getElementById('highlightedRating').innerHTML = '★'.repeat(Number(p.rating));
    const sizeSelect = document.getElementById('highlightedSizeSelect');
    sizeSelect.innerHTML = '<option disabled selected>Select size</option>' +
        p.sizes.map(s => `<option>${s}</option>`).join('');
    document.getElementById('highlightedAddToCart').onclick = () => addToCart(p.title, p.price);
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
    wrapper.style.transform = `translateX(-${testimonialIndex * 100}%)`;

    document
        .querySelectorAll("#testimonialDots button")
        .forEach((dot, i) => {
            dot.className = `w-3 h-3 rounded-full ${i === testimonialIndex ? "bg-pink-500" : "bg-gray-500"
                }`;
        });
}

renderTestimonials();
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

let cartItems = [];

function addToCart(title, price) {
    cartItems.push({ title, price });
    updateCart();
    toggleCart(true);
}

function toggleCart(show) {
    document.getElementById('cartOverlay').classList.toggle('hidden', !show);
    document.getElementById('cartSidebar').classList.toggle('translate-x-full', !show);
    document.getElementById('cartDrawer').classList.toggle('translate-y-full', !show);
}

function updateCart() {
    const desktop = document.getElementById('cartItemsDesktop');
    const mobile = document.getElementById('cartItemsMobile');
    const total = cartItems.reduce((sum, i) => sum + Number(i.price), 0);

    desktop.innerHTML = mobile.innerHTML = '';
    cartItems.forEach(item => {
        const div = `<div><div class="font-bold">${item.title}</div><div>₹${item.price}</div></div>`;
        desktop.innerHTML += div;
        mobile.innerHTML += div;
    });

    document.getElementById('cartTotalDesktop').textContent = '₹' + total;
    document.getElementById('cartTotalMobile').textContent = '₹' + total;
}

function handleCheckout() {
    alert('Proceeding to checkout...');
}
