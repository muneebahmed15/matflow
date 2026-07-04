'use client';

import { useState } from 'react';
import { useAsyncMount } from '@/hooks/use-async-mount';
import { Upload, Download, FileWarning } from 'lucide-react';
import {
  finalizeImportJobAction,
  getImportErrorsAction,
  importAttendanceCsvAction,
  importBeltHistoryCsvAction,
  importLeadsBatchAction,
  importLeadsCsvAction,
  importMembersBatchAction,
  importMembersCsvAction,
  IMPORT_BATCH_SIZE,
  listImportJobsAction,
  rollbackImportJobAction,
  startImportJobAction,
} from '@/app/(dashboard)/actions';
import {
  parseCsv,
  csvRowsToObjects,
  MEMBER_IMPORT_TEMPLATE,
  LEAD_IMPORT_TEMPLATE,
  ATTENDANCE_IMPORT_TEMPLATE,
  BELT_HISTORY_IMPORT_TEMPLATE,
} from '@/lib/csv';
import type { ImportJob } from '@/services/migration';

type ImportType = 'members' | 'leads' | 'attendance' | 'belt_history';

const COLUMN_MAPS: Record<ImportType, Record<string, string>> = {
  members: {
    first_name: 'first_name',
    last_name: 'last_name',
    email: 'email',
    phone: 'phone',
    belt_rank: 'belt_rank',
    status: 'status',
    external_id: 'external_id',
  },
  leads: {
    first_name: 'first_name',
    last_name: 'last_name',
    email: 'email',
    phone: 'phone',
    source: 'source',
    notes: 'notes',
  },
  attendance: {
    email: 'email',
    external_id: 'external_id',
    checked_in_at: 'checked_in_at',
    notes: 'notes',
  },
  belt_history: {
    email: 'email',
    external_id: 'external_id',
    from_belt: 'from_belt',
    to_belt: 'to_belt',
    promoted_at: 'promoted_at',
    notes: 'notes',
  },
};

const TEMPLATES: Record<ImportType, string> = {
  members: MEMBER_IMPORT_TEMPLATE,
  leads: LEAD_IMPORT_TEMPLATE,
  attendance: ATTENDANCE_IMPORT_TEMPLATE,
  belt_history: BELT_HISTORY_IMPORT_TEMPLATE,
};

