import { useId, type ReactNode } from 'react'

interface Props {
  checked: boolean
  onChange: (next: boolean) => void
  title: string
  help?: string
  disabled?: boolean
  /** Extra content under the help text (e.g. a "Try it" button). */
  children?: ReactNode
}

/** A big, labelled on/off switch row. */
export default function ToggleRow({ checked, onChange, title, help, disabled, children }: Props) {
  const id = useId()
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p id={`${id}-t`} className="font-bold">
            {title}
          </p>
          {help && (
            <p id={`${id}-h`} className="mt-0.5 text-sm text-muted">
              {help}
            </p>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-labelledby={`${id}-t`}
          aria-describedby={help ? `${id}-h` : undefined}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={`relative h-9 w-16 shrink-0 rounded-full border-2 transition-colors disabled:opacity-50 ${
            checked ? 'border-primary bg-primary' : 'border-field bg-surface-2'
          }`}
        >
          <span
            aria-hidden="true"
            className={`absolute top-1/2 size-6 -translate-y-1/2 rounded-full transition-all ${
              checked ? 'left-8 bg-on-primary' : 'left-1 bg-field'
            }`}
          />
        </button>
      </div>
      {children}
    </div>
  )
}
