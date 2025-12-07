export default function ShippingPage() {
    return (
        <section className="max-w-4xl mx-auto px-6 sm:px-8 py-15">
            <h1 className="text-xl mb-6 text-center">SHIPPING POLICY</h1>
            <ul className="list-disc pl-6 space-y-2 mb-8">
                <li>We offer free shipping on all orders above ₹699.</li>
                <li>For orders below ₹699, a shipping fee of ₹49 will be applicable.</li>
            </ul>
            <h3 className="text-sm mb-6">CASH ON DELIVERY(COD) POLICY</h3>
            <p className="mb-8">
                Currently, Cash on Delivery is not available on our platform. We invite you to complete your purchase using our secure online payment options, designed to ensure a safe and seamless shopping experience. If you have any questions or require assistance regarding payment methods, our customer support team is always ready to help.
            </p>
            <h3 className="text-sm mb-6">DOMESTIC SHIPPING (WITHIN INDIA)</h3>
            <ul className="list-disc pl-6 space-y-2">
                <li>To metros - Estimated delivery within 4-5 business days.</li>
                <li>To the rest of India : Estimated delivery within 5-6 business days. </li>
            </ul>
        </section>
    );
}
