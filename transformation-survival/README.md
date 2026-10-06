# Which invisible characters survive ordinary software

Canonical write-up: <https://www.aiwatermarkremoval.com/lab/transformation-survival>.
Dataset v1.0.0, generated 2026-08-12.

## The question

When text carrying invisible characters passes through normalisation, JSON, URLs, base64, or a
whitespace cleanup, which characters survive and which are removed?

## Protocol

1. Take 18 characters: 13 that render as nothing (zero-width, joiner, bidirectional, variation
   selector, tag, soft hyphen, byte-order mark) and 5 that render as some kind of space.
2. For each character, build a carrier string with the character between two ordinary words, on
   each of two lines: `before<c>after\nsecond<c>line`. One character per test, so there are no
   interaction effects.
3. Apply each of 12 transformations to the carrier.
4. Record `true` if the exact code point is still present in the output, `false` if not, and `null`
   if the transformation threw (no cell threw).

Everything runs in Node.js with no dependencies. All 216 cells (18 × 12) are deterministic.

## The transformations

| id | Transformation | Code |
|---|---|---|
| `nfc` | Unicode NFC normalization | `s.normalize("NFC")` |
| `nfd` | Unicode NFD normalization | `s.normalize("NFD")` |
| `nfkc` | Unicode NFKC normalization | `s.normalize("NFKC")` |
| `nfkd` | Unicode NFKD normalization | `s.normalize("NFKD")` |
| `json` | JSON round-trip | `JSON.parse(JSON.stringify(s))` |
| `uri` | URI encode and decode | `decodeURIComponent(encodeURIComponent(s))` |
| `base64` | Base64 round-trip (UTF-8) | `Buffer` base64 encode, then decode as UTF-8 |
| `latin1` | Latin-1 storage (lossy) | `Buffer.from(s, "latin1").toString("latin1")`, which keeps the low byte of each UTF-16 code unit |
| `whitespace-collapse` | Whitespace collapse | `s.replace(/\s+/g, " ")` |
| `trim-lines` | Per-line trim | each line `.trim()` |
| `ascii-only` | Strip non-ASCII | `s.replace(/[^\x20-\x7E\n]/g, "")` |
| `printable-filter` | Strip Unicode format characters | `s.replace(/\p{Cf}/gu, "")` |

The last three are excluded when computing `survivesEverythingIncidental`: `ascii-only` and
`printable-filter` are deliberate removals and `latin1` is lossy storage, so surviving them would be
the unexpected result. The other nine are transformations text passes through without anyone trying
to clean it.

## How to read the matrix

`data/matrix.csv` has one row per character and one column per transformation id. Each cell is
`survives` or `destroyed` (or `error` if the transformation threw, which did not happen).
`data/matrix.json` holds the same results as booleans, plus the transformation notes, per-
transformation totals, and the list of characters that survived all nine incidental
transformations.

Survival means the exact code point is still present after the transformation. It does not mean the
rest of the text is unchanged: NFKC and the whitespace collapse alter other characters too.

## Results

From `data/matrix.json`:

- 12 of 18 characters survive all nine incidental transformations (`survivesEverythingIncidental`):
  U+200B, U+200C, U+200D, U+2060, U+00AD, U+034F, U+061C, U+200E, U+202D, U+2066, U+FE0F, U+E0041.
- NFC, NFD, JSON, URI, base64 and per-line trim: 18 of 18 survive.
- NFKC and NFKD: 14 survive. Both remove U+00A0, U+202F, U+2009 and U+3000.
- Whitespace collapse: 12 survive. It removes the five space-like characters and the byte-order mark
  U+FEFF, which JavaScript's `\s` treats as whitespace.
- Strip `\p{Cf}`: 7 survive (U+034F, U+FE0F and the five space-like characters).
- Latin-1 storage: 2 survive (U+00AD and U+00A0, the two characters below U+0100).
- Strip non-ASCII: 0 survive.

Survivals per character, out of 12, range from 10 (U+00AD, U+034F, U+FE0F) to 7 (U+202F, U+2009,
U+3000).

## Reproduce it

```sh
RUN_DATE=2026-08-12 node survive.mjs [outDir]      # default outDir: ./data
```

`outDir` is positional. `runDate` defaults to the current date unless `RUN_DATE` is set. With
`RUN_DATE=2026-08-12` on Node 22.22.0, both output files were byte-identical to the published ones
(checked 2026-10-06). To test another transformation, add an entry to the `transformations` array
and re-run.

## Limitations

1. Only transformations that run in code. Google Docs, Word, Notion and other applications cannot be
   run and verified here, so nothing is claimed about them.
2. It tests character survival, not watermark survival. No statistical text watermark is involved,
   and none could be observed by these methods.
3. One character per test. Real text carries combinations, and some transformations behave
   differently on a sequence than on a single character.
4. Results describe the Unicode data in the Node.js build that ran them. A change in Unicode
   normalisation data could move a cell.
5. One run, 2026-08-12.
