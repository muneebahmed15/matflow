type Props = {
  accent?: string;
};

const SIZES = [
  { size: 'A0', height: "5'2\" – 5'5\"", weight: '100 – 130 lbs' },
  { size: 'A1', height: "5'5\" – 5'8\"", weight: '130 – 160 lbs' },
  { size: 'A2', height: "5'8\" – 5'11\"", weight: '160 – 190 lbs' },
  { size: 'A3', height: "5'11\" – 6'2\"", weight: '190 – 220 lbs' },
  { size: 'A4', height: "6'2\" – 6'5\"", weight: '220 – 260 lbs' },
];

export default function GiSizingChart({ accent = '#2563eb' }: Props) {
  return (
    <div className="mt-8 border border-white/10 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10" style={{ backgroundColor: `${accent}22` }}>
        <h2 className="font-semibold text-white text-sm">Gi sizing chart</h2>
        <p className="text-white/40 text-xs mt-0.5">Approximate fit — pre-shrunk pearl weave</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-white/40 text-xs uppercase tracking-wide">
              <th className="px-4 py-2">Size</th>
              <th className="px-4 py-2">Height</th>
              <th className="px-4 py-2">Weight</th>
            </tr>
          </thead>
          <tbody>
            {SIZES.map((row) => (
              <tr key={row.size} className="border-t border-white/5 text-white/70">
                <td className="px-4 py-2 font-medium text-white">{row.size}</td>
                <td className="px-4 py-2">{row.height}</td>
                <td className="px-4 py-2">{row.weight}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
