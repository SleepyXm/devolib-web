"use client";

import LandingPage from "@/app/components/units/gsaptest";
import { useEffect } from 'react';
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";


export default function Home() {


  useEffect(() => {
    gsap.registerPlugin(ScrollSmoother, ScrollTrigger);

    const smoother = ScrollSmoother.create({
      wrapper: "#smooth-wrapper",
      content: "#smooth-content",
      smooth: 1,
      effects: true,
    });

    ScrollTrigger.create({
      trigger: ".sticky-left",
      start: "top top",
      end: "bottom bottom",
      pin: true,
      pinSpacing: false,
      scroller: smoother.wrapper(), // this is the key bit
    });

    return () => smoother.kill();
  }, []);


  return (
    <div id="smooth-wrapper">
        <div id="smooth-content">
      <div className="flex min-h-screen items-center justify-center">
        <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 transparent sm:items-start lg:max-w-7xl">
          <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
            <div className="dv-accent">
              <h1 className="dv-headline">DevoLib</h1>
            </div>
            <p className="dv-subtext">
              Looking for a starting point or more instructions? Hit{" "}
              <a
                href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
                className="dv-links"
              >
                Let's get started
              </a>{" "}
              or check out the{" "}
              <a
                href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
                className="dv-links"
              >
                Previews
              </a>{" "}
            </p>
          </div>
          <div className="inline-block">to learn more about Next.js.</div>
          <div className="flex flex-col gap-4 text-base font-medium sm:flex-row z-100">
            <a
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full
              bg-gradient-to-b from-orange-200 to-red-300
              px-5 text-black transition-colors duration-700
              hover:from-orange-300 hover:to-red-300
              md:w-[158px]"
              href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              Let's get started
            </a>
            <a
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full
              bg-gradient-to-r from-green-100 to-blue-300
              px-5 text-black transition-colors duration-700
              hover:from-green-200 hover:to-blue-400
              md:w-[158px]"
              href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              Previews
            </a>
          </div>
        </main>
      </div>
      <div className="w-full z-200 bg-black dark:bg-gradient-to-r from-yellow-100 to-red-300 text-zinc-300 dark:text-zinc-600">

        <section className="dv-marquee-wrap">
            <div className="dv-marquee-track">
              <span className="dv-marquee-text">
                Stuff to be added: Extra Space for the landing page
              </span>
            </div>
          </section>
      </div>
      <LandingPage />
    </div>
    </div>
  );
}
