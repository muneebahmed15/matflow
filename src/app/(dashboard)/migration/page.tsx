'use client';

import { useState } from 'react';
import { useAsyncMount } from '@/hooks/use-async-mount';
import { Upload, Download, FileWarning } from 'lucide-react';
import {
  finalizeImportJobAction,
  getImportErrorsAction,
  importAttendanceCsvAction,
  importBeltHistoryCsvAction,
  importClassesCsvAction,
  importLeadsBatchAction,
  importLeadsCsvAction,
  importMembersBatchAction,
  importMembersCsvAction,
  importSubscriptionsCsvAction,
  IMPORT_BATCH_SIZE,
  listImportJobsAction,
  rollbackImportJobAction,
  startImportJobAction,
  type DuplicateEmailStrategy,
} from '@/app/(dashboard)/actions';
import {
  parseCsv,
  csvRowsToObjects,
  MEMBER_IMPORT_TEMPLATE,
  LEAD_IMPORT_TEMPLATE,
  ATTENDANCE_IMPORT_TEMPLATE,
  BELT_HISTORY_IMPORT_TEMPLATE,
  CLASS_IMPORT_TEMPLATE,
  SUBSCRIPTIONS_IMPORT_TEMPLATE,
} from '@/lib/csv';
import {
  guessColumnMap,
  IMPORT_TARGET_FIELDS,
  type ImportType,
} from '@/lib/import-maps';
import type { ImportJob } from '@/services/migration';
import { listWaiversAction } from '@/app/(dashboard)/actions';
import type { Waiver } from '@/services/waivers';
import MigrationStepper, { type MigrationStep } from '@/components/migration/MigrationStepper';
import CsvColumnMapper from '@/components/migration/CsvColumnMapper';

