export default function About() {
  return (
    <section id="tentang" className="bg-white py-24">
      <div className="mx-auto grid max-w-7xl gap-16 px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-600">
            Tentang Kami
          </p>

          <h2 className="mt-4 text-4xl font-black tracking-tight text-[#061827] sm:text-5xl">
            Lebih dari sekadar
            <span className="text-cyan-500"> belajar berenang.</span>
          </h2>
        </div>

        <div>
          <p className="text-lg leading-8 text-slate-600">
            GIM Swimming hadir untuk membantu setiap siswa merasa nyaman,
            aman, dan percaya diri ketika berada di dalam air. Kami percaya
            bahwa kemampuan berenang bukan hanya tentang teknik, tetapi juga
            tentang keberanian dan konsistensi.
          </p>

          <p className="mt-5 text-lg leading-8 text-slate-600">
            Dengan program yang disesuaikan berdasarkan kemampuan siswa,
            proses belajar menjadi lebih terarah dan menyenangkan.
          </p>
        </div>
      </div>
    </section>
  );
}
