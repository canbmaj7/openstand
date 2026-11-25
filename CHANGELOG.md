# Changelog

All notable changes to OpenStand. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Dates are when the change reached `main`. Numbers in brackets are pull requests or issues on GitHub.

## Unreleased

#### Changed
- The chart shows sooner on first load: the audio engine now loads after the page (#142).

#### Fixed
- The GitHub link in the top bar has a name for screen readers on phones, and the site serves a real robots.txt (#144).
- MIDI, WAV and MP3 exports now speed up like playback when Practice > Speed up is on (#126).

#### Added
- Share > Print or save as PDF: the chart on a clean page, in the key you see (#140).
- Setlists: Repeat starts the setlist over after the last tune (#138).
- Page turner pedals: Page Down / Page Up turn the page, and move to the next or previous tune in a setlist (#136).
- Mixer: tune the band from A4 = 430 to 450 Hz, live and in audio exports (#134).
- Full screen chart view for the music stand: button or F key; short charts grow to fill the screen (#130, #132).
- Setlists: Shuffle plays the tunes in random order; library search also matches style names (#128).
- Practice: random keys, up a minor/major third or a fifth each chorus, and speed up every 2–4 choruses (#124).
- Download the backing track as MP3 (192 kbps), next to WAV (#122).
- Tap tempo: tap the tempo number (or press T) to set the tempo (#119).
- Chord helper: a This tune view with diagrams for every chord in the chart; click one to study it (#118).
- Second Line, Even 8ths and Smooth Jazz styles; iReal Pro tunes in these styles open in them (#114).
- Bluegrass, Calypso and Ska styles; iReal Pro tunes in these styles open in them (#115).
- Chord names: show a chart as Roman numerals or Nashville numbers relative to the tune's key (Aa menu) (#112).
- Metronome: a Click part in the mixer plays a click on every beat (accented downbeat, follows compound and odd-meter groupings); off by default (#110).
- Disco, Rock 12/8 and Soul styles; iReal Pro tunes in these styles open in them (#107).
- Partido Alto, Baião and Choro styles; iReal Pro tunes in these styles open in them (#106).
- Exercises: ii–V–I (major and minor), blues, turnarounds and a dominant cycle through all 12 keys, in the library (#102).
- Gospel and Slow Blues styles; iReal Pro Gospel and Slow Blues tunes open in them (#103).
- Bachata, Merengue and Cumbia styles; iReal Pro tunes in these styles open in them (#100).
- Cha-Cha-Chá and Hip-Hop styles; iReal Pro Cha Cha and Hip Hop tunes open in them (#97).
- Swing Two/Four style: the head is played in two, then the band walks in four; iReal Pro's Swing Two/Four tunes open in it (#96).
- Each tune remembers the tempo, key and repeats you set, like its style; Reset goes back to the tune's own (#92).
- Gypsy Jazz, Bolero and Tango styles; iReal Pro tunes in these styles open in them (#93).
- Back up the whole library (tunes, setlists and your styles) to one file and restore it on another device (#86).
- Hear a chord, or a chord and its scale, from the chord helper (#87).
- Country style: train-beat drums, root–five bass with walk-ups and boom-chick steel-string guitar; iReal Pro Country, Bluegrass and Folk tunes open in it. New example: Country Two-Step (#88).
- Sort the tune list by title, composer, style or key (#79).
- Make the chart bigger or smaller with A− / A+ in the top bar; the size is remembered and used for printing (#80).
- Reverb fader in the mixer, also used for the WAV export (#78).
- Setlists: make your own lists from any tunes, reorder them, share them as one iReal Pro link, and play straight through (#71).
- Download a chart as MusicXML from the Share menu, to open it in MuseScore, Finale, Dorico or Sibelius (#73).
- Undo/redo and copy, cut and paste of bars in the chart editor (#72).
- Download the backing track as audio (WAV) from the Share menu, rendered with the current key, tempo and mixer levels (#70).
- Ukulele chord diagrams in the chord helper, and a count-in setting (auto, off, one or two bars) (#74).
- **Odd meters and an Aksak style**: 5/8, 7/8, 9/8, 10/8 and 11/8 with a grouping (9/8 as 2+2+2+3, 7/8 as 3+2+2, 10/8 curcuna as 3+2+2+3…) chosen in the editor for the tune or a single bar and shown under the time signature. Every style plays the strong beats where the groups start; the new Aksak (Turkish/Balkan) style plays düm and tek on congas with a def on tambourine. Two new examples: Aksak 9/8 Vamp and Balkan 7/8. [#9]
- **Chord substitutions**: a chord can carry an alternate, written `C7(Gb7)` in the editor and shown small above it like in iReal Pro (iReal Pro alternates are now kept on import and export). In Practice, choose Substitutions: every other chorus or at random, and the band switches to them and back. The Jazz Blues example has a few tritone subs. [#54]
- **`@openstand/engine` package**: the accompaniment engine as its own package (no dependencies, Node 20+ and browsers). `backingTrack({ ireal | chart, style, bpm })` returns a MIDI file and the timeline; parsers and writers for iReal Pro, ChordPro and chart files are exported too. MPL-2.0, as promised in CONTRIBUTING (the app stays AGPL). [#10]
- **Afro-Cuban style**: tumbao bass, a two-bar piano montuno, 2-3 son clave, congas and cowbell or cáscara. iReal Pro tunes marked Afro, Latin, Mambo, Cha Cha, Salsa, Montuno, Rumba or Son now open in it instead of Bossa Nova. The comping engine can now play two-bar figures. [#8]
- **Time signature per bar**: in the editor, select a bar and change its time signature, for just that bar or from there on. [#23]
- **Download MIDI**: the Share menu saves the backing track as a MIDI file at the current tempo, with bass, piano and drums on separate tracks. [#1]
- **ChordPro export**: download the chart as a ChordPro chord grid for songbook apps. [#4]
- **Chart files**: save a chart as `.openstand.json` and open it again from Import; broken files show an error instead of failing. [#5]
- **Up-Tempo Swing style** for bebop tempos (200–340 BPM): simpler quarter-note bass lines, a flatter ride with hi-hat on 2 and 4. Thanks @jay23606. [#6, #59]
- **Guitar comping**: pick a guitar as the comping sound and the band comps like a guitarist, with playable guitar voicings and, in the swing styles, four to the bar. Pianists can mute the piano and comp themselves. [#52]
- **Style Lab keeps your style**: Style Lab opens from the tune's current style, a saved custom style stays selected after closing, each tune remembers its style (also in the library), and closing with unsaved changes asks to Save & close, Discard or Keep editing. Thanks @zerotraceme. [#49, #63]
- **Choose the sounds**: in the mixer, pick the bass (acoustic, electric, fretless, synth), the comping instrument (pianos, guitars, organs, vibraphone) and the drum kit (standard, room, power, jazz, brush). "Style" keeps the style's own sound; the choice is remembered. [#29]
- **Start from a chord**: click a chord before pressing Play and the band starts from it (without a count-in). The chord is marked while stopped; click it again with the chord helper open to clear it. [#51]
- **Chart follows the music**: while playing, the chart scrolls so the playing bar stays in view, and leaves you alone for a few seconds after you scroll yourself. [#50]
- **Chord helper view**: choose Both, Keyboard or Guitar in the chord helper; the choice is remembered. [#53]

## 0.2.0 — 2026-11-24

### 2026-11-24

#### Added
- **Reggae style** (one drop): kick and rim together on beat 3, a bass riff that leaves beat one empty, and off-beat guitar skank. iReal Pro tunes marked "Reggae" now use it instead of Pop Rock. Thanks @jay23606. [#7, #39]

#### Changed
- Clicking the chord that is already open in the chord helper closes it again; clicking another chord switches to it. Thanks @zerotraceme. [#45, #46]
- <kbd>Space</kbd> plays and stops again after you click a button with the mouse, instead of pressing that button again. Buttons reached with the keyboard keep their normal Space action. Thanks @zerotraceme. [#47, #48]
- Dependency updates: Sentry, SpessaSynth (sound engine), Vite, Vitest, Playwright, oxlint and the React plugin. [#44]

### 2026-11-11

#### Added
- **More chord qualities**, including ones iReal Pro has no symbol for: power chords (C5), sus2 (Csus2, C2), added notes (Cadd9, C-add11), diminished major seventh (Cdim(maj7)), major seventh sus (Cmaj7sus4) and augmented major seventh (C+maj7). Type them in the editor; the band voices them without the missing third, and the chord helper lists scales for them. [#34]
- **Chord and scale helper**: a Chords panel next to Practice and Mixer shows the playing chord (or the one you click in the chart) on a piano keyboard and in two guitar shapes, with the scales that fit it and their notes. [#26, #36]
- **Transposing instruments**: a "Reads in" selector (C, Bb, Eb) shows the chart as a Bb or Eb player reads it, while the band keeps playing in concert pitch. [#31, #37]
- **Major/minor switch**: a Mode selector plays a tune in major or minor on the same tonic. Sharing, export and saved charts keep the original. [#27, #38]
- **Plain chord font**: an "Aa" button in the top bar switches chord symbols from the handwritten font to a plain sans font. It is remembered and also used when printing. [#28, #40]
- **Sync slider** in the mixer (−300 to +300 ms) for outputs, such as Bluetooth, that do not report their delay, so the highlight can match the sound. [#33, #35]

#### Fixed
- White screen when the browser has no `AudioContext`, or when a page translator or extension changes the page; a reload screen now shows instead. [#35]
- Silent failures when the audio device can't start: a short message is shown and Play tries again. [#35]
- The tune library no longer crashes the app when browser storage is unavailable (for example in private windows). [#35]
- Service-worker and script-error noise no longer reaches the error reports, which now carry the browser name and OS name only. [#35]
- The bottom bar ran off the screen between about 1024 and 1430 px wide after the new selectors were added; it now fits or wraps, and the band panels never cover Play. [#40]

#### Changed
- Dependency updates: Sentry, SpessaSynth (sound engine), Vite, Vitest, Playwright, oxlint and the React plugin. [#30]

### 2026-11-02
- **Other meters played properly**: 3/4, 5/4, 6/8 and 12/8 get their own patterns, with a count-in that follows the meter, smoother chord voicing, sustain pedal on ballads and pop, and seven new example tunes. [#20]
- **Louder band and a master meter**: the output is raised about 10 dB with a limiter, and the mixer has a master fader and level meter. [#20]
- README describes meters, count-in, pedal and the master meter. [#22]
- GitHub Actions updated to checkout and upload-artifact v7. [#21]

### 2026-11-01 (after 0.1.0)
- **Style lab**: edit drums, bass and chords of a groove on a grid and hear it while it plays; groove B, a last-bar fill, and bass and chord variations; save your own styles and share them as links, with the tune that is on screen. Own styles are saved in the browser.
- Playing starts sooner on phones (sound decoded in the background, audio opened on first touch).
- Visitor counts with Vercel Web Analytics: no cookies, and the address is cut before `?` and `#`, so shared charts are never sent.
- Errors from the official site are reported to Sentry, without charts, cookies or IP-based user info. [#15]
- Browser tests added (`npm run test:e2e`), and a "how we work" guide. [#13]
- Dependabot keeps dependencies up to date. [#14, #16, #19]
- The engine, music, styles and formats code is offered under MPL-2.0 as well as AGPL-3.0.
- Pop piano calmed down in the style samples.

## 0.1.0 — 2026-11-01

First public release.

- **Play-along band in the browser**: bass, piano and drums under a chord chart, with tempo, key and choruses.
- **Looks like a lead sheet on a music stand**, with a handwritten chord font; follows the system light or dark theme.
- **Styles**: medium swing, ballad, jazz waltz, bossa nova, samba, pop rock, funk and shuffle.
- **Import iReal Pro links and playlists** (`irealb://` and `irealbook://`), keep a tune library in the browser, and share a tune as a link.
- **Practice modes**: loop a section, change key every chorus (fourths, halves or whole steps), speed up each chorus.
- **Chart editor**: type chords, Enter for the next bar, and export back to iReal Pro links.
- **Print-friendly lead sheets.** [#2, #11]
- **Keyboard shortcuts** for tempo, transpose and loop. [#12]
- Works offline after the first visit (PWA), own icon, mixer with volume and mute per part.
- Open source under AGPL-3.0-or-later, with a contributor guide, issue forms and CI.
