import { afroCuban } from './library/afro-cuban'
import { aksak } from './library/aksak'
import { ballad } from './library/ballad'
import { bossaNova } from './library/bossa-nova'
import { funk } from './library/funk'
import { jazzWaltz } from './library/jazz-waltz'
import { mediumSwing } from './library/medium-swing'
import { popRock } from './library/pop-rock'
import { reggae } from './library/reggae'
import { samba } from './library/samba'
import { shuffle } from './library/shuffle'
import { upTempoSwing } from './library/up-tempo-swing'
import type { StyleDefinition } from './types'

export const STYLES: StyleDefinition[] = [
  mediumSwing,
  upTempoSwing,
  ballad,
  jazzWaltz,
  bossaNova,
  samba,
  afroCuban,
  popRock,
  funk,
  shuffle,
  reggae,
  aksak,
]

export function getStyle(id: string): StyleDefinition {
  return STYLES.find((s) => s.id === id) ?? STYLES[0]
}

export type { StyleDefinition } from './types'
