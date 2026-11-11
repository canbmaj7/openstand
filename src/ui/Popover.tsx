import { useEffect, useRef, useState, type ReactNode } from 'react'

interface PopoverProps {
  id: string
  label: ReactNode
  title?: string
  active?: boolean // shows a dot on the button when a setting is on
  className?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: (close: () => void) => ReactNode
}

// A button with a panel that pops up above it; closes on outside click or Escape
export function Popover({ id, label, title, active, className, open: controlledOpen, onOpenChange, children }: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const setOpen = (next: boolean) => {
    setUncontrolledOpen(next)
    onOpenChange?.(next)
  }
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Element | null
      if (!rootRef.current?.contains(target) && !target?.closest(`[data-opens="${id}"]`)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  })

  return (
    <div ref={rootRef} className={`popover ${className ?? ''}`}>
      <button
        className={active ? 'band-toggle band-toggle-active' : 'band-toggle'}
        aria-expanded={open}
        aria-controls={id}
        title={title}
        onClick={() => setOpen(!open)}
      >
        {label}
      </button>
      {open && (
        <section id={id} className="popover-panel">
          {children(() => setOpen(false))}
        </section>
      )}
    </div>
  )
}
