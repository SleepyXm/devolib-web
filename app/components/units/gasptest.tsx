'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
  const sectionRef = useRef(null);
  const heroRef = useRef(null);

  useEffect(() => {
    // Hero glitch entrance
    gsap.fromTo(
      heroRef.current,
      { 
        opacity: 0, 
        x: -50,
        filter: 'blur(10px)'
      },
      { 
        opacity: 1, 
        x: 0,
        filter: 'blur(0px)',
        duration: 1.2,
        ease: 'power3.out'
      }
    );

    // Scroll-triggered sections
    gsap.utils.toArray('.feature-card').forEach((card: any) => {
      gsap.fromTo(
        card,
        { 
          y: 100, 
          opacity: 0,
          rotate: -5
        },
        {
          y: 0,
          opacity: 1,
          rotate: 0,
          duration: 0.8,
          ease: 'back.out(1.7)',
          scrollTrigger: {
            trigger: card,
            start: 'top 80%',
            end: 'top 50%',
            scrub: 1,
          }
        }
      );
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-red-300 to-blue-300 scroll-smooth">
      {/* Hero */}
      <section ref={heroRef} className="h-screen flex items-center justify-center snap-start snap-always">
        <div className="bg-white border-8 border-black p-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="text-8xl font-black">DEVOLIB</h1>
          <p className="text-2xl mt-4">Build shit. Fast.</p>
        </div>
      </section>

      {/* Feature sections */}
      <section ref={sectionRef} className="min-h-screen py-20 px-8 snap-start snap-always flex flex-col justify-center">
        <div className="feature-card bg-gradient-to-r from-green-100 to-blue-300 border-8 border-black p-8 mb-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-4xl font-black">Fullstack Development Made Ez.</h2>
          <p>Ship Features, Projects, Entire Applications in the time it takes for the coffee to brew.</p>
        </div>
        
        <div className="feature-card bg-gradient-to-r from-yellow-100 to-red-300 border-8 border-black p-8 mb-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-4xl font-black">Feature 2</h2>
          <p>More cool shit</p>
        </div>
      </section>

      <section className="min-h-screen w-full p-16 snap-start snap-always flex items-center">
        <h1 className="text-5xl font-black">Previews</h1>
      </section>
    </div>
  );
}