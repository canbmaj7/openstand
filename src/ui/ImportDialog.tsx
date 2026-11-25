import { useEffect, useRef, useState } from 'react'
import type { RestoreSummary } from '../formats/backup'

export type ImportResult =
  | { kind: 'tunes'; tunes: number; playlists: string[] }
  | { kind: 'backup'; summary: RestoreSummary }

interface ImportDialogProps {
  open: boolean
  onClose: () => void
  onImport: (text: string, filename?: string) => Promise<ImportResult>
  onBackup: () => void
}

const plural = (n: number, word: string) => `${n} ${n === 1 ? word : `${word}s`}`

function formatRestoreSummary({ tunes, setlists, styles }: RestoreSummary): string {
  const parts = [`Restored ${plural(tunes.added, 'tune')}, ${plural(setlists.added, 'setlist')}, ${plural(styles.added, 'style')}.`]
  const alreadyHere = tunes.skipped + setlists.skipped + styles.skipped
  if (alreadyHere > 0) {
    parts.push(`${alreadyHere} ${alreadyHere === 1 ? 'was' : 'were'} already here.`)
  }
  if (tunes.invalid > 0) {
    parts.push(`${plural(tunes.invalid, 'invalid tune')} skipped.`)
  }
  return parts.join(' ')
}

export function ImportDialog({ open, onClose, onImport, onBackup }: ImportDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const [text, setText] = useState('')
  const [status, setStatus] = useState<{ kind: 'idle' | 'busy' | 'done' | 'error'; message?: string }>({
    kind: 'idle',
  })

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      setStatus({ kind: 'idle' })
      dialog.showModal()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  const run = async (input: string, filename?: string) => {
    setStatus({ kind: 'busy' })
    try {
      const result = await onImport(input, filename)
      if (result.kind === 'backup') {
        setText('')
        setStatus({ kind: 'done', message: formatRestoreSummary(result.summary) })
        return
      }
      if (result.tunes === 0) {
        setStatus({ kind: 'error', message: 'No iReal Pro links found. Paste a link that starts with irealb://' })
        return
      }
      setText('')
      setStatus({
        kind: 'done',
        message: `Added ${result.tunes} ${result.tunes === 1 ? 'tune' : 'tunes'} to ${result.playlists.join(', ')}.`,
      })
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : String(err) })
    }
  }

  return (
    <dialog ref={ref} className="dialog" onClose={onClose} aria-labelledby="import-title">
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault()
          void run(text)
        }}
      >
        <h2 id="import-title" className="dialog-title">
          Import tunes
        </h2>
        <p className="dialog-text">
          Paste an iReal Pro link (<code>irealb://…</code>) or a whole playlist, or choose an iReal Pro HTML export,{' '}
          <code>.openstand.json</code> chart file, or library backup. Tunes are stored in this browser only.
        </p>
        <textarea
          className="dialog-input"
          rows={5}
          placeholder="irealb://…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="iReal Pro link"
        />
        <div className="dialog-row">
          <label className="file-button">
            Choose file
            <input
              type="file"
              accept=".html,.htm,.txt,.json,.openstand.json"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (file) await run(await file.text(), file.name)
                e.target.value = ''
              }}
            />
          </label>
          <span className="dialog-spacer" />
          <button type="button" className="button" onClick={onClose}>
            Close
          </button>
          <button type="submit" className="button button-primary" disabled={!text.trim() || status.kind === 'busy'}>
            Import
          </button>
        </div>
        <div className="dialog-backup">
          <span className="dialog-backup-text">Save tunes, setlists and custom styles to one file.</span>
          <button type="button" className="button" onClick={onBackup}>
            Back up library
          </button>
        </div>
        {status.message && (
          <p className={status.kind === 'error' ? 'dialog-status dialog-status-error' : 'dialog-status'} role="status">
            {status.message}
          </p>
        )}
      </form>
    </dialog>
  )
}
