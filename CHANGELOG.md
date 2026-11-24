# Changelog

All notable changes to OpenStand. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Dates are when the change reached `main`. Numbers in brackets are pull requests or issues on GitHub.

## Unreleased

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
