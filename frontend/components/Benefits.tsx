const benefits = [
  {
    number: "01",
    title: "Instruktur Berpengalaman",
    description:
      "Didampingi instruktur yang fokus pada teknik, keselamatan, dan kenyamanan siswa.",
  },
  {
    number: "02",
    title: "Program Bertahap",
    description:
      "Materi latihan disesuaikan dengan level kemampuan setiap siswa.",
  },
  {
    number: "03",
    title: "Belajar dengan Menyenangkan",
    description:
      "Suasana latihan dibuat nyaman agar siswa lebih percaya diri di dalam air.",
  },
];

export default function Benefits() {
  return (
    <section id="keunggulan" className="bg-slate-50 py-24 border-t border-slate-100">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-16 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-600">
              Kenapa GIM Swimming?
            </p>

            <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
              Latihan yang membuat siswa
              <span className="text-cyan-500"> berkembang.</span>
            </h2>
          </div>

          <div className="divide-y divide-slate-200">
            {benefits.map((benefit) => (
              <div
                key={benefit.number}
                className="grid gap-4 py-8 sm:grid-cols-[80px_1fr]"
              >
                <span className="text-sm font-black text-cyan-500">
                  {benefit.number}
                </span>

                <div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {benefit.title}
                  </h3>
                  <p className="mt-3 max-w-xl leading-7 text-slate-600">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
