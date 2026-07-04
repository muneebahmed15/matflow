'use client';

type Props = {
  value: string;
  onChange: (html: string) => void;
  rows?: number;
  placeholder?: string;
};

function wrapSelection(before: string, after: string) {
  const textarea = document.activeElement as HTMLTextAreaElement | null;
  if (!textarea || textarea.tagName !== 'TEXTAREA') return null;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.slice(start, end);
  const next = textarea.value.slice(0, start) + before + selected + after + textarea.value.slice(end);
  return { next, cursor: start + before.length + selected.length + after.length };
}

export default function BlogRichTextEditor({ value, onChange, rows = 8, placeholder }: Props) {
  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs';

  const apply = (before: string, after: string) => {
    const result = wrapSelection(before, after);
    if (result) onChange(result.next);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {[
          { label: 'B', action: () => apply('<strong>', '</strong>') },
          { label: 'I', action: () => apply('<em>', '</em>') },
          { label: 'H2', action: () => apply('<h2>', '</h2>') },
          { label: 'Link', action: () => apply('<a href="">', '</a>') },
          { label: 'List', action: () => apply('<ul><li>', '</li></ul>') },
        ].map((btn) => (
          <button
            key={btn.label}
            type="button"
            onClick={btn.action}
            className="px-2 py-1 text-xs rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white"
          >
            {btn.label}
          </button>
        ))}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder ?? 'Write HTML body…'}
        className={inputClass}
      />
    </div>
  );
}
