'use client';

import { useEffect, useState } from 'react';
import { Upload, Download, FileWarning } from 'lucide-react';
import {
  getImportErrorsAction,
  importLeadsCsvAction,
  importMembersCsvAction,
  listImportJobsAction,
} from '@/app/(dashboard)/actions';
import {
  parseCsv,
  csvRowsToObjects,
  MEMBER_IMPORT_TEMPLATE,
  LEAD_IMPORT_TEMPLATE,
} from '@/lib/csv';
import type { ImportJob } from '@/services/migration';

type ImportType = 'members' | 'leads';

export default function MigrationPage() {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [importType, setImportType] = useState<ImportType>('members');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);

  const load = async () => {
    const res = await listImportJobsAction();
    if (res.ok && res.data) setJobs(res.data);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const columnMap: Record<string, string> =
    importType === 'members'
      ? {
          first_name: 'first_name',
          last_name: 'last_name',
          email: 'email',
          phone: 'phone',
          belt_rank: 'belt_rank',
          status: 'status',
          external_id: 'external_id',
        }
      : {
          first_name: 'first_name',
          last_name: 'last_name',
          email: 'email',
          phone: 'phone',
          source: 'source',
          notes: 'notes',
        };

  const handleFile = async (file: File, commit: boolean) => {
    setImporting(true);
    setResult(null);
    const text = await file.text();
    const rows = parseCsv(text);
    const { objects } = csvRowsToObjects(rows, columnMap);
    setPreview(objects.slice(0, 10) as Record<string, string>[]);

    const action =
      importType === 'members'
        ? importMembersCsvAction({
            rows: objects as {
              first_name: string;
              last_name: string;
              email?: string;
              phone?: string;
              belt_rank?: string;
              status?: string;
              external_id?: string;
            }[],
            fileName: file.name,
            dryRun: commit ? false : dryRun,
          })
        : importLeadsCsvAction({
            rows: objects as {
              first_name: string;
              last_name: string;
              email?: string;
              phone?: string;
              source?: string;
              notes?: string;
            }[],
            fileName: file.name,
            dryRun: commit ? false : dryRun,
          });

    const res = await action;
    setImporting(false);
    if (!res.ok) {
      setResult(`Error: ${res.error}`);
      return;
    }
    const d = res.data!;
    setResult(
      `${commit || !dryRun ? 'Import' : 'Dry run'} complete: ${d.success} succeeded, ${d.errors.length} errors.`
    );
    void load();
  };

  const downloadTemplate = () => {
    const tpl = importType === 'members' ? MEMBER_IMPORT_TEMPLATE : LEAD_IMPORT_TEMPLATE;
    const blob = new Blob([tpl], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${importType}-import-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadErrors = async (jobId: string) => {
    const res = await getImportErrorsAction(jobId);
    if (!res.ok || !res.data?.length) return;
    const lines = ['row,error', ...res.data.map((e) => `${e.row_number},"${e.error_message}"`)];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-errors-${jobId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-2">Migration Center</h1>
      <p className="text-white/40 text-sm mb-6">Import members or leads from CSV.</p>

      <div className="flex gap-2 mb-6">
        {(['members', 'leads'] as ImportType[]).map((t) => (
          <button
            key={t}
            onClick={() => { setImportType(t); setPreview([]); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize ${
              importType === t ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="bg-[#111] border border-white/10 rounded-2xl p-6 mb-6 space-y-4">
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 text-sm text-blue-400 hover:underline"
        >
          <Download size={16} /> Download {importType} CSV template
        </button>
        <label className="flex items-center gap-2 text-sm text-white/60">
          <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
          Dry run (validate only, no writes)
        </label>
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl p-10 cursor-pointer hover:border-blue-500/50 transition">
          <Upload size={32} className="text-white/20 mb-2" />
          <span className="text-white/40 text-sm">{importing ? 'Importing...' : 'Upload CSV'}</span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            disabled={importing}
            onChange={(e) => e.target.files?.[0] && void handleFile(e.target.files[0], false)}
          />
        </label>
        {result && <p className="text-sm text-white/60">{result}</p>}
      </div>

      {preview.length > 0 && (
        <div className="mb-6 bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-white/40 text-xs mb-2">Preview (first {preview.length} rows)</p>
          <pre className="text-xs text-white/60 overflow-x-auto">{JSON.stringify(preview, null, 2)}</pre>
        </div>
      )}

      <h2 className="font-semibold text-white mb-3">Import History</h2>
      {loading ? (
        <p className="text-white/30 text-sm">Loading...</p>
      ) : jobs.length === 0 ? (
        <p className="text-white/30 text-sm">No imports yet.</p>
      ) : (
        <div className="space-y-2">
          {jobs.map((j) => (
            <div key={j.id} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex justify-between items-center text-sm">
              <div>
                <p className="text-white font-medium">{j.file_name ?? j.import_type}</p>
                <p className="text-white/30 text-xs">
                  {new Date(j.created_at).toLocaleString()} · {j.success_rows}/{j.total_rows} ok
                  {j.error_rows > 0 && ` · ${j.error_rows} errors`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {j.error_rows > 0 && (
                  <button
                    onClick={() => void downloadErrors(j.id)}
                    className="flex items-center gap-1 text-xs text-yellow-400 hover:underline"
                  >
                    <FileWarning size={12} /> Errors
                  </button>
                )}
                <span className="text-white/40 capitalize">{j.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
