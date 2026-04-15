export function PageLoader() {
  return (
    <div
      className="min-h-dvh bg-[#0d1117] flex items-center justify-center"
      role="status"
      aria-label="Chargement en cours"
    >
      <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
    </div>
  );
}
