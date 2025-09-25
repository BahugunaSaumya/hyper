// src/app/blog/[slug]/page.tsx
import ContactPage from "@/app/contact/page";
import FooterSection from "@/components/FooterSection";
import { notFound } from "next/navigation";

// Keep this in sync with your BlogsSection cards
const BLOGS = [
    {
        slug: "team-hyper-power-passion-and-pure-energy",
        date: "07 July, 2025",
        image: "/assets/blog-1.png",
        title: "Team Hyper: Power, Passion, and Pure Energy",
        body: `
Team Hyper is not just a group of fighters; they are a force fueled by relentless power, unyielding passion, and boundless energy. Each athlete carries the spirit of champions, pushing their limits in every training session and dominating the cage with unmatched intensity. From explosive strikes to flawless technique, Team Hyper embodies the true essence of MMA excellence.

With every fight, Team Hyper ignites the crowd, proving that their power isn’t just physical—it’s a passion that resonates beyond the cage. They inspire aspiring fighters nationwide, showing that with the perfect blend of skill, spirit, and energy, anything is possible.
Team Hyper is more than a team; they are a movement—unstoppable, fearless, and fueled by pure energy every time they step into the arena.
    `.trim(),
    },
    {
        slug: "elevate-your-game-with-hyper",
        date: "07 July, 2025",
        image: "/assets/blog-2.png",
        title: "Elevate Your Game with Hyper—Worn by the Country’s Elite Fighters",
        body: `
Hyper shorts are trusted by MFN fighters like Aminder Bisht and Sagar Thapa for their intense training camps, providing the advanced material and build suited for elite athletes. These shorts feature high-performance fabrics such as polyester blended with spandex for supreme flexibility, complemented by reinforced technical stitching to withstand grappling, striking, and countless high-pressure sessions.

MFN fighters count on Hyper shorts to stay focused and perform at their best, trusting the technical excellence and innovative features to support their demanding routines. With rapid sweat evaporation, superior range of motion, and unmatched durability, Hyper shorts represent a new standard for combat sports apparel in India. These attributes make Hyper not just a choice—but the preferred gear for those who compete and train at the highest levels.
    `.trim(),
    },
    {
        slug: "winning-the-cage-hyper-athletes-shine-at-mfn",
        date: "07 July, 2025",
        image: "/assets/blog-3.png",
        title: "Winning the Cage: Hyper Athletes Shine at MFN",
        body: `
At MFN Contenders 2025, Hyper athletes Indresh Uniyal and Ankit Bhandari stepped up and absolutely owned the cage, putting on a show that electrified the crowd and set a new standard for performance. Their athleticism, poise, and tactical brilliance were undeniable—making every moment in the cage a highlight and earning widespread admiration from fans and peers alike.

Indresh and Ankit brought an infectious energy to the arena, showcasing explosive movement and technical mastery while sporting Hyper shorts that not only performed brilliantly under pressure but stood out style-wise. Their fight night presence was magnetic—fans couldn’t help but cheer for their confidence, commitment, and the radiant impact they brought to the biggest MMA stage. The Hyper shorts added to the spectacle, drawing attention for their sleek look and top-tier functionality, becoming synonymous with high-level performance.
    `.trim(),
    },
];

type PageProps = {
    // NOTE: params is a Promise on the async dynamic API
    params: Promise<{ slug: string }>;
};

// ✅ FIX: await params before using it
export default async function BlogPage({ params }: PageProps) {
    const { slug } = await params; // or: const { use } from "react"; const { slug } = use(params);
    const post = BLOGS.find((b) => b.slug === decodeURIComponent(slug));
    if (!post) return notFound();

    return (
        <main className="bg-white text-black">
            <section className="max-w-5xl mx-auto px-6 pt-10 pb-16">
                {/* Back button that matches your testimonial/blog arrow style */}
                <div className="mb-4">
                    <a
                        href="/#blogs"
                        aria-label="Back to blogs"
                        className="inline-grid h-10 w-10 place-items-center rounded-full bg-black/10 text-black hover:bg-black/15 shadow"
                    >
                        ‹
                    </a>
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-center uppercase">
                    {post.title}
                </h1>

                <p className="mt-3 text-center text-sm text-black/70">{post.date}</p>

                <figure className="mt-8">
                    <img
                        src={post.image}
                        alt={post.title}
                        className="w-full rounded-xl object-cover"
                    />
                </figure>

                <article className="prose prose-neutral max-w-none mt-8 leading-relaxed">
                    {post.body.split("\n\n").map((para, i) => (
                        <p key={i}>{para}</p>
                    ))}
                </article>
            </section>
            <FooterSection/>
        </main>
    );
}
