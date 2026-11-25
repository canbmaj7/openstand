import { afroCuban } from './library/afro-cuban'
import { aksak } from './library/aksak'
import { ballad } from './library/ballad'
import { bolero } from './library/bolero'
import { bossaNova } from './library/bossa-nova'
import { country } from './library/country'
import { funk } from './library/funk'
import { gypsyJazz } from './library/gypsy-jazz'
import { jazzWaltz } from './library/jazz-waltz'
import { mediumSwing } from './library/medium-swing'
import { popRock } from './library/pop-rock'
import { reggae } from './library/reggae'
import { samba } from './library/samba'
import { shuffle } from './library/shuffle'
import { swingTwoFour } from './library/swing-two-four'
import { tango } from './library/tango'
import { upTempoSwing } from './library/up-tempo-swing'
import type { StyleDefinition } from './types'

export const STYLES: StyleDefinition[] = [
  mediumSwing,
  swingTwoFour,
  upTempoSwing,
  ballad,
  jazzWaltz,
  gypsyJazz,
  bossaNova,
  samba,
  afroCuban,
  bolero,
  tango,
  popRock,
  funk,
  shuffle,
  reggae,
  country,
  aksak,
]

export function getStyle(id: string): StyleDefinition {
  return STYLES.find((s) => s.id === id) ?? STYLES[0]
}

export type { StyleDefinition } from './types'
