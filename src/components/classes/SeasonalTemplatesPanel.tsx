'use client';

import { useState } from 'react';
import { useAsyncMount } from '@/hooks/use-async-mount';
import {
  applyScheduleTemplateAction,
  deleteScheduleTemplateAction,
  listScheduleTemplatesAction,
  saveScheduleTemplateAction,
} from '@/app/(dashboard)/actions';
import type { ClassScheduleTemplate } from '@/services/class-schedule-templates';
import { useAppUi } from '@/components/ui/AppUiProvider';

type Props = {
  onApplied: () => Promise<void>;
};

export default function SeasonalTemplatesPanel({ onApplied }: Props) {
  const { confirm, error: showError } = useAppUi();
  const [templates, setTemplates] = useState<ClassScheduleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [seasonLabel, setSeasonLabel] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');

  const load = async () => {
    const result = await listScheduleTemplatesAction();
    if (result.ok && result.data) setTemplates(result.data);
    else if (!result.ok) showError(result.error);
    setLoading(false);
  };

  useAsyncMount(load, []);

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const result = await saveScheduleTemplateAction({
      name: name.trim(),
      seasonLabel: seasonLabel.trim() || undefined,
      effectiveFrom: effectiveFrom || undefined,
      effectiveTo: effectiveTo || undefined,
    });
    setSaving(false);
    if (!result.ok) {
      showError(result.error);
      return;
    }
    setName('');
    setSeasonLabel('');
    setEffectiveFrom('');
    setEffectiveTo('');
    await load();
  };

  const handleApply = async (template: ClassScheduleTemplate, replaceActive: boolean) => {
    const ok = await confirm({
      title: replaceActive ? 'Replace schedule' : 'Apply template',
      message: replaceActive
        ? `Deactivate all current classes and apply "${template.name}"?`
        : `Add classes from "${template.name}" to the current schedule?`,
      confirmLabel: replaceActive ? 'Replace schedule' : 'Apply template',
      destructive: replaceActive,
    });
    if (!ok) return;

    setApplyingId(template.id);
    const result = await applyScheduleTemplateAction(template.id, replaceActive);
    setApplyingId(null);
    if (!result.ok) {
      showError(result.error);
      return;
    }
    await onApplied();
    await load();
  };

  const handleDelete = async (template: ClassScheduleTemplate) => {
    const ok = await confirm({
      title: 'Delete template',
      message: `Delete "${template.name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;

    const result = await deleteScheduleTemplateAction(template.id);
    if (!result.ok) {
      showError(result.error);
      return;
    }
    await load();
  };

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-4 mb-6 space-y-4">
      <div>
        <p className="text-sm font-medium text-white">Seasonal schedule templates</p>
        <p className="text-white/40 text-xs mt-1">
          Save the current schedule as a named template and apply it when seasons change.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Template name (e.g. Summer 2026)"
          className={inputClass}
        />
        <input
          value={seasonLabel}
          onChange={(e) => setSeasonLabel(e.target.value)}
          placeholder="Season label (optional)"
          className={inputClass}
        />
        <input
          type="date"
          value={effectiveFrom}
          onChange={(e) => setEffectiveFrom(e.target.value)}
          className={inputClass}
        />
        <input
          type="date"
          value={effectiveTo}
          onChange={(e) => setEffectiveTo(e.target.value)}
          className={inputClass}
        />
      </div>

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving || !name.trim()}
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
      >
        {saving ? 'Saving…' : 'Save current schedule as template'}
      </button>

      {loading ? (
        <p className="text-white/30 text-sm">Loading templates…</p>
      ) : templates.length === 0 ? (
        <p className="text-white/30 text-sm">No templates saved yet.</p>
      ) : (
        <div className="space-y-2">
          {templates.map((template) => (
            <div
              key={template.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2"
            >
              <div>
                <p className="text-sm text-white font-medium">{template.name}</p>
                <p className="text-white/40 text-xs">
                  {template.item_count ?? 0} classes
                  {template.season_label ? ` · ${template.season_label}` : ''}
                  {template.effective_from && template.effective_to
                    ? ` · ${template.effective_from} – ${template.effective_to}`
                    : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleApply(template, false)}
                  disabled={applyingId === template.id}
                  className="text-xs text-blue-400 hover:underline disabled:opacity-40"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => void handleApply(template, true)}
                  disabled={applyingId === template.id}
                  className="text-xs text-yellow-400 hover:underline disabled:opacity-40"
                >
                  Replace schedule
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(template)}
                  className="text-xs text-red-400 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
