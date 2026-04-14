"use client";

import Hero from "./Hero";
import BlogsSection from "./BlogsSection";
import FaqSection from "./FaqSection";
import FooterSection from "./FooterSection";
import ProductCategorySection from "./ProductCategory";
import NewLaunchSection from "./NewLaunchSection";
import ProFighterSection from "./ProFighterSection";

export default function HomePage() {
  return (
    <main className="offset-header">
      <div style={{paddingTop: "10px" }}><Hero /></div>
      <NewLaunchSection />
      <ProductCategorySection />
      <ProFighterSection />
      <BlogsSection />
      <FaqSection />
      <FooterSection />
    </main>
  );
}
