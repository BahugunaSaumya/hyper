"use client";

export default function FooterSection() {
  return (
    <section
      className="
        bleed-x bg-black text-white font-sans
        py-10 sm:py-12 px-4 sm:px-12 
        overflow-x-clip overflow-hidden 
        isolate
      "
    >
      <div className="mx-auto w-full max-w-7xl flex flex-col items-center">
        {/* Edge-to-edge logo */}
        <div className="-mx-4 sm:-mx-12 mb-8 sm:mb-10 w-full">
          <img
            src="/assets/hyper-gear.png"
            alt="HYPER GEAR"
            className="block w-full h-auto max-w-none select-none"
            draggable={false}
          />
        </div>

        {/* Divider */}
        <div className="mb-6 sm:mb-8 w-full">
          <img src="/assets/Line 3.png" alt="" className="block w-full max-w-none" />
        </div>
        <div className="w-full flex flex-col md:flex-row items-left gap-10 font-title">
          <div className="flex flex-col gap-4 md:w-2/12">
            <div className="mb-5 font-bold">Pages</div>
            <a href="/" className="hover:underline underline-offset-4">Home</a>
            <a href="/products" className="hover:underline underline-offset-4">Products</a>
            <a href="/#blogs" className="hover:underline underline-offset-4">Blogs</a>
            <a href="/contact" className="hover:underline underline-offset-4">Contact</a>
          </div>
          <div className="flex flex-col gap-4 md:w-4/12">
            <div className="mt-8 md:mt-0 mb-5 font-bold">Help</div>
            <div>Whatsapp Us: +91 8077925417</div>
            <div>Email Us :  hyperfitness.in@gmail.com</div>
          </div>

          <div className="flex flex-col gap-4 md:w-4/12">
            <div className="mt-8 md:mt-0 mb-5 font-bold">Policies</div>
            <a href="/refund-and-return" className="hover:underline underline-offset-4">Refund & Return Policy</a>
            <a href="/shipping" className="hover:underline underline-offset-4">Shipping Policy</a>
            <a href="/privacy" className="hover:underline underline-offset-4">Privacy Policy</a>
            <a href="/terms-of-service" className="hover:underline underline-offset-4">Terms of Service</a>
          </div>

          <div className="inline-flex items-center md:items-start gap-3 mt-8 md:mt-0 md:w-2/12">
            <a
              href="https://www.instagram.com/get_hypergear?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
              target="_blank"
              rel="noreferrer"
              className="inline-flex"
              aria-label="Hyper on Instagram"
            >
              <img
                src="/assets/instagram-icon.avif"
                alt="instagram icon"
                className="w-6 h-6 md:w-6 md:h-6"
                draggable={false}
              />
            </a>
            <a
              href="https://www.facebook.com/share/1BeGxumQfw/?mibextid=wwXIfr"
              target="_blank"
              rel="noreferrer"
              className="inline-flex"
              aria-label="Hyper on Facebook"
            >
              <img
                src="/assets/facebook-icon.png"
                alt="facebook icon"
                className="w-6 h-6 md:w-6 md:h-6"
                draggable={false}
              />
            </a>

            <a
              href="mailto:hyperfitness.in@gmail.com"
              className="inline-flex"
              aria-label="Email Hyper Support"
            >
              <img
                src="/assets/mail-icon.avif"
                alt="mail icon"
                className="w-6 h-6 md:w-6 md:h-6"
                draggable={false}
              />
            </a>
            <a
              href="https://youtube.com/@hypergearindia?si=ei9cJ7wCjZL2pSVk"
              target="_blank"
              rel="noreferrer"
              className="inline-flex"
              aria-label="Hyper on Youtube"
            >
              <img
                src="/assets/youtube-icon.avif"
                alt="youtube icon"
                className="w-7 h-7 md:w-7 md:h-7"
                draggable={false}
              />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
