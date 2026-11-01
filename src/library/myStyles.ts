// Styles made in the style lab and saved by the user, kept in this browser

import { labId, normalizeLab, type LabStyle } from '../styles/lab'

const KEY = 'openstand:my-styles'

export const myStyleId = (lab: LabStyle) => `my:${labId(lab)}`

export function loadMyStyles(): LabStyle[] {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown[]
    return saved.map(normalizeLab).filter((s): s is LabStyle => s !== null)
  } catch {
    return []
  }
}

function store(styles: LabStyle[]): LabStyle[] {
  localStorage.setItem(KEY, JSON.stringify(styles))
  return styles
}

// A style with the same name replaces the saved one
export function saveMyStyle(styles: LabStyle[], lab: LabStyle): LabStyle[] {
  const id = myStyleId(lab)
  return store([...styles.filter((s) => myStyleId(s) !== id), lab].sort((a, b) => a.name.localeCompare(b.name)))
}

export function removeMyStyle(styles: LabStyle[], id: string): LabStyle[] {
  return store(styles.filter((s) => myStyleId(s) !== id))
}
