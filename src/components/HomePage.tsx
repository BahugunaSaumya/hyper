// src/components/HomePage.tsx
"use client";

import Header from "./Header";
import Hero from "./Hero";
import VideoSection from "./VideoSection";
import ProductsSection from "./ProductsSection";
import TestimonialsSection from "./TestimonialsSection";
import BlogsSection from "./BlogsSection";
import FaqSection from "./FaqSection";
import FooterSection from "./FooterSection";

export default function HomePage() {
  return (
    <>


     
      <main className="offset-header">
        <div style={{paddingTop: "10px" }}><Hero /></div>
        <VideoSection />
        <ProductsSection />
        <TestimonialsSection />
        <BlogsSection />
        <FaqSection />
        <FooterSection />
      </main>

    </>
  );
}
