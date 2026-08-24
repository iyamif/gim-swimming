"use client";

import { useState, useEffect, useRef } from "react";

const activities = [
  {
    id: 1,
    title: "Latihan Teknik Meluncur",
    description: "Melatih keseimbangan dan keselarasan tubuh di dalam air bagi pemula.",
    image: "/kegiatan/WhatsApp%20Image%202026-08-24%20at%2011.03.50.jpeg",
    tag: "Gliding Technique",
  },
  {
    id: 2,
    title: "Kelas Pengenalan Air Anak",
    description: "Membantu anak-anak beradaptasi dengan air secara bertahap dan ceria.",
    image: "/kegiatan/WhatsApp%20Image%202026-08-24%20at%2011.03.51.jpeg",
    tag: "Kids Class",
  },
  {
    id: 3,
    title: "Latihan Pernapasan Efektif",
    description: "Teknik bernapas yang terarah untuk kenyamanan dan stamina selama berenang.",
    image: "/kegiatan/WhatsApp%20Image%202026-08-24%20at%2011.03.52.jpeg",
    tag: "Breathing Exercise",
  },
  {
    id: 4,
    title: "Pendampingan Instruktur Privat",
    description: "Instruktur berlisensi fokus penuh mendampingi latihan teknik secara intensif.",
    image: "/kegiatan/WhatsApp%20Image%202026-08-24%20at%2011.03.53.jpeg",
    tag: "1-on-1 Lesson",
  },
  {
    id: 5,
    title: "Fun Games & Water Play",
    description: "Sesi permainan edukatif untuk melatih keberanian dan kepercayaan diri di kolam.",
    image: "/kegiatan/WhatsApp%20Image%202026-08-24%20at%2011.03.54.jpeg",
    tag: "Water Play",
  },
];

export default function HeroCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = () => {
    stopTimer();
    timerRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % activities.length);
    }, 5000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  useEffect(() => {
    if (!isPaused) {
      startTimer();
    } else {
      stopTimer();
    }
    return () => stopTimer();
  }, [isPaused]);

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prevIndex) => (prevIndex - 1 + activities.length) % activities.length);
    startTimer();
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prevIndex) => (prevIndex + 1) % activities.length);
    startTimer();
  };

  const handleDotClick = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex(index);
    startTimer();
  };

  return (
    <div
      className="relative w-full aspect-[4/3] overflow-hidden rounded-[2rem] border border-white/10 bg-[#061827] shadow-2xl group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slides */}
      <div className="relative h-full w-full overflow-hidden">
        <div
          className="flex h-full w-full transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="relative h-full w-full flex-shrink-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activity.image}
                alt={activity.title}
                className="h-full w-full object-cover brightness-[0.7]"
              />
              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#061827]/90 via-transparent to-transparent" />

              {/* Caption */}
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <span className="inline-block rounded-full bg-cyan-400/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300 border border-cyan-400/30">
                  {activity.tag}
                </span>
                <h3 className="mt-2 text-lg font-black text-white md:text-xl">
                  {activity.title}
                </h3>
                <p className="mt-1 text-xs text-slate-300 line-clamp-2">
                  {activity.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Left Arrow Button */}
      <button
        onClick={handlePrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#061827]/40 text-white backdrop-blur-md transition hover:bg-cyan-400 hover:text-[#061827] hover:border-cyan-400 opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
        aria-label="Previous Slide"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
          className="h-4 w-4"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>

      {/* Right Arrow Button */}
      <button
        onClick={handleNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#061827]/40 text-white backdrop-blur-md transition hover:bg-cyan-400 hover:text-[#061827] hover:border-cyan-400 opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
        aria-label="Next Slide"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
          className="h-4 w-4"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>

      {/* Indicators / Dots */}
      <div className="absolute bottom-4 right-6 flex gap-1.5 z-10">
        {activities.map((_, index) => (
          <button
            key={index}
            onClick={(e) => handleDotClick(e, index)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index === currentIndex ? "w-5 bg-cyan-400" : "w-1.5 bg-white/40 hover:bg-white/60"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
