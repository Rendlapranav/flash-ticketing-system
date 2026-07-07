export default function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon className="w-4 h-4" />
        </div>
        <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
    </div>
  );
}
