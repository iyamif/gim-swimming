export default function Footer() {
  return (
    <footer className="bg-slate-950 py-12 text-white border-t border-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <p className="text-xl font-black">
            GIM <span className="text-cyan-400">SWIMMING</span>
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Swim • Learn • Grow
          </p>
        </div>

        <div className="flex gap-6 text-sm text-slate-300">
          <a href="#tentang" className="hover:text-cyan-400 transition">
            Tentang
          </a>
          <a href="#program" className="hover:text-cyan-400 transition">
            Program
          </a>
          <a href="/pendaftaran" className="hover:text-cyan-400 transition">
            Pendaftaran
          </a>
        </div>

        <p className="text-sm text-slate-500">
          © {new Date().getFullYear()} GIM Swimming.
        </p>
      </div>
    </footer>
  );
}
