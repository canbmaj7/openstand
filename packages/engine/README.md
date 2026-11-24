# @openstand/engine

The accompaniment engine from [OpenStand](https://github.com/canbmaj7/openstand): turn a chord chart or `irealb://` link into a multi-track Standard MIDI File (bass, piano/guitar comping, and drums) with zero dependencies and no DOM requirement.

## Install

```bash
npm install @openstand/engine
```

Requires Node.js 20+.

## Quick start

```js
import { backingTrack } from '@openstand/engine'
import { writeFileSync } from 'node:fs'

const { midi } = backingTrack({
  ireal: 'irealb://...',
  style: 'medium-swing',
  bpm: 160,
})

writeFileSync('tune.mid', midi)
```

## API

| Export | Description |
| --- | --- |
| `backingTrack(input)` | High-level helper accepting `{ chart?, ireal?, style?, transpose?, choruses?, bpm?, practice? }` and returning `{ midi, timeline, chart, style }` |
| `arrange(chart, style, transpose, choruses, practice?, bpm?)` | Low-level MIDI and timeline generator (`BASE_BPM = 120` default) |
| `buildTimeline(chart, transpose, choruses, practice?)` | Expands repeats, endings, jumps, and count-in into `Timeline` (`slots`, `bars`, `clicks`) |
| `chartFromMeasures(meta, measures)` | Builds a `Chart` from per-bar chord lists |
| `parseIrealLinks(input)` / `irealLink(charts, playlist?)` | Parse and write `irealb://` and `irealbook://` links |
| `parseChartFile(json)` / `chartToFile(chart)` / `validateChart(data)` | Read, serialize, and validate `.openstand.json` charts |
| `chartToChordPro(chart, transpose?)` | Export a chart as a ChordPro chord grid |
| `STYLES` / `getStyle(id)` | Built-in style list and lookup by style ID |
| `parseChord` / `transposeChord` / `chordTones` / `chordLabel` | Chord symbol parsing, transposition, and voicing helpers |

## Style IDs

- `medium-swing`
- `up-tempo-swing`
- `ballad`
- `jazz-waltz`
- `bossa-nova`
- `samba`
- `afro-cuban`
- `pop-rock`
- `funk`
- `shuffle`
- `reggae`

## License

MPL-2.0. The engine, music, styles and formats code of [OpenStand](https://github.com/canbmaj7/openstand) is offered under both the AGPL-3.0-or-later and the MPL-2.0 (see its CONTRIBUTING); this package uses the MPL-2.0. The OpenStand app itself stays AGPL-3.0-or-later.
