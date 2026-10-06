#!/usr/bin/env node
/**
 * Invisible-character census over a corpus of model outputs.
 *
 * Usage:  node scan.mjs [corpusDir] [outDir]
 * Defaults: ./raw  ->  ./data
 *
 * No dependencies. Reads every .txt under corpusDir/<model>/<file>.txt, counts
 * code points by category, and writes aggregate.json + per-file.csv.
 *
 * The point of this script is that anyone can re-run it against their own
 * corpus and get a comparable number. Keep it dependency-free and boring.
 */

import { readdirSync, readFileSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { join, basename } from "node:path";

const corpusDir = process.argv[2] ?? new URL("./raw", import.meta.url).pathname;
const outDir = process.argv[3] ?? new URL("./data", import.meta.url).pathname;

/**
 * Categories of code point we count.
 *
 * "Invisible" here means: renders as nothing or as ordinary blank space, and so
 * can survive a visual read of the text. That is the class of character every
 * "AI watermark remover" on the web actually operates on.
 */
const INVISIBLE = [
  { key: "U+200B ZERO WIDTH SPACE", test: (c) => c === 0x200b, invisible: true },
  { key: "U+200C ZERO WIDTH NON-JOINER", test: (c) => c === 0x200c, invisible: true },
  { key: "U+200D ZERO WIDTH JOINER", test: (c) => c === 0x200d, invisible: true },
  { key: "U+2060 WORD JOINER", test: (c) => c === 0x2060, invisible: true },
  { key: "U+FEFF ZERO WIDTH NO-BREAK SPACE / BOM", test: (c) => c === 0xfeff, invisible: true },
  { key: "U+00AD SOFT HYPHEN", test: (c) => c === 0x00ad, invisible: true },
  { key: "U+034F COMBINING GRAPHEME JOINER", test: (c) => c === 0x034f, invisible: true },
  { key: "U+180E MONGOLIAN VOWEL SEPARATOR", test: (c) => c === 0x180e, invisible: true },
  { key: "U+061C ARABIC LETTER MARK", test: (c) => c === 0x061c, invisible: true },
  { key: "U+200E/200F LEFT/RIGHT-TO-LEFT MARK", test: (c) => c === 0x200e || c === 0x200f, invisible: true },
  { key: "U+202A-202E BIDI EMBEDDING/OVERRIDE", test: (c) => c >= 0x202a && c <= 0x202e, invisible: true },
  { key: "U+2066-2069 BIDI ISOLATE", test: (c) => c >= 0x2066 && c <= 0x2069, invisible: true },
  { key: "U+FE00-FE0F VARIATION SELECTOR", test: (c) => c >= 0xfe00 && c <= 0xfe0f, invisible: true },
  { key: "U+E0100-E01EF VARIATION SELECTOR SUPPLEMENT", test: (c) => c >= 0xe0100 && c <= 0xe01ef, invisible: true },
  { key: "U+E0000-E007F TAG CHARACTERS", test: (c) => c >= 0xe0000 && c <= 0xe007f, invisible: true },
  { key: "U+00A0 NO-BREAK SPACE", test: (c) => c === 0x00a0, invisible: true },
  { key: "U+202F NARROW NO-BREAK SPACE", test: (c) => c === 0x202f, invisible: true },
  { key: "U+2000-200A UNICODE SPACES", test: (c) => c >= 0x2000 && c <= 0x200a, invisible: true },
  { key: "U+1680 OGHAM SPACE MARK", test: (c) => c === 0x1680, invisible: true },
  { key: "U+3000 IDEOGRAPHIC SPACE", test: (c) => c === 0x3000, invisible: true },
];

/**
 * Visible typographic characters, counted for a different question: is there a
 * measurable stylistic fingerprint (the "em dash means AI" claim)?
 */
const TYPOGRAPHIC = [
  { key: "U+2014 EM DASH", test: (c) => c === 0x2014 },
  { key: "U+2013 EN DASH", test: (c) => c === 0x2013 },
  { key: "U+2019 RIGHT SINGLE QUOTATION MARK", test: (c) => c === 0x2019 },
  { key: "U+201C/201D CURLY DOUBLE QUOTES", test: (c) => c === 0x201c || c === 0x201d },
  { key: "U+2026 HORIZONTAL ELLIPSIS", test: (c) => c === 0x2026 },
];

const ALL = [...INVISIBLE, ...TYPOGRAPHIC];

function emptyCounts() {
  const counts = {};
  for (const cat of ALL) counts[cat.key] = 0;
  return counts;
}

function scanText(text) {
  const counts = emptyCounts();
  let codePoints = 0;
  let nonAscii = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    codePoints += 1;
    if (cp > 0x7f) nonAscii += 1;
    for (const cat of ALL) {
      if (cat.test(cp)) counts[cat.key] += 1;
    }
  }
  const words = text.split(/\s+/).filter(Boolean).length;
  return { counts, codePoints, nonAscii, words };
}

