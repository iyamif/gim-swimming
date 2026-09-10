import { Star, Quote } from "lucide-react";

export default function Testimonials() {
  const testimonials = [
    {
      id: 1,
      name: "Budi Santoso",
      role: "Orang Tua dari Rian (8 tahun)",
      program: "Kids Swimming",
      text: "Pelatihnya sangat sabar dan metodenya menyenangkan. Anak saya yang tadinya takut air, sekarang malah selalu antusias setiap jadwal latihan renang tiba.",
      rating: 5,
      initials: "BS",
      gradient: "from-cyan-400 to-blue-500",
    },
    {
      id: 2,
      name: "Siti Rahma",
      role: "Mahasiswi",
      program: "Private Class",
      text: "Kelas Private 1-on-1 sangat membantu saya menguasai teknik gaya dada hanya dalam 4 sesi latihan. Jadwal dan lokasinya sangat fleksibel sesuai kebutuhan.",
      rating: 5,
      initials: "SR",
      gradient: "from-emerald-400 to-teal-500",
    },
    {
      id: 3,
      name: "Andi Wijaya",
      role: "Atlet / Perenang Dewasa",
      program: "Latihan Prestasi",
      text: "Program Latihan Prestasi di GIM Swimming sangat intensif dan terstruktur. Teknik pernapasan, daya tahan, dan catatan waktu saya meningkat pesat!",
      rating: 5,
      initials: "AW",
      gradient: "from-purple-400 to-indigo-500",
    },
  ];

  return (
    <section id="testimoni" className="relative bg-[#061827] py-24 overflow-hidden border-t border-slate-900">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/10 h-72 w-72 rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/10 h-72 w-72 rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-400">
            Testimoni
          </p>
          <h2 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
            Cerita Sukses <span className="text-cyan-400">Siswa Kami</span>
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Dengarkan pengalaman langsung dari para orang tua dan siswa yang telah bergabung bersama GIM Swimming.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {testimonials.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-3xl bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-8 shadow-xl hover:border-cyan-500/40 transition-all duration-300 group hover:-translate-y-1"
            >
              <div>
                {/* Stars and Quote */}
                <div className="flex items-center justify-between gap-4 mb-6">
                  {/* Star Rating Icons */}
                  <div className="flex gap-1">
                    {[...Array(item.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 fill-amber-400 text-amber-400"
                      />
                    ))}
                  </div>

                  {/* Lucide Quote Icon */}
                  <Quote className="w-7 h-7 text-slate-700 group-hover:text-cyan-400/40 transition-colors duration-300" />
                </div>

                {/* Testimony Text */}
                <p className="text-base leading-relaxed text-slate-300 group-hover:text-white transition-colors duration-300">
                  "{item.text}"
                </p>
              </div>

              {/* User Info */}
              <div className="mt-8 flex items-center gap-4 pt-6 border-t border-slate-800/60">
                {/* Avatar Placeholder using beautiful gradient */}
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${item.gradient} text-sm font-black text-white shadow-md`}
                >
                  {item.initials}
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white tracking-tight">
                    {item.name}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {item.role}
                  </p>
                  
                  {/* Badge */}
                  <span className="inline-block mt-2 rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-bold text-cyan-400">
                    {item.program}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
