import { afroCuban } from './library/afro-cuban'
import { aksak } from './library/aksak'
import { bachata } from './library/bachata'
import { baiao } from './library/baiao'
import { ballad } from './library/ballad'
import { bolero } from './library/bolero'
import { bossaNova } from './library/bossa-nova'
import { chaCha } from './library/cha-cha'
import { choro } from './library/choro'
import { country } from './library/country'
import { cumbia } from './library/cumbia'
import { disco } from './library/disco'
import { funk } from './library/funk'
import { gospel } from './library/gospel'
import { gypsyJazz } from './library/gypsy-jazz'
import { hipHop } from './library/hip-hop'
import { jazzWaltz } from './library/jazz-waltz'
import { mediumSwing } from './library/medium-swing'
import { merengue } from './library/merengue'
import { partidoAlto } from './library/partido-alto'
import { popRock } from './library/pop-rock'
import { reggae } from './library/reggae'
import { rock128 } from './library/rock-12-8'
import { samba } from './library/samba'
import { shuffle } from './library/shuffle'
import { slowBlues } from './library/slow-blues'
import { soul } from './library/soul'
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
  partidoAlto,
  baiao,
  choro,
  afroCuban,
  bolero,
  tango,
  chaCha,
  bachata,
  merengue,
  cumbia,
  popRock,
  disco,
  funk,
  soul,
  hipHop,
  gospel,
  shuffle,
  slowBlues,
  rock128,
  reggae,
  country,
  aksak,
]

export function getStyle(id: string): StyleDefinition {
  return STYLES.find((s) => s.id === id) ?? STYLES[0]
}

export type { StyleDefinition } from './types'
