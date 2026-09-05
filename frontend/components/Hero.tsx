import HeroCarousel from "./HeroCarousel";

export default function Hero() {
  return (
    <section className="relative min-h-screen bg-white pt-[calc(4.5rem+env(safe-area-inset-top,0px))] sm:pt-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_40%,rgba(37,99,235,0.08),transparent_40%)]" />

      <div className="relative mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl items-center gap-12 px-6 pt-2 pb-16 lg:pt-6 lg:pb-20 lg:grid-cols-2 lg:px-8">
        <div>
          <h1 className="max-w-3xl text-3xl sm:text-5xl lg:text-7xl font-black leading-[1.1] tracking-tight text-slate-900">
            Belajar Berenang.
            <br />
            <span className="text-cyan-500">Tumbuh Lebih Percaya Diri.</span>
          </h1>

          {/* Mobile Carousel */}
          <div className="block lg:hidden mt-4">
            <HeroCarousel />
          </div>

          <p className="mt-4 lg:mt-7 max-w-xl text-base sm:text-lg leading-relaxed sm:leading-8 text-slate-600">
            GIM Swimming membantu anak dan pemula membangun kemampuan
            berenang dengan latihan yang aman, terarah, dan menyenangkan.
          </p>

          <div className="mt-5 lg:mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href="/pendaftaran"
              className="rounded-full bg-cyan-400 px-7 py-3.5 text-center font-bold text-white transition hover:bg-cyan-300 shadow-md hover:shadow-lg"
            >
              Daftar Siswa Baru →
            </a>

            <a
              href="https://wa.me/628973180423?text=Halo%20Admin%20GIM%20Swimming%2C%20saya%20ingin%20tanya%20mengenai%20jadwal%20dan%20kelas%20berenang."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-500 bg-white px-7 py-3.5 text-center font-bold text-emerald-600 transition hover:bg-emerald-50 shadow-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo/wa.png"
                alt="WhatsApp"
                className="h-5 w-5 object-contain"
              />
              Hubungi via WhatsApp
            </a>
          </div>

          <div className="mt-12 flex gap-10 border-t border-slate-100 pt-8">
            <div>
              <p className="text-3xl font-black text-slate-900">100+</p>
              <p className="mt-1 text-sm text-slate-500">Siswa</p>
            </div>
            <div>
              <p className="text-3xl font-black text-slate-900">5+</p>
              <p className="mt-1 text-sm text-slate-500">Tahun pengalaman</p>
            </div>
            <div>
              <p className="text-3xl font-black text-slate-900">4</p>
              <p className="mt-1 text-sm text-slate-500">Program latihan</p>
            </div>
          </div>
        </div>

        {/* Desktop Carousel */}
        <div className="relative hidden lg:block w-full mt-10 lg:mt-0">
          <div className="absolute -right-10 -top-10 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
          <HeroCarousel />
        </div>
      </div>
    </section>
  );
}