const TEMPLATES: Record<ImportType, string> = {
  members: MEMBER_IMPORT_TEMPLATE,
  leads: LEAD_IMPORT_TEMPLATE,
  attendance: ATTENDANCE_IMPORT_TEMPLATE,
  belt_history: BELT_HISTORY_IMPORT_TEMPLATE,
  classes: CLASS_IMPORT_TEMPLATE,
  subscriptions: SUBSCRIPTIONS_IMPORT_TEMPLATE,
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
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [mappingConfirmed, setMappingConfirmed] = useState(false);
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateEmailStrategy>('skip');
  const [rawCsvText, setRawCsvText] = useState('');
  const [waivers, setWaivers] = useState<Waiver[]>([]);
  const [waiverImportId, setWaiverImportId] = useState('');
  const [waiverImportResult, setWaiverImportResult] = useState<string | null>(null);
  const [photoImportResult, setPhotoImportResult] = useState<string | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [fetchingSheet, setFetchingSheet] = useState(false);

  const load = async () => {
    const res = await listImportJobsAction();
    if (res.ok && res.data) setJobs(res.data);
    const waiverRes = await listWaiversAction();
    if (waiverRes.ok && waiverRes.data) {
      setWaivers(waiverRes.data.filter((w) => w.is_active));
      if (waiverRes.data[0]) setWaiverImportId(waiverRes.data[0].id);
    }
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
    setCsvHeaders([]);
    setColumnMapping({});
    setMappingConfirmed(false);
    setRawCsvText('');
    setGoogleSheetUrl('');
  };

  const ingestSpreadsheet = (input: {
    csvText: string;
    headers: string[];
    name: string;
  }) => {
    setResult(null);
    setDryRunResult(null);
    setProgress(0);
    setMappingConfirmed(false);
    setRawCsvText(input.csvText);
    setCsvHeaders(input.headers);
    setColumnMapping(guessColumnMap(input.headers, IMPORT_TARGET_FIELDS[importType]));
    setFileName(input.name);
    setPreview([]);
    setParsedRows([]);
  };

  const handleGoogleSheetImport = async () => {
    if (!googleSheetUrl.trim()) return;
    setFetchingSheet(true);
    setDryRunResult(null);
    try {
      const res = await fetch('/api/migration/fetch-google-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: googleSheetUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDryRunResult(`Error: ${data.error ?? 'Failed to fetch Google Sheet'}`);
        return;
      }
      ingestSpreadsheet({
        csvText: data.csvText as string,
        headers: data.headers as string[],
        name: data.fileName as string,
      });
      setDryRunResult(`Loaded ${data.rowCount as number} rows from Google Sheets. Map columns and validate.`);
    } finally {
      setFetchingSheet(false);
    }
  };

  const applyMapping = (rows: string[][], mapping: Record<string, string>) => {
    const { objects } = csvRowsToObjects(rows, mapping);
    return objects as Record<string, string>[];
  };

  const runDryRun = async (typedRows: Record<string, string>[], name: string) => {
    setImporting(true);
    setDryRunResult(null);

    const action =
      importType === 'members'
        ? importMembersCsvAction({
            rows: typedRows,
            fileName: name,
            dryRun: true,
            duplicateEmailStrategy: duplicateStrategy,
          })
        : importType === 'leads'
          ? importLeadsCsvAction({ rows: typedRows, fileName: name, dryRun: true })
          : importType === 'attendance'
            ? importAttendanceCsvAction({ rows: typedRows, fileName: name, dryRun: true })
            : importType === 'classes'
              ? importClassesCsvAction({ rows: typedRows, fileName: name, dryRun: true })
              : importType === 'subscriptions'
                ? importSubscriptionsCsvAction({ rows: typedRows, fileName: name, dryRun: true })
                : importBeltHistoryCsvAction({ rows: typedRows, fileName: name, dryRun: true });

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

  const handleFile = async (file: File) => {
    setResult(null);
    setDryRunResult(null);
    setProgress(0);
    setMappingConfirmed(false);

    const isXlsx = file.name.toLowerCase().endsWith('.xlsx');

    if (isXlsx) {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/migration/parse-spreadsheet', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setDryRunResult(`Error: ${data.error ?? 'Failed to parse spreadsheet'}`);
        return;
      }
      ingestSpreadsheet({
        csvText: data.csvText as string,
        headers: data.headers as string[],
        name: file.name,
      });
      return;
    }

    const text = await file.text();
    setRawCsvText(text);
    const rows = parseCsv(text);
    if (rows.length < 2) {
      setDryRunResult('Error: CSV must include a header row and at least one data row.');
      return;
    }
    const headers = rows[0].map((h) => h.trim()).filter(Boolean);
    const mapping = guessColumnMap(headers, IMPORT_TARGET_FIELDS[importType]);
    setCsvHeaders(headers);
    setColumnMapping(mapping);
    setFileName(file.name);
    setPreview([]);
    setParsedRows([]);
  };

  const handleValidateMapped = async () => {
    if (!rawCsvText) return;
    const rows = parseCsv(rawCsvText);
    const typedRows = applyMapping(rows, columnMapping);
    setPreview(typedRows.slice(0, 10));
    setParsedRows(typedRows);
    setMappingConfirmed(true);
    await runDryRun(typedRows, fileName);
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
            ? importMembersBatchAction({
                jobId,
                rows: batch,
                startIndex: i,
                duplicateEmailStrategy: duplicateStrategy,
              })
            : importLeadsBatchAction({ jobId, rows: batch, startIndex: i });
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

      await finalizeImportJobAction({
        jobId,
        importType,
        fileName,
        success: totalSuccess,
        errors: allErrors,
      });
    } else {
      setProgress(20);
      const action =
        importType === 'attendance'
          ? importAttendanceCsvAction({ rows: parsedRows, fileName, dryRun: false })
          : importType === 'classes'
            ? importClassesCsvAction({ rows: parsedRows, fileName, dryRun: false })
            : importType === 'subscriptions'
              ? importSubscriptionsCsvAction({ rows: parsedRows, fileName, dryRun: false })
              : importBeltHistoryCsvAction({ rows: parsedRows, fileName, dryRun: false });
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
    csvHeaders.length === 0
      ? 0
      : !mappingConfirmed
        ? 1
        : dryRunResult && !result
          ? 2
          : committing || result
            ? 3
            : 1;

  const steps: MigrationStep[] = ['Choose type', 'Upload file', 'Preview', 'Commit'].map(
    (label, i) => ({
      id: String(i),
      label,
      status: i < stepIndex ? 'complete' : i === stepIndex ? 'current' : 'upcoming',
    })
  );

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-2">Migration Center</h1>
      <p className="text-white/40 text-sm mb-6">
        Import members, leads, class schedules, attendance history, or belt history from CSV, Excel (.xlsx), or a public Google Sheet.
      </p>

      <MigrationStepper steps={steps} />

      <div className="flex gap-2 mb-6 flex-wrap">
        {(['members', 'leads', 'classes', 'attendance', 'belt_history', 'subscriptions'] as ImportType[]).map((t) => (
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

      {(importType === 'subscriptions' ||
        (importType === 'members' && columnMapping.stripe_customer_id)) && (
        <div className="mb-6 flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-sm text-amber-200">
          <FileWarning size={18} className="shrink-0 mt-0.5" />
          <p>
            Card data cannot be imported. Only Stripe customer IDs can be mapped — members must
            update payment methods in the portal or via Stripe Billing Portal.
          </p>
        </div>
      )}

      <div className="bg-[#111] border border-white/10 rounded-2xl p-6 mb-6 space-y-4">
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 text-sm text-blue-400 hover:underline"
        >
          <Download size={16} /> Download {importType} CSV template
        </button>

        {importType === 'members' && (
          <label className="flex items-center justify-between gap-4 text-sm text-white/70">
            <span>Duplicate email strategy</span>
            <select
              value={duplicateStrategy}
              onChange={(e) => setDuplicateStrategy(e.target.value as DuplicateEmailStrategy)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm"
            >
              <option value="skip">Skip existing</option>
              <option value="update">Update existing</option>
              <option value="error">Fail on duplicate</option>
            </select>
          </label>
        )}

        <label className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl p-10 cursor-pointer hover:border-blue-500/50 transition">
          <Upload size={32} className="text-white/20 mb-2" />
          <span className="text-white/40 text-sm">
            {fileName ? `Selected: ${fileName}` : importing ? 'Validating...' : 'Upload CSV or .xlsx file'}
          </span>
          <input
            type="file"
            accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            disabled={importing || committing || fetchingSheet}
            onChange={(e) => e.target.files?.[0] && void handleFile(e.target.files[0])}
          />
        </label>

        <div className="border-t border-white/10 pt-4 space-y-3">
          <p className="text-white/50 text-sm">Or import from Google Sheets (public link)</p>
          <input
            type="url"
            value={googleSheetUrl}
            onChange={(e) => setGoogleSheetUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={importing || committing || fetchingSheet}
          />
          <button
            type="button"
            onClick={() => void handleGoogleSheetImport()}
            disabled={!googleSheetUrl.trim() || importing || committing || fetchingSheet}
            className="w-full bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm transition"
          >
            {fetchingSheet ? 'Fetching sheet…' : 'Import from Google Sheets'}
          </button>
          <p className="text-white/30 text-xs">
            Sheet must be shared as “Anyone with the link can view”. OAuth for private sheets is not required for public links.
          </p>
        </div>

        {csvHeaders.length > 0 && !mappingConfirmed && (
          <>
            <CsvColumnMapper
              importType={importType}
              csvHeaders={csvHeaders}
              mapping={columnMapping}
              onChange={setColumnMapping}
            />
            <button
              type="button"
              onClick={() => void handleValidateMapped()}
              disabled={importing}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition"
            >
              {importing ? 'Validating...' : 'Apply mapping & validate'}
            </button>
          </>
        )}

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
        {parsedRows.length > 0 && mappingConfirmed && !committing && (
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

      <div className="bg-[#111] border border-white/10 rounded-2xl p-6 mb-8 space-y-6">
        <h2 className="font-semibold text-white">Bulk imports</h2>

        <div className="space-y-3">
          <p className="text-white/40 text-sm">Signed waiver PDFs — name files <code className="text-white/60">email.pdf</code></p>
          <select
            value={waiverImportId}
            onChange={(e) => setWaiverImportId(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
          >
            {waivers.map((w) => (
              <option key={w.id} value={w.id} className="bg-gray-900">{w.title}</option>
            ))}
          </select>
          <label className="flex flex-col items-center border border-dashed border-white/10 rounded-xl p-6 cursor-pointer hover:border-blue-500/40">
            <span className="text-white/40 text-sm">Select PDF files (multi)</span>
            <input
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={async (e) => {
                const files = e.target.files;
                if (!files?.length || !waiverImportId) return;
                setBulkUploading(true);
                setWaiverImportResult(null);
                const form = new FormData();
                form.append('waiver_id', waiverImportId);
                for (const f of files) form.append('files', f);
                const res = await fetch('/api/migration/import-waiver-pdfs', { method: 'POST', body: form });
                const data = await res.json();
                setBulkUploading(false);
                setWaiverImportResult(
                  res.ok
                    ? `Imported ${data.success} waiver(s), ${data.errors?.length ?? 0} error(s).`
                    : `Error: ${data.error ?? 'Import failed'}`
                );
              }}
            />
          </label>
          {waiverImportResult && <p className="text-sm text-green-400/80">{waiverImportResult}</p>}
        </div>

        <div className="space-y-3 border-t border-white/10 pt-6">
          <p className="text-white/40 text-sm">Member photos — upload a zip of <code className="text-white/60">email.jpg</code> files (auto-resized)</p>
          <label className="flex flex-col items-center border border-dashed border-white/10 rounded-xl p-6 cursor-pointer hover:border-blue-500/40">
            <span className="text-white/40 text-sm">{bulkUploading ? 'Uploading…' : 'Select photo zip'}</span>
            <input
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setBulkUploading(true);
                setPhotoImportResult(null);
                const form = new FormData();
                form.append('file', file);
                const res = await fetch('/api/migration/import-photo-zip', { method: 'POST', body: form });
                const data = await res.json();
                setBulkUploading(false);
                setPhotoImportResult(
                  res.ok
                    ? `Updated ${data.success} photo(s), ${data.errors?.length ?? 0} error(s).`
                    : `Error: ${data.error ?? 'Import failed'}`
                );
              }}
            />
          </label>
          {photoImportResult && <p className="text-sm text-green-400/80">{photoImportResult}</p>}
        </div>
      </div>

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
