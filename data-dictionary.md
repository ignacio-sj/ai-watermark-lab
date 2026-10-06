# Data dictionary

Every CSV and JSON file in this repository, field by field. Paths are relative to the repository
root. All text files are UTF-8.

## Shared definitions

These apply wherever the terms appear.

- **Word**: a run of non-whitespace characters, from `text.split(/\s+/)` with empty strings removed.
  Japanese text without spaces counts as few words, so per-word rates for Japanese outputs are not
  comparable with other languages.
- **Code point**: one Unicode scalar value, counted by iterating the string (so a character outside
  the Basic Multilingual Plane counts once).
- **Non-ASCII**: code points above U+007F.
- **Character classes.** Twenty "invisible" classes and five typographic classes, defined in
  `unicode-census/scan.mjs`. The column or key name is the class label:

  | Label | Code points counted |
  |---|---|
  | `U+200B ZERO WIDTH SPACE` | U+200B |
  | `U+200C ZERO WIDTH NON-JOINER` | U+200C |
  | `U+200D ZERO WIDTH JOINER` | U+200D |
  | `U+2060 WORD JOINER` | U+2060 |
  | `U+FEFF ZERO WIDTH NO-BREAK SPACE / BOM` | U+FEFF |
  | `U+00AD SOFT HYPHEN` | U+00AD |
  | `U+034F COMBINING GRAPHEME JOINER` | U+034F |
  | `U+180E MONGOLIAN VOWEL SEPARATOR` | U+180E |
  | `U+061C ARABIC LETTER MARK` | U+061C |
  | `U+200E/200F LEFT/RIGHT-TO-LEFT MARK` | U+200E, U+200F |
  | `U+202A-202E BIDI EMBEDDING/OVERRIDE` | U+202A to U+202E |
  | `U+2066-2069 BIDI ISOLATE` | U+2066 to U+2069 |
  | `U+FE00-FE0F VARIATION SELECTOR` | U+FE00 to U+FE0F |
  | `U+E0100-E01EF VARIATION SELECTOR SUPPLEMENT` | U+E0100 to U+E01EF |
  | `U+E0000-E007F TAG CHARACTERS` | U+E0000 to U+E007F |
  | `U+00A0 NO-BREAK SPACE` | U+00A0 |
  | `U+202F NARROW NO-BREAK SPACE` | U+202F |
  | `U+2000-200A UNICODE SPACES` | U+2000 to U+200A |
  | `U+1680 OGHAM SPACE MARK` | U+1680 |
  | `U+3000 IDEOGRAPHIC SPACE` | U+3000 |
  | `U+2014 EM DASH` | U+2014 (typographic) |
  | `U+2013 EN DASH` | U+2013 (typographic) |
  | `U+2019 RIGHT SINGLE QUOTATION MARK` | U+2019 (typographic) |
  | `U+201C/201D CURLY DOUBLE QUOTES` | U+201C, U+201D (typographic) |
  | `U+2026 HORIZONTAL ELLIPSIS` | U+2026 (typographic) |

- **invisibleTotal**: sum over the first 20 classes.
- **zeroWidthAndFormatTotal**: sum over the first 15 classes, that is, the 20 invisible classes minus
  the five space-like ones (U+00A0, U+202F, U+2000-200A, U+1680, U+3000).
- **Per 1,000 words** (`per1k`, `Per1000Words`): count divided by words, times 1,000.

---

## unicode-census/

### `unicode-census/data/per-file.csv` (v1.0.0, 96 rows) and `unicode-census/data/per-file-with-fable.csv` (v1.1.0, 128 rows)

One row per output. Same columns in both.

| Column | Type | Meaning |
|---|---|---|
| `model` | string | Model folder name: `opus` (`claude-opus-5`), `sonnet` (`claude-sonnet-5`), `haiku` (`claude-haiku-4-5-20251001`), `fable` (`claude-fable-5-1`). |
| `file` | string | File name under `unicode-census/raw/<model>/`. Pattern `r<generator>-<prompt id>.txt`. |
| `words` | integer | Words in the output. |
| `code_points` | integer | Code points in the output. |
| `non_ascii` | integer | Code points above U+007F. |
| 25 class columns | integer | Count of each character class in the output (labels as above). |

### `unicode-census/data/aggregate.json` (v1.0.0) and `unicode-census/data/aggregate-with-fable.json` (v1.1.0)

