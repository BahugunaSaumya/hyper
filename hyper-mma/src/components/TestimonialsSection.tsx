export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-20 bg-black px-6">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold uppercase text-white">
          WHAT OUR FIGHTERS ARE SAYING
        </h2>
      </div>

      <div className="relative max-w-6xl mx-auto">
        <div className="overflow-hidden">
          <div id="testimonialWrapper" className="flex transition-transform duration-700 ease-in-out space-x-6">
            {/* Slides can be injected/ported later; keeping structure and IDs the same */}
          </div>
        </div>

        {/* Dots */}
        <div className="flex justify-center mt-6 space-x-3" id="testimonialDots"></div>
      </div>
    </section>
  );
}
