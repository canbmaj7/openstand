# OpenStand chart format (version 1)

A chart is a JSON document (saved with the `.openstand.json` file extension). It is what the library stores, what share links carry, and what the
accompaniment engine reads. The TypeScript types live in [`src/music/chart.ts`](../src/music/chart.ts).

```json
{
  "format": "openstand-chart",
  "version": 1,
  "title": "Blues in F",
  "composer": "Traditional",
  "style": "medium-swing",
  "key": 5,
  "bpm": 140,
  "time": [4, 4],
  "bars": [
    { "chords": [{ "symbol": "F7", "beats": 4 }], "cells": 4, "rowStart": true, "section": "A" },
    { "chords": [{ "symbol": "Bb7", "beats": 2 }, { "symbol": "Bo7", "beats": 2 }], "cells": 4 },
    { "chords": [], "cells": 4 },
    { "chords": [{ "symbol": "C-7", "beats": 2 }, { "symbol": "F7", "beats": 2 }], "cells": 4, "barline": "final" }
  ]
}
```

## Chart

| Field | Type | Meaning |
| --- | --- | --- |
| `format`, `version` | `"openstand-chart"`, `1` | Identifies the format |
| `title` | string | |
| `composer` | string, optional | |
| `style` | string | OpenStand style id: `medium-swing`, `ballad`, `bossa-nova`, `pop-rock` |
| `sourceStyle` | string, optional | Style name from the source file, shown on the chart (e.g. `Up Tempo Swing`) |
| `key` | 0–11 | Pitch class of the written key (0 = C) |
| `minor` | boolean, optional | Minor key |
| `bpm` | number | Default tempo |
| `time` | `[beats, unit]` | Time signature at the start, e.g. `[3, 4]` |
| `bars` | Bar[] | The bars as written, before repeats are expanded |

## Bar

| Field | Type | Meaning |
| --- | --- | --- |
| `chords` | `BarChord[]` | Chords in the bar. An empty list keeps the previous chord sounding |
| `cells` | number | Width in a 16-cell row. A 4/4 bar is usually 4 cells |
| `rowStart` | boolean | The bar starts a new row |
| `section` | string | Rehearsal mark: `A`, `B`, `C`…, `i` (intro), `v` (verse) |
| `time` | `[beats, unit]` | Time signature change from this bar on |
| `repeatStart`, `repeatEnd` | boolean | Repeat signs |
| `repeatTimes` | number | Total passes through the repeat (default 2) |
| `ending` | number | A first/second/third ending bracket starts here |
| `barline` | `"double"` or `"final"` | Closing barline |
| `segno`, `coda` | boolean | Signs used by D.S. and "to coda" (the first coda sign jumps to the second) |
| `fermata` | boolean | |
| `directive` | string | `D.C. al Coda`, `D.C. al Fine`, `D.S. al Coda`, `D.S. al Fine`, `D.C. al 2nd End.`, `Fine` |
| `comment` | string | Free text shown on the chart |
| `end` | boolean | The player stops here after a jump |
| `spacer` | boolean | Blank room on the row (e.g. before a coda). Shown, not played |

## BarChord

| Field | Type | Meaning |
| --- | --- | --- |
| `symbol` | string or `null` | Chord symbol in chart notation, or `null` for N.C. |
| `alt` | string, optional | Optional substitution chord symbol with the same duration |
| `beats` | number | Duration of the chord in beats |

## Chord symbols

Chords use the compact notation of hand-written jazz charts, the same as iReal Pro:
`C^7` (major seventh), `C-7` (minor seventh), `C7`, `Ch7` (half-diminished), `Co7` (diminished),
`C+` (augmented), `C7sus`, `C7b9`, `C7#11`, `C7alt`, `C6`, `C-^7`, and slash chords such as `C/E`.

## Playback order

The engine plays the bars in reading order and follows the markings: repeats (with `repeatTimes`),
the ending that matches the current pass, and after a D.C. or D.S. jump it skips repeats, takes the
last ending (or the one named in the directive), jumps from the first coda sign to the second, and
stops at `Fine` or at a bar marked `end`. See `playbackOrder()` in `src/music/chart.ts`.
