const programs = [
  {
    title: "Baby Swimming",
    price: "Rp 350.000",
    period: "/ bulan",
    description: "Program baby swimming yang menyenangkan dan aman untuk membantu si kecil mengenal air, melatih keberanian, serta menstimulasi perkembangan motorik dan koordinasi sejak dini.",
    level: "Usia 4–12 tahun",
    features: [
      "4x Sesi Latihan / Bulan",
      "Durasi 30 Menit per Sesi",
      "1 Siswa - 1 Instruktur (Private)",
      "Instruktur Ramah & Sabar",
      "Ujian Level Berkala"
    ],
    pendaftaranParam: "Baby Swimming (Usia 0– 2 tahun)"
  },
  {
    title: "Latihan Prestasi",
    price: "Rp 400.000",
    period: "/ bulan",
    description: "Latihan berenang intensif untuk mengembangkan teknik, daya tahan, kecepatan, dan mental kompetitif guna membantu atlet mencapai prestasi terbaik.",
    level: "Remaja & Dewasa",
    features: [
      "12x Sesi Latihan / Bulan",
      "Durasi 150 Menit per Sesi",
      "Jadwal Senin, Rabu & Jumat ",
      "Jam 15.00 - 17.30",
      "siswa Berjumlah lebih dari 3 - 10 orang",
      "Anak Wajib Mempunyai Alat Latihan"

    ],
    pendaftaranParam: "Prestasi (Latihan Prestasi)"
  },
  {
    title: "Private Class",
    price: "Rp 350.000",
    period: "/ paket",
    description: "Paket pendampingan privat eksklusif dengan koreksi teknik instan dan jadwal fleksibel.",
    level: "Semua Usia",
    features: [
      "4x Sesi Latihan Privat",
      "Durasi 60 Menit per Sesi",
      "1 Siswa - 1 Instruktur (Private)",
      "Konfirmasi Kehadiran Sehari Sebelum Jadwal Latihan.",
      "Bebas Pilih Jadwal Latihan",
      //  "Apabila Pelatih sudah dikolam, siswa tidak hadir maka di pertemuan hangus"
    ],
    pendaftaranParam: "Private Class (1-on-1)",
    popular: true
  }
];

export default function Programs() {
  return (
    <section id="program" className="bg-slate-50 py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-600">
            Daftar Harga Paket
          </p>

          <h2 className="mt-4 text-4xl font-black tracking-tight text-[#061827] sm:text-5xl">
            Paket Kelas Berenang GIM.
          </h2>

          <p className="mt-5 text-lg leading-8 text-slate-600">
            Pilih paket belajar berenang yang paling sesuai dengan kebutuhan, kelompok usia, dan target kemampuan Anda.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3 items-stretch">
          {programs.map((program) => (
            <div
              key={program.title}
              className={`relative flex flex-col rounded-3xl p-8 bg-white transition duration-300 hover:-translate-y-2 hover:shadow-2xl border ${program.popular
                ? "border-cyan-400 border-2 shadow-xl ring-4 ring-cyan-400/5"
                : "border-slate-200"
                }`}
            >
              {program.popular && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-cyan-400 px-4 py-1 text-xs font-bold text-white uppercase tracking-wider shadow-md">
                  Paling Eksklusif
                </span>
              )}

              <div className="flex items-center justify-between">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                  {program.level}
                </span>
              </div>

              <h3 className="mt-6 text-2xl font-black text-slate-900">
                {program.title}
              </h3>

              <div className="mt-4 flex items-baseline">
                <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                  {program.price}
                </span>
                <span className="ml-1 text-sm font-bold text-slate-500">
                  {program.period}
                </span>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-slate-500 flex-grow">
                {program.description}
              </p>

              {/* Divider */}
              <div className="w-full h-px bg-slate-100 my-6" />

              {/* Features List */}
              <ul className="space-y-4 mb-8">
                {program.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={3}
                      stroke="currentColor"
                      className="h-4.5 w-4.5 text-emerald-500 flex-shrink-0 mt-0.5"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    <span className="text-sm font-medium text-slate-600">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Action Button */}
              <a
                href={`/pendaftaran?program=${encodeURIComponent(program.pendaftaranParam)}`}
                className={`block w-full py-3 rounded-full text-center text-sm font-bold transition ${program.popular
                  ? "bg-cyan-400 text-white hover:bg-cyan-300 shadow-md hover:shadow-lg"
                  : "border border-cyan-400 bg-white text-cyan-500 hover:bg-cyan-50"
                  }`}
              >
                Pilih Paket & Daftar →
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
