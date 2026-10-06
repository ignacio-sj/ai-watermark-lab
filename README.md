# AI Watermark Lab: open data

Data, scripts and protocols for the studies run by the AI Watermark Lab at
<https://www.aiwatermarkremoval.com/lab>. Each study measures something that can be observed from
outside the model provider (characters in the bytes, survival of characters through code
transformations) and states which questions it cannot answer.

None of these studies can detect a statistical text watermark. The only detector for Anthropic's
text watermark is, per the site's write-ups, an Anthropic API in private preview that this lab cannot
use. A study here finding nothing is therefore never evidence that no watermark is present.

## Contents

| Directory | Study | Status | Canonical write-up |
|---|---|---|---|
| [`unicode-census/`](unicode-census/) | Invisible-character census in Claude output | Published, dataset v1.1.0 | <https://www.aiwatermarkremoval.com/lab/claude-invisible-characters> |
| [`transformation-survival/`](transformation-survival/) | Which invisible characters survive ordinary software | Published, dataset v1.0.0 | <https://www.aiwatermarkremoval.com/lab/transformation-survival> |

Also at the top level: [`data-dictionary.md`](data-dictionary.md) (every CSV and JSON field) and the
licence files described under [Licence](#licence).

## The studies

### 1. Invisible-character census in Claude output

Do Claude's text outputs contain invisible Unicode characters, the mechanism most often claimed
online to be the Claude watermark? Four Claude models answered the same eight prompts four times each,
each answer was written straight to disk by the generating process, and every code point was counted
in 20 invisible or space-like classes plus 5 typographic classes. A positive control on the same
capture path confirmed that zero-width characters survive it.

Headline, as stated by the site (`lib/lab.ts` on the site, and the study page):

> No. Across 128 outputs and 26,093 words from four Claude models, zero zero-width or
> bidirectional-format characters appeared. That now includes Fable 5.1, the first model Anthropic
> confirms carries the watermark.

Sample, as stated by the site: "128 outputs · 26,093 words · 4 models". Traceable to
`unicode-census/data/aggregate-with-fable.json` (`corpus.files` 128, `corpus.words` 26093,
`zeroWidthAndFormatTotal` 0). The only non-zero invisible-class count is 48 U+3000 ideographic spaces,
all inside Japanese-language outputs (`counts["U+3000 IDEOGRAPHIC SPACE"]`; per file in
`data/per-file-with-fable.csv`).

### 2. Which invisible characters survive ordinary software

When text carrying invisible characters passes through normalisation, JSON, URLs, base64 or a
whitespace cleanup, which characters survive? Each of 18 characters was embedded in a two-line
carrier string and pushed through 12 deterministic transformations in Node.js, and the presence of
the exact code point was recorded per cell.

Headline, as stated by the site:

> The truly invisible ones survive almost everything; only the space-like ones get cleaned up. 12 of
> 18 characters came through every transformation that was not deliberately trying to remove them.

Sample, as stated by the site: "18 characters × 12 transformations". Traceable to
`transformation-survival/data/matrix.json` (`survivesEverythingIncidental` lists 12 code points;
`totals` gives survivors per transformation).

### Planned

A before-and-after capture of Claude Opus 5 output around Anthropic's watermark rollout was run on
2026-09-05 (pre-rollout). It is not published yet: a manifest integrity check found 26 of 96 entries
whose checksums do not match the captured texts, and the post-rollout capture has not been run. It
will be added when both are resolved.

## Licence

- **Data and text** (everything except the `.mjs` scripts): Creative Commons Attribution 4.0
  International. Full text in [`LICENSE-DATA`](LICENSE-DATA).
- **Scripts** (`*.mjs`): MIT. Full text in [`LICENSE`](LICENSE).
- [`NOTICE`](NOTICE) states which applies to which file, and covers the model-generated text.

## How to cite

The study pages on the site are the canonical write-ups. Cite the page and the dataset version, and
carry the sample size and limitations with any number you reuse.

- Census: ignacio-sj (2026). *Invisible-character census in Claude output*, dataset
  v1.1.0. <https://www.aiwatermarkremoval.com/lab/claude-invisible-characters>
- Transformation survival: ignacio-sj (2026). *Which invisible characters survive ordinary
  software*, dataset v1.0.0. <https://www.aiwatermarkremoval.com/lab/transformation-survival>

Both citation strings follow the study pages, with the author given as the GitHub handle. Machine-readable metadata for the
repository is in [`CITATION.cff`](CITATION.cff).

## How to reproduce

All scripts are dependency-free Node.js ES modules. The re-runs below were checked on Node 22.22.0
on 2026-10-06; results are listed per study.

### Census

```sh
# all four models (dataset v1.1.0)
node unicode-census/scan.mjs unicode-census/raw /tmp/census-out
# the positive controls
node unicode-census/scan.mjs unicode-census/control /tmp/census-control
```

The script takes two positional arguments, `corpusDir` and `outDir`, and reads
`corpusDir/<model>/*.txt`. Re-run result: `per-file.csv` and `aggregate.json` were byte-identical to
`data/per-file-with-fable.csv` and `data/aggregate-with-fable.json`. Running it over a directory
holding only the `opus`, `sonnet` and `haiku` folders reproduced `data/per-file.csv` byte for byte
and `data/aggregate.json` with identical values (the order of model keys follows directory listing
order). The control scan finds one U+200B, one U+200C and one U+00AD in each control file.

### Transformation survival

```sh
RUN_DATE=2026-08-12 node transformation-survival/survive.mjs /tmp/survival-out
```

The script takes one positional argument, `outDir`. `runDate` in `matrix.json` defaults to the
current date, so set `RUN_DATE` to reproduce the published file exactly. Re-run result: both
`matrix.json` and `matrix.csv` were byte-identical to the published files. Unicode normalisation
results depend on the Unicode data shipped with the Node.js build, so a different Node version could
in principle move a cell.

## Limitations

Each study README has the full list. The points below apply across them or are the ones most often
lost when a number is quoted.

**All studies**

- Absence of a detectable mark is not proof of absence. None of these instruments can see a keyed
  statistical watermark in word choice, which is the mechanism the site's sources attribute to
  Anthropic. A zero here means zero of what was counted.
- One provider (Anthropic) in the census, the only study that samples model output. Nothing here
  describes any other provider.
- The census prompt set was written for that study. It is not a sample of real-world use.

**Census**

- 128 outputs, captured on two dates (2026-08-12 for three models, 2026-09-03 for Fable 5.1), through
  one harness. The site's estimate: an event this scan would have missed entirely "is unlikely to
  affect more than roughly 2 percent of outputs". It does not rule out a rare marker.
- Model versions: `claude-opus-5`, `claude-sonnet-5`, `claude-haiku-4-5-20251001`,
  `claude-fable-5-1`. Per the site, Anthropic dates Opus 5 marking from 2026-09-14 and Sonnet 5 from
  2026-09-30, both after every capture date here, so those two models' rows describe output captured
  before marking began.
- The Fable 5.1 em dash count (zero) is withheld as a finding because that run carried a tooling
  instruction against em dashes. The exclusion is recorded in `unicode-census/manifest-v1.1.0.json`.
- U+00A0 could not be confirmed by the positive control (the generating model replaced it with an
  ASCII space), so a zero for that class cannot be distinguished from loss in transit.

**Transformation survival**

- 18 characters, 12 transformations, one character per test, one run on 2026-08-12. Only
  transformations that run in code; nothing about Google Docs, Word, Notion or other applications.
- It tests character survival, not watermark survival.

## Privacy

Model outputs are published verbatim, as the files the generating process wrote. Nothing from the
capture environment (local paths, session or request identifiers, account details) is included.

## Changelog

- **2026-10-06**: Repository prepared for first public release. Contents: census dataset v1.1.0 (with
  the v1.0.0 three-model files kept alongside), transformation-survival dataset v1.0.0, top-level
  data dictionary, licences and citation metadata. All data files are byte-identical to the lab's
  source files.
- **2026-09-03**: Census dataset v1.1.0: Fable 5.1 added (32 outputs), with its own positive control.
  The v1.0.0 files were not changed.
- **2026-08-12**: Census dataset v1.0.0 (three models, 96 outputs) and transformation-survival
  dataset v1.0.0 published.
