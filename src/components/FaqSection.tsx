export default function FaqSection() {
  return (
    <section id="faq" className="bleed-x py-16 relative bg-black px-6">
      <div className="text-center mb-12">
        <img
          src="/assets/frequently-asked-heading.png"
          alt="Frequently Asked Questions"
          className="mx-auto w-[260px] sm:w-[320px] md:w-[380px] h-auto"
        />
      </div>

      <div className="space-y-4 max-w-3xl mx-auto text-white">
        <div className="border-t border-gray-700 pt-4">
          <h4 className="font-bold">Commando tights good value?</h4>
          <p className="text-gray-400">Absolutely. Designed for durability and comfort.</p>
        </div>

        <div className="border-t border-gray-700 pt-4">
          <h4 className="font-bold">How do I order?</h4>
          <p className="text-gray-400">Click a product and checkout. Fast, secure, seamless.</p>
        </div>
      </div>
    </section>
  );
}
