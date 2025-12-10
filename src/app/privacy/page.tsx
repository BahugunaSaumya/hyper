export default function PrivacyPolicyPage() {
  return (
    <section className="max-w-4xl mx-auto px-6 sm:px-8 py-15">
      <h3 className="text-xl mb-6 text-center">PRIVACY POLICY</h3>

      <p className="mb-4">
        At <strong>Hyper</strong>, we respect your privacy and are committed to protecting your
        personal information. This Privacy Policy explains how we collect, use, and safeguard your
        data when you visit our website or make a purchase.
      </p>

      <div className="mb-4">
        1. <strong>Information We Collect</strong>
        <ul className="list-disc pl-6 space-y-2 pt-2">
          <li>
            <strong>Personal Information:</strong> When you make a purchase or create an account, we
            collect details such as your name, email address, phone number, billing, and shipping
            information.
          </li>
          <li>
            <strong>Non-Personal Information:</strong> We may collect data such as browser type,
            device details, IP address, and browsing patterns to improve website performance.
          </li>
        </ul>
      </div>

      <div className="mb-4">
        2. <strong>How We Use Your Information</strong>
        <ul className="list-disc pl-6 space-y-2 pt-2">
          <li>To process orders, payments, and deliveries efficiently.</li>
          <li>To provide customer support and respond to inquiries.</li>
          <li>To send order updates, promotions, and newsletters (only with your consent).</li>
          <li>To analyze site performance and enhance user experience.</li>
        </ul>
      </div>

      <div className="mb-4">
        3. <strong>Sharing of Information</strong>
        <ul className="list-disc pl-6 space-y-2 pt-2">
          <li>
            We do <strong>not</strong> sell, rent, or trade your personal data to third parties.
          </li>
          <li>
            We may share limited information with trusted service providers (e.g., payment gateways,
            logistics partners) to fulfill your orders.
          </li>
        </ul>
      </div>

      <p className="mb-4">
        4. <strong>Data Security</strong>
        <br />
        We implement appropriate security measures to protect your personal data from unauthorized
        access, alteration, or disclosure. However, no method of transmission over the internet is
        completely secure, and we cannot guarantee absolute protection.
      </p>

      <div className="mb-4">
        5. <strong>Your Rights</strong>
        <ul className="list-disc pl-6 space-y-2 pt-2">
          <li>You may request access to the personal information we hold about you.</li>
          <li>
            You can update, correct, or request deletion of your data by contacting our support
            team.
          </li>
        </ul>
      </div>

      <p className="mb-4">
        6. <strong>Third-Party Links</strong>
        <br />
        Our website may contain links to external sites. We are not responsible for the privacy
        practices or content of these third-party websites.
      </p>

      <p className="mb-4">
        7. <strong>Policy Updates</strong>
        <br />
        We may update this Privacy Policy from time to time. The latest version will always be
        available on this page with an updated effective date.
      </p>

      <p className="mb-4">
        8. <strong>Contact Us</strong>
        <br />
        For any questions or concerns regarding this Privacy Policy, please contact us at{" "}
        <a href="mailto:support@gethypergear.com" className="text-blue-600 underline">
          hyperfitness.in@gmail.com
        </a>
        .
      </p>

      <p className="text-sm text-gray-600 mt-6 text-center">
        Last updated: {new Date().toLocaleDateString("en-IN")}
      </p>
    </section>
  );
}
