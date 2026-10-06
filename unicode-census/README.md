# Invisible-character census in Claude output

Canonical write-up: <https://www.aiwatermarkremoval.com/lab/claude-invisible-characters>.
Dataset v1.1.0. Captures: 2026-08-12 (three models) and 2026-09-03 (Fable 5.1).

## The question

Do Claude's text outputs contain invisible Unicode characters: zero-width spaces, joiners,
byte-order marks, soft hyphens, bidirectional format controls, variation selectors, or tag
characters?

"Claude hides zero-width spaces in your text" is the most repeated explanation of Claude's watermark
online. This study measures whether such characters are in the bytes.

## What this cannot answer

Whether Anthropic's statistical text watermark is present in any given passage. That mark is not
made of characters, and nothing measurable here would change if it were present in every output.
This study measures what is observable in the bytes, which is a different question.

## Design

| | |
|---|---|
| Models | `claude-opus-5`, `claude-sonnet-5`, `claude-haiku-4-5-20251001` (2026-08-12); `claude-fable-5-1` (2026-09-03) |
| Generators per model | 4 independent agents |
| Prompts | 8: short factual, long prose, code, list, Spanish, Japanese, markdown table, dialogue (verbatim in `manifest.json`) |
| Outputs | 128 (32 per model) |
| Words | 26,093 (whitespace-delimited) |
| Code points | 169,545 |
| Interface | Claude Code CLI subagent tasks |
| Capture | The model wrote each answer straight to disk with its file-write tool. No clipboard, terminal render or editor in the path. |

Sampling settings are not controllable through this harness and are not published by the provider,
so defaults were used. That is a limitation, not a control.

The Fable 5.1 run used the same prompts, generator count and capture path, but not the same session:
22 days of harness changes sit between the two captures.

## Positive control

A count of zero is only meaningful if the capture path could have carried a non-zero count. In each
capture, a separate agent was asked to emit four invisible characters through the identical write
path: U+200B, U+200C, U+00AD and U+00A0.

- 2026-08-12 (`control/agent-written/positive-control.txt`): U+200B, U+200C and U+00AD were emitted
  and detected. U+00A0 was replaced by an ordinary ASCII space by the generating model.
- 2026-09-03 (`control/fable/positive-control.txt`): the same outcome. U+00A0 was replaced by an
  ASCII space on two independent attempts.

So a zero count for the first three classes means absence from the output. A zero for U+00A0 cannot
be distinguished from loss in transit on this path. The corpus also contains 68 em dashes (U+2014),
48 ideographic spaces (U+3000) and full Japanese text, so multi-byte characters survive the capture.

## Results

Numbers from `data/aggregate-with-fable.json` unless stated.

- **Zero** zero-width or bidirectional-format characters across all 128 outputs
  (`zeroWidthAndFormatTotal`), and zero files containing any (`filesWithAnyZeroWidthOrFormat`).
- Of the 20 invisible or space-like classes counted, 19 are zero. The exception is 48 U+3000
  ideographic spaces, every one inside a Japanese-language output (`p06-japanese`), where it is
  ordinary typography: 30 from Opus 5 and 18 from Fable 5.1.
- Per model, zero-width and format characters: 0 for each of the four models, over 7,068 words
  (Opus 5), 6,102 (Sonnet 5), 6,194 (Haiku 4.5) and 6,729 (Fable 5.1).
- Em dashes, for the three models captured on 2026-08-12 only: 68 in total, at 2.12 (Opus 5), 4.59
  (Sonnet 5) and 4.04 (Haiku 4.5) per 1,000 words (`data/aggregate.json`, `byModel`).
- Zero curly quotes or curly apostrophes in any output.

### A number that is withheld

The Fable 5.1 run recorded zero em dashes across 6,729 words. This is not published as a property of
the model. The original corpus was written on 2026-08-12 at 23:32 local time. A standing instruction
in the project's own tooling telling the assistant never to use em dashes was added 19 minutes later.
Every Fable 5.1 generation ran with that instruction in context and every earlier generation ran
without it, so the figure measures the instruction. No output was dropped: the exclusion applies to
one derived statistic for one model, and is recorded in `manifest-v1.1.0.json` (`exclusions`). The
instruction says nothing about zero-width or format characters, and the positive control confirms
the path preserves them, so the character-class counts are unaffected.

A clean em dash comparison needs generation through a path that carries no project instructions.
This repository does not contain one.

## Files

| Path | What it is |
|---|---|
| `scan.mjs` | The analysis script. Unchanged since v1.0.0. |
| `raw/<model>/r<n>-<prompt id>.txt` | The 128 outputs, verbatim. `<n>` is the generator (1 to 4). |
| `control/agent-written/`, `control/fable/` | The two positive-control files. |
| `data/per-file-with-fable.csv`, `data/aggregate-with-fable.json` | v1.1.0 results, all four models. |
| `data/per-file.csv`, `data/aggregate.json` | v1.0.0 results, three models, kept unchanged so earlier citations still resolve. |
| `manifest.json` | v1.0.0 manifest: design, prompts, control, results and limitations as of 2026-08-12. |
| `manifest-v1.1.0.json` | v1.1.0 manifest as served by the site, including the Fable 5.1 run and the em dash exclusion. |

Field definitions are in `../data-dictionary.md`.

The site serves the v1.1.0 aggregate with three extra top-level fields (`datasetVersion`,
`generated`, `exclusions`) that the file here does not have. All counts are identical.

## Reproduce it

```sh
node scan.mjs [corpusDir] [outDir]     # defaults: ./raw -> ./data
```

Both arguments are positional. Running it with the defaults overwrites `data/aggregate.json` and
`data/per-file.csv` with four-model results, so pass an output directory instead. `scan.mjs` has no
dependencies. It reads `corpusDir/<model>/*.txt` and counts code points by class. Point it at your
own corpus (outputs from any model, saved as plain text) and the numbers are on the same scale.

## Limitations

1. One provider, four model identifiers, one harness, two dates 22 days apart. Not longitudinal.
2. The two captures are not a controlled comparison of each other. The withheld em dash figure shows
   that harness drift between them can reach the numbers.
3. 128 outputs rule out a per-output or per-paragraph marker. They do not rule out a rare
   probabilistic marker in well under 1% of outputs. The site's estimate is that an event this scan
   missed entirely is unlikely to affect more than roughly 2 percent of outputs.
4. Generation ran through a command-line agent harness. A presentation-layer marker applied only in
   another product surface would not appear here.
5. The prompt distribution was written for this study, not sampled from real use.
6. Per the site, Anthropic dates Opus 5 marking from 2026-09-14 and Sonnet 5 from 2026-09-30. All
   captures here predate both, so the Opus 5 and Sonnet 5 rows describe output captured before
   marking began.
7. None of this measures the statistical watermark. A zero count is not evidence that no watermark
   is present.