function listModels(dir) {
  return readdirSync(dir).filter((name) => statSync(join(dir, name)).isDirectory());
}

const models = listModels(corpusDir);
const perFile = [];
const perModel = {};
const overall = { files: 0, words: 0, codePoints: 0, nonAscii: 0, counts: emptyCounts() };

for (const model of models) {
  const modelDir = join(corpusDir, model);
  const files = readdirSync(modelDir).filter((f) => f.endsWith(".txt")).sort();
  perModel[model] = { files: 0, words: 0, codePoints: 0, nonAscii: 0, counts: emptyCounts() };

  for (const file of files) {
    const text = readFileSync(join(modelDir, file), "utf8");
    const { counts, codePoints, nonAscii, words } = scanText(text);

    perFile.push({ model, file: basename(file), words, codePoints, nonAscii, counts });

    perModel[model].files += 1;
    perModel[model].words += words;
    perModel[model].codePoints += codePoints;
    perModel[model].nonAscii += nonAscii;
    overall.files += 1;
    overall.words += words;
    overall.codePoints += codePoints;
    overall.nonAscii += nonAscii;
    for (const cat of ALL) {
      perModel[model].counts[cat.key] += counts[cat.key];
      overall.counts[cat.key] += counts[cat.key];
    }
  }
}

const invisibleKeys = INVISIBLE.map((c) => c.key);
const zeroWidthKeys = invisibleKeys.filter((k) => !k.includes("SPACE MARK") && !k.includes("NO-BREAK SPACE") && !k.includes("UNICODE SPACES") && !k.includes("IDEOGRAPHIC SPACE"));

function totalFor(counts, keys) {
  return keys.reduce((sum, key) => sum + counts[key], 0);
}

const summary = {
  corpus: { models, files: overall.files, words: overall.words, codePoints: overall.codePoints },
  invisibleTotal: totalFor(overall.counts, invisibleKeys),
  zeroWidthAndFormatTotal: totalFor(overall.counts, zeroWidthKeys),
  filesWithAnyZeroWidthOrFormat: perFile.filter((f) => totalFor(f.counts, zeroWidthKeys) > 0).length,
  byModel: Object.fromEntries(
    Object.entries(perModel).map(([model, m]) => [
      model,
      {
        files: m.files,
        words: m.words,
        zeroWidthAndFormatTotal: totalFor(m.counts, zeroWidthKeys),
        emDashesPer1000Words: m.words ? Number(((m.counts["U+2014 EM DASH"] / m.words) * 1000).toFixed(2)) : 0,
        emDashTotal: m.counts["U+2014 EM DASH"],
        curlyApostropheTotal: m.counts["U+2019 RIGHT SINGLE QUOTATION MARK"],
        nonBreakSpaceTotal: m.counts["U+00A0 NO-BREAK SPACE"],
      },
    ]),
  ),
  counts: overall.counts,
  countsByModel: Object.fromEntries(Object.entries(perModel).map(([k, v]) => [k, v.counts])),
};

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "aggregate.json"), `${JSON.stringify(summary, null, 2)}\n`);

const csvHeader = ["model", "file", "words", "code_points", "non_ascii", ...ALL.map((c) => c.key)].join(",");
const csvRows = perFile.map((row) =>
  [row.model, row.file, row.words, row.codePoints, row.nonAscii, ...ALL.map((c) => row.counts[c.key])].join(","),
);
writeFileSync(join(outDir, "per-file.csv"), `${csvHeader}\n${csvRows.join("\n")}\n`);

console.log(JSON.stringify(summary, null, 2));
