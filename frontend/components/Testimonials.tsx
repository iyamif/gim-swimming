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
      role: "Karyawan Swasta",
      program: "Beginner Class",
      text: "Belajar berenang di usia dewasa awalnya terasa canggung, tetapi pelatih di GIM Swimming sangat profesional dan mengutamakan rasa aman selama proses belajar.",
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
                      <svg
                        key={i}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-5 h-5 text-yellow-400"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ))}
                  </div>

                  {/* SVG Quote Icon */}
                  <svg
                    className="w-8 h-8 text-slate-800 group-hover:text-cyan-500/20 transition-colors duration-300"
                    fill="currentColor"
                    viewBox="0 0 32 32"
                    aria-hidden="true"
                  >
                    <path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z" />
                  </svg>
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
