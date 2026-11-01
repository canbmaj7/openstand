# Contributing to OpenStand

Thanks for wanting to help. OpenStand is a practice band that anyone can open in a browser, and it gets better the more musicians and developers shape it. You do not need to be both.

- [Ways to help](#ways-to-help)
- [Setting up](#setting-up)
- [Writing a style](#writing-a-style)
- [Working on the code](#working-on-the-code)
- [Sending a pull request](#sending-a-pull-request)
- [What we can't accept](#what-we-cant-accept)
- [Licensing](#licensing)

## Ways to help

**Play with it and tell us what sounds wrong.** This is the most useful thing a musician can do, and it needs no code. Open a [sound feedback issue](https://github.com/canbmaj7/openstand/issues/new?template=sound.yml) and be concrete: the style, the tune (a share link is perfect), the bar, and what a real player would do instead. *"Bossa, bar 6: the guitar plays on every eighth, a real player leaves more space"* is something we can fix. *"The piano sounds robotic"* is harder.

**Write or improve a style.** Styles are plain data files, not code, so if you can describe a groove in beats you can write one. See [Writing a style](#writing-a-style). Issues labelled [`style`](https://github.com/canbmaj7/openstand/labels/style) list the styles people have asked for.

**Pick an issue.** Issues labelled [`good first issue`](https://github.com/canbmaj7/openstand/labels/good%20first%20issue) are small and self-contained, and say which files to look at. [`help wanted`](https://github.com/canbmaj7/openstand/labels/help%20wanted) issues are bigger. Leave a comment before you start so two people don't do the same work.

**Report a bug.** Use the [bug report form](https://github.com/canbmaj7/openstand/issues/new?template=bug.yml). A share link to the tune (the **Share** button) and your browser and device help a lot.

For anything large — a new feature, a change to the chart or style format, a new dependency — please open an issue first so we can agree on the approach before you spend time on it.

## Setting up

You need Node.js 22 or newer.

```bash
git clone https://github.com/canbmaj7/openstand.git
cd openstand
npm install
npm run dev
```

Open <http://localhost:5173>. Before sending changes, run:

```bash
npm run build   # type-check and build
npm run lint    # oxlint
npm test        # Vitest
```

The same three commands run on every pull request.

## Writing a style

A style describes what the bass, the piano (or guitar) and the drums play. The engine does the rest: it follows the chart, transposes, picks voicings that move smoothly, and fits the patterns to chords of different lengths.

1. **Copy the closest existing style** in [`src/styles/library/`](src/styles/library) to a new file, for example `reggae.ts`. Give it a new `id` and `name`.
2. **Register it** in [`src/styles/index.ts`](src/styles/index.ts) by adding it to `STYLES`. It now shows up in the style menu.
3. **Edit the patterns** and listen. `npm run dev` reloads the page when you save. The types in [`src/styles/types.ts`](src/styles/types.ts) describe every field.
4. **Map iReal Pro names** (optional): if imported tunes with a matching style name should use yours, add it to `mapStyle` in [`src/formats/ireal.ts`](src/formats/ireal.ts) and to the test in `tests/styles.test.ts`.

A few things to know:

- Positions are in beats from the start of the bar (drums) or chord (bass, comp). `0` is beat one, `1.5` is the "and" of two. Off-beat eighths swing automatically when the style's `swing` is above `0.5`.
- Bass notes are chord degrees: `R`, `3`, `5`, `6`, `7`, `8` (octave), `5-` (fifth below), `app` (a half step into the next chord). Patterns are grouped by chord length (`'4'`, `'2'`…), and the engine picks one of the alternatives each time, so give it two or three.
- Drum grooves can be one or two bars long and come in three groups: `first` (the first bar of the form), `middle` and `last` (usually a fill). A hit with a fourth value, such as `[2.5, 'hhOpen', 70, 0.3]`, plays only 30% of the time, which keeps a groove from sounding looped. Drum names are in [`src/styles/drums.ts`](src/styles/drums.ts).
- Instruments are General MIDI program numbers. The sound bank is trimmed to keep the download small, so check the `PROGRAMS` list in [`scripts/build-soundbank.mjs`](scripts/build-soundbank.mjs). If you need an instrument that isn't there, add it to the list and run `npm run soundbank` (needs `ffmpeg`), and mention the new download size in your pull request.
- Write the patterns yourself, from playing, listening or teaching material you are allowed to use. Do not copy pattern data out of commercial apps or their files.

When you open the pull request, a short recording or a share link of a tune that shows the style off helps reviewers hear it.

## Working on the code

The [README](README.md#how-it-works) explains how a chart becomes sound. In short:

| Folder | What lives there |
| --- | --- |
| `src/engine/` | Timeline, bass/comp/drum generators, MIDI writer. No DOM. |
| `src/music/` | Chart format, chord parsing, voicings, editing helpers. No DOM. |
| `src/styles/` | The style format and the style library. Data only. |
| `src/formats/` | iReal Pro links in and out, share links. No DOM. |
| `src/audio/` | Sound bank loading and playback (SpessaSynth). |
| `src/library/` | The tune library in IndexedDB (Dexie). |
| `src/ui/` | React components. |
| `docs/` | The [OpenStand chart format](docs/chart-format.md). |

Guidelines:

- **Keep the engine free of the browser.** Code in `engine/`, `music/`, `styles/` and `formats/` must not touch `window`, `document` or audio APIs, so it can run in tests, in Node and later as a separate package.
- **Test what you change in the engine and formats.** Tests live in `tests/` and use made-up chord progressions.
- **Match the existing style.** TypeScript in strict mode, small functions, comments that say *why*. oxlint and the build will catch most things.
- **Check the phone layout.** Many people practice with a phone on the music stand. Try your change at around 390 px wide, in light and dark mode.
- **English** for code, comments, the interface and commit messages.

## Sending a pull request

- Keep it focused: one feature or fix per pull request.
- Describe what changed and how you checked it. For sound changes, say what you listened to.
- Make sure `npm run build`, `npm run lint` and `npm test` pass.
- Screenshots help for anything visible.

## What we can't accept

- **Copyrighted chord charts.** Example tunes in the repository must be original progressions or standard forms (a blues, rhythm changes) without a melody or title from a copyrighted song. Users keep their own charts in their own browser.
- **Material copied from commercial apps**: pattern data, sound banks, fonts or graphics.
- **Code you don't have the right to contribute.** See [Licensing](#licensing).

## Licensing

OpenStand is released under the [AGPL-3.0-or-later](LICENSE), and by sending a pull request you agree that your contribution is too.

**The engine and the styles will also be offered under the [MPL-2.0](https://www.mozilla.org/en-US/MPL/2.0/).** We plan to publish them as a separate package that other apps can use, and a more permissive licence makes that practical: apps of any kind can use the engine, while changes to the engine's own files stay open. So contributions to these folders are made under **both** the AGPL-3.0-or-later and the MPL-2.0:

- `src/engine/`
- `src/music/`
- `src/styles/`
- `src/formats/`
- tests of the code in these folders

The rest of the app (the interface, audio playback, the tune library) stays AGPL only.

## Code of conduct

Everyone taking part is expected to follow the [code of conduct](CODE_OF_CONDUCT.md). Be kind, assume good intent, and remember that people here range from first-time programmers to professional players.
