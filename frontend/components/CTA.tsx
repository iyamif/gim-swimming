export default function CTA() {
  return (
    <section className="bg-cyan-400">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-6 py-20 lg:flex-row lg:items-center lg:px-8">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-100">
            Ready to Swim?
          </p>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
            Yuk, mulai perjalanan berenangmu.
          </h2>
        </div>

        <a
          href="/pendaftaran"
          className="rounded-full bg-white px-8 py-4 font-bold text-cyan-500 shadow-sm transition hover:bg-blue-50 hover:shadow-lg"
        >
          Daftar Siswa Baru →
        </a>
      </div>
    </section>
  );
}
