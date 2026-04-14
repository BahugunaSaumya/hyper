"use client";

/**
 * Fly-to-cart animation
 * - sourceEl: element from which the image should fly (usually product image)
 * - imgSrc: image URL to animate
 */
export function flyToCartFrom(
  sourceEl: HTMLElement | null,
  imgSrc: string
) {
  try {
    if (!sourceEl || !imgSrc || typeof window === "undefined") return;

    const rect = sourceEl.getBoundingClientRect();

    // Create flying image
    const ghost = document.createElement("img");
    ghost.src = imgSrc;
    ghost.alt = "";

    Object.assign(ghost.style, {
      position: "fixed",
      left: `${rect.left + rect.width / 2 - 40}px`,
      top: `${rect.top + rect.height / 2 - 40}px`,
      width: "80px",
      height: "80px",
      objectFit: "cover",
      borderRadius: "14px",
      zIndex: "9999",
      pointerEvents: "none",
      opacity: "0.95",
      transform: "translate3d(0,0,0) scale(1)",
      transition:
        "transform 700ms cubic-bezier(.22,.61,.36,1), opacity 700ms",
      boxShadow: "0 12px 30px rgba(0,0,0,.35)",
      background: "#fff",
    } as CSSStyleDeclaration);

    document.body.appendChild(ghost);

    /**
     * END POSITION
     * Adjust these if your cart icon is elsewhere
     */
    const endX = window.innerWidth - 36; // right side
    const endY = 24;                    // top bar area

    const dx = endX - (rect.left + rect.width / 2);
    const dy = endY - (rect.top + rect.height / 2);

    // Trigger animation in next frame
    requestAnimationFrame(() => {
      ghost.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(0.1)`;
      ghost.style.opacity = "0.15";
    });

    // Cleanup
    setTimeout(() => {
      ghost.remove();

      // Optional: notify cart badge / header
      window.dispatchEvent(new CustomEvent("cart:ping"));
    }, 750);
  } catch {
    // fail silently — animation should never break add-to-cart
  }
}
