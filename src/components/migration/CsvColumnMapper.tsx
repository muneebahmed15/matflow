'use client';

import { IMPORT_TARGET_FIELDS, type ImportType } from '@/lib/import-maps';

type Props = {
  importType: ImportType;
  csvHeaders: string[];
  mapping: Record<string, string>;
  onChange: (mapping: Record<string, string>) => void;
};

export default function CsvColumnMapper({ importType, csvHeaders, mapping, onChange }: Props) {
  const fields = IMPORT_TARGET_FIELDS[importType];

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
      <p className="text-white/60 text-sm font-medium">Map CSV columns</p>
      <div className="space-y-2">
        {fields.map((field) => (
          <label key={field} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-white/70 font-mono text-xs">{field}</span>
            <select
              value={mapping[field] ?? ''}
              onChange={(e) =>
                onChange({
                  ...mapping,
                  [field]: e.target.value,
                })
              }
              className="bg-[#111] border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs min-w-[160px]"
            >
              <option value="">— skip —</option>
              {csvHeaders.map((header) => (
                <option key={header} value={header}>
                  {header}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}
