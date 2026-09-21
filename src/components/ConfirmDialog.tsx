import { useEffect } from 'react';

export interface ConfirmDialogProps {
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, confirmLabel, tone = 'primary', onConfirm, onCancel }: ConfirmDialogProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, onConfirm]);

  const accent = tone === 'danger' ? 'var(--color-red)' : 'var(--color-blue)';

  return (
    <div
      className="overlay-in fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(4,7,11,0.72)' }}
      onClick={onCancel}
    >
      <div
        className="dialog-in w-full max-w-md rounded-2xl border p-6 shadow-2xl"
        style={{ borderColor: 'var(--color-hairline-strong)', backgroundColor: 'var(--color-surface-2)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-start gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg"
            style={{ backgroundColor: `color-mix(in srgb, ${accent} 18%, transparent)`, color: accent }}
            aria-hidden
          >
            {tone === 'danger' ? '⚠' : '✓'}
          </span>
          <div>
            <h3 className="text-base font-bold">{title}</h3>
            <div className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--color-ink-secondary)' }}>
              {message}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border px-4 py-2 text-sm font-semibold transition-colors hover:brightness-125"
            style={{ borderColor: 'var(--color-hairline-strong)', color: 'var(--color-ink-secondary)' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors hover:brightness-110"
            style={{ backgroundColor: accent }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
