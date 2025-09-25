export default function ContactSection() {
  return (
    // CONTACT / INSTAGRAM CTA (exact structure preserved, only asset paths changed)
    <section className="bleed-x bg-black text-white font-sans py-12 px-4 sm:px-12">
      <div className="flex flex-col items-center text-center">
        {/* Hyper Logo */}
        <img src="/assets/hyper-gear.png" alt="Hyper Logo" className="w-64 sm:w-80 mb-6" />

        {/* Line Divider */}
        <img src="/assets/Line 3.png" alt="Line" className="w-full max-w-4xl mb-6" />

        {/* Top Bars Row */}
        <div className="flex justify-between items-center w-full max-w-6xl mb-8 px-4 sm:px-8">
          <img src="/assets/hyper-left.png" alt="Left Bars" className="w-24 sm:w-28 md:w-32" />
          <img src="/assets/hyper-right.png" alt="Right Bars" className="w-24 sm:w-28 md:w-32" />
        </div>

        {/* Nav and Instagram Row */}
        <div className="flex flex-col sm:flex-row justify-between w-full max-w-6xl items-start px-4 sm:px-8">
          {/* Navigation Links */}
          <div className="flex flex-nowrap gap-x-4 sm:gap-x-6 md:gap-x-10 text-sm sm:text-base md:text-lg font-bold text-white tracking-wide ml-0">
            <a href="#about" className="hover:underline whitespace-nowrap">About</a>
            <a href="#products" className="hover:underline whitespace-nowrap">Products</a>
            <a href="#blogs" className="hover:underline whitespace-nowrap">Blogs</a>
            <a href="#contact" className="hover:underline whitespace-nowrap">Contact</a>
          </div>

          {/* Instagram Button */}
          <div className="flex items-center bg-white text-black px-4 py-2 rounded gap-2 w-fit mt-6 sm:mt-0 self-end sm:self-start">
            <a href="https://www.instagram.com/hyperfitness.in/" target="_blank" rel="noreferrer">
              <img src="/assets/instagram-icon.png" alt="Instagram" className="w-5 h-5" />
            </a>
            <span className="font-bold">Hyper</span>
          </div>
        </div>
      </div>
    </section>
  );
}