export default function MigrationPage() {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [importType, setImportType] = useState<ImportType>('members');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [dryRunResult, setDryRunResult] = useState<string | null>(null);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState('');
  const [rollingBack, setRollingBack] = useState<string | null>(null);

  const load = async () => {
    const res = await listImportJobsAction();
    if (res.ok && res.data) setJobs(res.data);
    setLoading(false);
  };

  useAsyncMount(load, []);

  const resetUpload = () => {
    setPreview([]);
    setParsedRows([]);
    setFileName('');
    setDryRunResult(null);
    setResult(null);
    setProgress(0);
  };

  const handleFile = async (file: File) => {
    setImporting(true);
    setResult(null);
    setDryRunResult(null);
    setProgress(0);
    const text = await file.text();
    const rows = parseCsv(text);
    const { objects } = csvRowsToObjects(rows, COLUMN_MAPS[importType]);
    const typedRows = objects as Record<string, string>[];
    setPreview(typedRows.slice(0, 10));
    setParsedRows(typedRows);
    setFileName(file.name);

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const action =
      importType === 'members'
        ? importMembersCsvAction({ rows: objects as any, fileName: file.name, dryRun: true })
        : importType === 'leads'
          ? importLeadsCsvAction({ rows: objects as any, fileName: file.name, dryRun: true })
          : importType === 'attendance'
            ? importAttendanceCsvAction({ rows: objects as any, fileName: file.name, dryRun: true })
            : importBeltHistoryCsvAction({ rows: objects as any, fileName: file.name, dryRun: true });
    /* eslint-enable @typescript-eslint/no-explicit-any */

    const res = await action;
    setImporting(false);
    if (!res.ok) {
      setDryRunResult(`Error: ${res.error}`);
      return;
    }
    const d = res.data!;
    setDryRunResult(
      `Validation complete: ${d.success} rows OK, ${d.errors.length} errors. Review preview, then commit to import.`
    );
  };

  const handleCommit = async () => {
    if (parsedRows.length === 0) return;
    setCommitting(true);
    setResult(null);
    setProgress(0);

    let totalSuccess = 0;
    const allErrors: { row: number; message: string }[] = [];

    if (importType === 'members' || importType === 'leads') {
      const startRes = await startImportJobAction({
        importType,
        fileName,
        totalRows: parsedRows.length,
      });
      if (!startRes.ok) {
        setCommitting(false);
        setResult(`Error: ${startRes.error}`);
        return;
      }
      if (!startRes.data) {
        setCommitting(false);
        setResult('Error: Failed to start import job.');
        return;
      }

      const jobId = startRes.data.jobId;
      for (let i = 0; i < parsedRows.length; i += IMPORT_BATCH_SIZE) {
        const batch = parsedRows.slice(i, i + IMPORT_BATCH_SIZE);
        const batchAction =
          importType === 'members'
            ? importMembersBatchAction({ jobId, rows: batch as never, startIndex: i })
            : importLeadsBatchAction({ jobId, rows: batch as never, startIndex: i });
        const res = await batchAction;
        if (!res.ok) {
          setCommitting(false);
          setResult(`Error: ${res.error}`);
          return;
        }
        if (!res.data) {
          setCommitting(false);
          setResult('Error: Import batch failed.');
          return;
        }
        totalSuccess += res.data.success;
        allErrors.push(...res.data.errors);
        setProgress(Math.round(((i + batch.length) / parsedRows.length) * 100));
      }

      await finalizeImportJobAction({ jobId, success: totalSuccess, errors: allErrors });
    } else {
      setProgress(20);
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const action =
        importType === 'attendance'
          ? importAttendanceCsvAction({ rows: parsedRows as any, fileName, dryRun: false })
          : importBeltHistoryCsvAction({ rows: parsedRows as any, fileName, dryRun: false });
      /* eslint-enable @typescript-eslint/no-explicit-any */
      setProgress(60);
      const res = await action;
      if (!res.ok) {
        setCommitting(false);
        setResult(`Error: ${res.error}`);
        return;
      }
      if (!res.data) {
        setCommitting(false);
        setResult('Error: Import failed.');
        return;
      }
      totalSuccess = res.data.success;
      allErrors.push(...res.data.errors);
      setProgress(100);
    }

    setCommitting(false);
    setResult(`Import complete: ${totalSuccess} succeeded, ${allErrors.length} errors.`);
    resetUpload();
    void load();
  };

  const downloadTemplate = () => {
    const tpl = TEMPLATES[importType];
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

  const handleRollback = async (jobId: string) => {
    if (!confirm('Remove all records created by this import? This cannot be undone.')) return;
    setRollingBack(jobId);
    const res = await rollbackImportJobAction(jobId);
    setRollingBack(null);
    if (!res.ok) {
      setResult(`Rollback failed: ${res.error}`);
      return;
    }
    setResult(`Rolled back import — removed ${res.data?.removed ?? 0} records.`);
    void load();
  };

  const stepIndex =
    parsedRows.length === 0 ? 0 : dryRunResult && !result ? 2 : committing || result ? 3 : 1;

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-2">Migration Center</h1>
      <p className="text-white/40 text-sm mb-6">
        Import members, leads, attendance history, or belt history from CSV.
      </p>

      <ol className="flex gap-2 mb-6 text-xs">
        {['Choose type', 'Upload CSV', 'Preview', 'Commit'].map((label, i) => (
          <li
            key={label}
            className={`flex-1 rounded-lg px-2 py-2 text-center border ${
              i <= stepIndex ? 'border-blue-500/40 bg-blue-500/10 text-white' : 'border-white/10 text-white/30'
            }`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      <div className="flex gap-2 mb-6 flex-wrap">
        {(['members', 'leads', 'attendance', 'belt_history'] as ImportType[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setImportType(t);
              resetUpload();
            }}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize ${
              importType === t ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50'
            }`}
          >
            {t.replace('_', ' ')}
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
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl p-10 cursor-pointer hover:border-blue-500/50 transition">
          <Upload size={32} className="text-white/20 mb-2" />
          <span className="text-white/40 text-sm">{importing ? 'Validating...' : 'Upload CSV to validate'}</span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            disabled={importing || committing}
            onChange={(e) => e.target.files?.[0] && void handleFile(e.target.files[0])}
          />
        </label>
        {dryRunResult && <p className="text-sm text-white/60">{dryRunResult}</p>}
        {(committing || progress > 0) && (
          <div>
            <div className="flex justify-between text-xs text-white/40 mb-1">
              <span>{committing ? 'Importing...' : 'Complete'}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
        {parsedRows.length > 0 && !committing && (
          <button
            onClick={() => void handleCommit()}
            disabled={Boolean(dryRunResult?.startsWith('Error'))}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition"
          >
            Commit import ({parsedRows.length} rows)
          </button>
        )}
        {result && <p className="text-sm text-green-400/80">{result}</p>}
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
                {j.status === 'completed' && (
                  <button
                    onClick={() => void handleRollback(j.id)}
                    disabled={rollingBack === j.id}
                    className="text-xs text-red-400 hover:underline disabled:opacity-40"
                  >
                    {rollingBack === j.id ? 'Rolling back…' : 'Rollback'}
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
