# OpenStand

[![Open OpenStand](https://img.shields.io/badge/open-openstand--eta.vercel.app-1f1d1a)](https://openstand-eta.vercel.app)
[![CI](https://github.com/canbmaj7/openstand/actions/workflows/ci.yml/badge.svg)](https://github.com/canbmaj7/openstand/actions/workflows/ci.yml)
[![License: AGPL v3+](https://img.shields.io/badge/license-AGPL--3.0--or--later-1f1d1a)](LICENSE)

**An open-source band that lives in your browser.** Pick a tune, set the key and tempo, and practice over a rhythm section — bass, piano and drums — generated live from a chord chart.

> An open music stand: put a chart on it and the band starts playing.

No install, no account, no subscription. Just open the page and play.

**[Open OpenStand](https://openstand-eta.vercel.app)**

![OpenStand playing a jazz blues: the current bar is highlighted, and changing the key re-spells every chord](docs/images/demo.gif)

<table>
  <tr>
    <td width="70%"><img src="docs/images/editor.png" alt="The chart editor: chords typed as text, with section, repeat and ending options below" /></td>
    <td width="30%"><img src="docs/images/phone-dark.png" alt="OpenStand on a phone in dark mode" /></td>
  </tr>
  <tr>
    <td>Type chords the way you say them</td>
    <td>On a phone, in dark mode</td>
  </tr>
</table>

---

## Status

OpenStand is an **early but usable** practice tool. What works today:

- **Import from iReal Pro.** Paste an `irealb://` link or a whole playlist (or choose an iReal Pro HTML export) and the tunes land in your library. Sections, repeats, first and second endings, D.C./D.S. al Coda/Fine, time signatures and N.C. bars are all read and played in the right order. Tested against public playlists of almost 2,000 tunes.
- **Write your own charts.** Type chords the way you would say them (`Dm7 G7`, `Cmaj7`, `Bø`, `F#dim7`) and press Enter for the next bar. Add sections, repeats, endings, segno and coda, D.C./D.S. jumps, time signature, key, style and tempo. Edit any tune in the library the same way.
- **Export to iReal Pro.** Any chart, imported or written here, can be copied as an `irealb://` link that opens in iReal Pro. All ~2,000 test tunes come back unchanged after going out and in again.
- **A tune library in your browser.** Search by title or composer, filter by playlist. Everything is stored locally (IndexedDB); there is no server and no account.
- **Share a tune as a link.** The whole chart is compressed into the URL, so whoever opens it sees and hears the same tune.
- **Eight styles:** Medium Swing, Ballad (brushes), Jazz Waltz (3/4), Bossa Nova (nylon guitar), Samba, Pop Rock, Funk (electric piano, sixteenth-note groove) and Shuffle (boogie bass). Imported tunes get the closest style automatically, and you can switch styles while the band is playing.
- **Generated accompaniment:**
  - **Bass** walks through chord tones in swing, or plays style patterns (bossa root–fifth, rock eighths), always approaching the next chord smoothly
  - **Piano / guitar** comps with rootless jazz voicings or close-position chords, choosing the shape closest to the previous one (voice leading)
  - **Drums** pick grooves by position in the form: a set-up on the first bar, two-bar figures in the middle, a fill on the last bar
  - Every chorus is played a little differently
- **A real-looking lead sheet.** Chord symbols in a handwritten jazz hand (Petaluma), rehearsal marks, repeat signs, endings, segno and coda, correct flat/sharp spelling in every key, and the current bar marked with a highlighter stroke as it plays.
- **Practice controls:** tempo (40–300 BPM, changes instantly), transpose to any key while playing, number of choruses, count-in. Keyboard shortcuts: <kbd>Space</kbd> to play/stop, <kbd>↑</kbd>/<kbd>↓</kbd> for ±5 BPM, <kbd>→</kbd>/<kbd>←</kbd> to transpose by a half step, and <kbd>L</kbd> to clear the loop. Shortcuts are inactive while editing a chart or focusing a form control.
- **Practice modes:** loop any bars or a rehearsal section, go round all 12 keys (or step up a half or whole tone each chorus), and speed up a few BPM every chorus.
- **Mixer** with per-instrument volume and mute.
- **Light and dark themes** that follow your system setting, and a layout that works on phones.
- **Small download, works offline.** The sound bank is trimmed to the instruments OpenStand uses and compressed to 4.5 MB. After the first visit the app works without a connection and can be installed on a phone's home screen.

## Quick start

Requires Node.js 22+.

```bash
git clone https://github.com/canbmaj7/openstand.git
cd openstand
npm install
npm run dev
```

Open <http://localhost:5173> and press play. The first load downloads a 4.5 MB sound bank.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build for production into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Lint with oxlint |
| `npm test` | Run the unit tests (Vitest) |
| `npm run soundbank` | Rebuild `public/soundfonts/openstand.sf3` from the source bank (needs ffmpeg) |

## How it works

```
chord chart + style ──▶ timeline ──▶ bass / comp / drums generators ──▶ Standard MIDI file ──▶ SoundFont synth ──▶ audio
```

1. **Timeline** (`src/engine/timeline.ts`) — follows the chart's repeats, endings and jumps, and expands it into chord slots (count-in, N choruses, final resolution to the tonic). Charts use the [OpenStand chart format](docs/chart-format.md).
2. **Generators** (`src/engine/bass.ts`, `comp.ts`, `drums.ts`) — read the selected style and turn each slot or bar into note events, with light humanization of timing and velocity.
3. **MIDI writer** (`src/engine/midiWriter.ts`) — writes a format-1 Standard MIDI File in memory.
4. **Player** (`src/audio/player.ts`) — plays it through [SpessaSynth](https://github.com/spessasus/spessasynth_lib), a SoundFont synthesizer running in an `AudioWorklet`. Tempo changes adjust the playback rate, so nothing is regenerated.

Everything runs client-side. There is no server.

## Project structure

```
src/
├── audio/      Sound bank loading, playback, mixer
├── engine/     Accompaniment engine (timeline, generators, MIDI writer)
├── formats/    iReal Pro links in and out, share links
├── library/    Tune library stored in the browser (IndexedDB)
├── music/      Chart format, chord parsing, voicings, example tunes
├── styles/     Style format and the style library
├── ui/         Chart, editor, transport, library, practice and mixer components
└── App.tsx     App state and playback wiring
docs/           Chart format reference, README images
scripts/        Sound bank build script
soundbank-src/  Full GeneralUser GS bank the app's sound bank is built from
tests/          Unit tests
```

The engine (`src/engine`, `src/music`, `src/styles`, `src/formats`) does not touch the DOM, so it can be split into its own package for other projects.

## Styles

A style is **data, not code**. Each one lives in `src/styles/library/` and describes three parts. The engine handles transposition, voice leading and fitting patterns to the chords.

| Part | What you describe |
| --- | --- |
| `bass` | `walking` (rule-based) or `pattern`: notes as chord degrees — `R`, `3`, `5`, `6`, `5-` (fifth below), `7`, `8` (octave), `app` (approach to the next chord) |
| `comp` | Voicing type (`rootless` or `close`) and rhythms per chord length |
| `drums` | Kit, count-in, grooves for the first / middle / last bar of the form (1 or 2 bars long; `beats: 3` for a waltz), ending |

Positions are in beats from the start of the bar or chord. Off-beat eighths are written as `x.5` and are swung automatically when the style has `swing` above `0.5`. A drum hit can carry a probability, so a groove varies on every pass.

```ts
// A bossa bass: root on 1, fifth below on the "and" of 2 and on 3, root on the "and" of 4
'4': [[
  { at: 0,   dur: 1.4,  tone: 'R'  },
  { at: 1.5, dur: 0.45, tone: '5-' },
  { at: 2,   dur: 1.4,  tone: '5-' },
  { at: 3.5, dur: 0.45, tone: 'R'  },
]]
```

**Adding a style:** copy one of the existing files, change the patterns, and register it in `src/styles/index.ts`. Types in `src/styles/types.ts` describe every field.

## Roadmap

- [x] Style format with eight styles: swing, ballad, jazz waltz, bossa nova, samba, pop rock, funk, shuffle
- [x] Import iReal Pro links and playlists
- [x] Tune library in the browser, share links
- [x] Trimmed, compressed sound bank
- [x] Works offline after the first visit (PWA), installable on phones
- [ ] More styles: up-tempo swing, Afro-Cuban, reggae, 12/8 — and beyond (Balkan, Turkish *usul*, Afrobeat…)
- [ ] A style playground: edit a groove in the browser and hear it right away
- [x] Chart editor, and export back to iReal Pro
- [x] Practice modes: tempo ramp per chorus, loop a section, cycle through all 12 keys
- [ ] Export to ChordPro and MusicXML
- [ ] Chord helper: piano keyboard, guitar diagrams, scale suggestions
- [ ] Export to WAV / MIDI / PDF
- [ ] Engine published as a standalone package

## Contributing

OpenStand is meant to grow as a community project, and musicians are as welcome as developers.

- **Musicians:** tell us where the band sounds stiff or wrong with a [sound feedback issue](https://github.com/canbmaj7/openstand/issues/new?template=sound.yml). No code needed. New styles are the most valuable contribution, and they are data files, not code.
- **Developers:** issues labelled [`good first issue`](https://github.com/canbmaj7/openstand/labels/good%20first%20issue) are small and say where to start.

[CONTRIBUTING.md](CONTRIBUTING.md) explains the setup, how to write a style, and what a pull request needs.

## Credits

- [SpessaSynth](https://github.com/spessasus/spessasynth_lib) by spessasus — SoundFont synthesizer and MIDI sequencer (Apache-2.0)
- [Petaluma](https://github.com/steinbergmedia/petaluma) by Steinberg — handwritten music font used for the chart (SIL Open Font License 1.1, see `src/assets/fonts/Petaluma-OFL.txt`)
- [IBM Plex Sans and Plex Mono](https://github.com/IBM/plex) — interface typefaces (SIL Open Font License 1.1)
- [GeneralUser GS](https://www.schristiancollins.com/generaluser.php) by S. Christian Collins — sound bank, trimmed and compressed for OpenStand (see `public/soundfonts/GeneralUser-GS-LICENSE.txt`)
- The iReal Pro format notes in [ireal-musicxml](https://github.com/infojunkie/ireal-musicxml) and [ireal-reader](https://github.com/pianosnake/ireal-reader) helped with the link reader, which is written from scratch

iReal Pro is a trademark of its owner. OpenStand is not affiliated with it; it reads the share links users already have so they can practice with their own charts.

## License

[GNU Affero General Public License v3.0 or later](LICENSE).

You are free to use, study, modify and share OpenStand. If you run a modified version as a web service, you must make its source code available to its users.
