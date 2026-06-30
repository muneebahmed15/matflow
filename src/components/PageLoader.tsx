export default function PageLoader({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-blue-500 animate-spin" />
      <p className="text-white/40 text-sm">{label}</p>
    </div>
  )
}
