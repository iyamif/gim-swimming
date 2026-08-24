export default function CTA() {
  return (
    <section className="relative bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600 py-12 sm:py-16 overflow-hidden">
      {/* Top Wave Divider (Fills with #061827 to cut from testimonials) */}
      <div className="absolute top-0 left-0 w-full overflow-hidden leading-none z-10">
        <svg
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          className="relative block w-full h-[45px] sm:h-[75px] text-[#061827]"
          fill="currentColor"
        >
          <path d="M0,60 C160,105 320,15 480,60 C640,105 800,15 960,60 C1120,105 1280,15 1440,60 L1440,0 L0,0 Z"></path>
        </svg>
      </div>

      {/* Decorative Floating Bubbles / Water Elements */}
      <div className="absolute left-[10%] top-[30%] h-12 w-12 rounded-full bg-white/10 blur-[2px] animate-bounce pointer-events-none" style={{ animationDuration: '4s' }} />
      <div className="absolute right-[20%] bottom-[25%] h-24 w-24 rounded-full bg-white/5 blur-[5px] pointer-events-none animate-pulse" />
      <div className="absolute left-[30%] bottom-[15%] h-8 w-8 rounded-full bg-white/15 blur-[1px] pointer-events-none animate-pulse" />

      {/* Content Container */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-20 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-100">
            Ayo Bergabung!
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl leading-tight">
            Yuk, mulai perjalanan berenangmu sekarang.
          </h2>
        </div>

        <div className="shrink-0">
          <a
            href="/pendaftaran"
            className="inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-sm font-bold text-cyan-600 shadow-md transition-all duration-300 hover:bg-slate-50 hover:shadow-xl hover:scale-105 active:scale-95 cursor-pointer"
          >
            Daftar Siswa Baru Sekarang →
          </a>
        </div>
      </div>

      {/* Bottom Wave Divider (Fills with #020617 - Slate-950 to merge into footer) */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none z-10">
        <svg
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          className="relative block w-full h-[45px] sm:h-[75px] text-[#020617]"
          fill="currentColor"
        >
          <path d="M0,60 C160,15 320,105 480,60 C640,15 800,105 960,60 C1120,15 1280,105 1440,60 L1440,120 L0,120 Z"></path>
        </svg>
      </div>
    </section>
  );
}