| Field | Type | Meaning |
|---|---|---|
| `corpus.models` | string[] | Model folder names scanned. |
| `corpus.files` | integer | Outputs scanned. |
| `corpus.words` | integer | Total words. |
| `corpus.codePoints` | integer | Total code points. |
| `invisibleTotal` | integer | Sum of the 20 invisible classes over the corpus. |
| `zeroWidthAndFormatTotal` | integer | Sum of the 15 zero-width and format classes over the corpus. |
| `filesWithAnyZeroWidthOrFormat` | integer | Outputs with at least one zero-width or format character. |
| `byModel.<model>.files` | integer | Outputs for that model. |
| `byModel.<model>.words` | integer | Words for that model. |
| `byModel.<model>.zeroWidthAndFormatTotal` | integer | As above, for that model. |
| `byModel.<model>.emDashesPer1000Words` | number | Em dashes per 1,000 words for that model, 2 decimals. The `fable` value is withheld as a finding (see `unicode-census/README.md`). |
| `byModel.<model>.emDashTotal` | integer | Em dashes for that model. |
| `byModel.<model>.curlyApostropheTotal` | integer | U+2019 count for that model. |
| `byModel.<model>.nonBreakSpaceTotal` | integer | U+00A0 count for that model. |
| `counts.<class label>` | integer | Corpus total per class. |
| `countsByModel.<model>.<class label>` | integer | Per-model total per class. |

### `unicode-census/manifest.json` (v1.0.0) and `unicode-census/manifest-v1.1.0.json`

Study description in structured form. v1.1.0 is the version served by the site; v1.0.0 is the
original. Fields not present in v1.0.0 are marked (1.1.0).

| Field | Meaning |
|---|---|
| `study`, `version`, `runDate` | Study name, dataset version, date of the first capture. |
| `question`, `whatThisCannotAnswer` | The research question and its stated limit. |
| `models[]` | `key` (folder name), `id` (model identifier), `generators`, `outputs`; (1.1.0) `addedIn`, `note`. |
| `harness` | `interface`, `capturePath`, `note`; (1.1.0) `revisionNote` describing the Fable 5.1 run. |
| `design` | `prompts`, `replicatesPerModel`, `outputsPerModel`, `totalOutputs`, `samplingSettings`; (1.1.0) `models`. |
| `prompts[]` | `id`, `language` (ISO 639-1), `shape`, `text` (verbatim prompt). |
| `positiveControl` | `path`, `purpose`, `requested` and `detected` (code point lists), `result`; (1.1.0) `fableRun` with the same fields plus `runDate`. |
| `results` | `outputs`, `words`, `codePoints`, `zeroWidthAndFormatCharacters`, `filesContainingAnyZeroWidthOrFormatCharacter`, `ideographicSpaces`, `ideographicSpaceNote`, `emDashTotal`, `emDashesPer1000Words` (by model id), `curlyQuotesAndApostrophes`; (1.1.0) `models`, `fable` (outputs, words, zero-width total, ideographic spaces), `emDashNote`. |
| `limitations[]` | Stated limitations, as text. |
| `reproduce`, `license` | Command line and reuse terms, as text. |
| (1.1.0) `revisionDate`, `revisionNote` | Date and description of the v1.1.0 change. |
| (1.1.0) `exclusions[]` | `field`, `model`, `action`, `reason` for each withheld statistic. |

Note: `manifest-v1.1.0.json` updates `results` for four models but its `limitations` list still
begins with the v1.0.0 wording ("three model identifiers", "96 outputs"). The README in that
directory gives the current limitations.

---

## transformation-survival/

### `transformation-survival/data/matrix.csv`

One row per character (18 rows).

| Column | Type | Meaning |
|---|---|---|
| `code` | string | Code point, `U+XXXX`. |
| `name` | string | Character name. |
| `nfc`, `nfd`, `nfkc`, `nfkd`, `json`, `uri`, `base64`, `latin1`, `whitespace-collapse`, `trim-lines`, `ascii-only`, `printable-filter` | enum | `survives` if the exact code point is present after that transformation, `destroyed` if not, `error` if the transformation threw (none did). Transformation definitions are in `transformation-survival/README.md`. |

### `transformation-survival/data/matrix.json`

| Field | Type | Meaning |
|---|---|---|
| `study` | string | Study name. |
| `runDate` | string (date) | Date of the run (from `RUN_DATE`, else the current date). |
| `characters` | integer | Number of characters tested (18). |
| `transformations[]` | object[] | `id`, `label`, `note` (where the transformation occurs in practice). |
| `results[]` | object[] | Per character: `code`, `name`, `survives.<transformation id>` (`true`, `false`, or `null` if the transformation threw). |
| `totals[]` | object[] | Per transformation: `id`, `label`, `survivors` (count of `true`), `destroyed` (count of `false`). |
| `survivesEverythingIncidental` | string[] | Code points that survived every transformation except `ascii-only`, `printable-filter` and `latin1`. |
| `note` | string | Definition of survival. |

