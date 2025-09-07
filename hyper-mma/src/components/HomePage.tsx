// src/components/HomePage.tsx
"use client";

import Header from "./Header";
import Hero from "./Hero";
import VideoSection from "./VideoSection";
import ProductsSection from "./ProductsSection";
import TestimonialsSection from "./TestimonialsSection";
import BlogsSection from "./BlogsSection";
import FaqSection from "./FaqSection";
import ContactSection from "./ContactSection";

export default function HomePage() {
  return (
    <>


      <Header />
      <main className="offset-header">
        <section id="hero" className="hero-tight"><Hero /></section>
        <section id="video" className="mt-8"><VideoSection /></section>
        <section id="products" className="mt-12"><ProductsSection /></section>
        <section id="testimonials" className="mt-12"><TestimonialsSection /></section>
        <section id="blogs" className="mt-12"><BlogsSection /></section>
        <section id="faq" className="mt-16"><FaqSection /></section>
        <section id="contact" className="mt-16"><ContactSection /></section>
      </main>
    </>
  );
}
