// src/lib/razorpay.ts
export const loadRazorpayScript = () =>
  new Promise((resolve) => {
    console.log("[mock] Loading Razorpay script...");
    (window as any).Razorpay = function (options: any) {
      return {
        open: () => {
          console.log("[mock] Razorpay.open() called with:", options);
          setTimeout(() => {
            const paymentId = "pay_" + Math.random().toString(36).slice(2, 12);
            const orderId = options.order_id || "order_" + Math.random().toString(36).slice(2, 12);
            // recognizable mock signature the server can trust
            const signature = `mock_${orderId}|${paymentId}`;

            const response = {
              razorpay_order_id: orderId,
              razorpay_payment_id: paymentId,
              razorpay_signature: signature,
            };

            console.log("[mock] Payment success:", response);
            options?.handler?.(response);
          }, 5000);
        },
      };
    };
    console.log("[mock] Razorpay script loaded");
    resolve(true);
  });
