#!/usr/bin/env node
/**
 * Transformation-survival matrix.
 *
 * Question: when text carrying invisible characters passes through the ordinary
 * transformations that software applies to text, which characters survive?
 *
 * Method: seed a carrier string with one instance of each character, run each
 * transformation, and check whether the character is still present afterwards.
 * Every transformation here is a real operation that real pipelines perform, and
 * every one runs locally with no dependencies — which is the point. A claim about
 * Google Docs or Word cannot be verified here and is therefore not made.
 *
 * Usage: node survive.mjs [outDir]      (default: ./data)
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = process.argv[2] ?? new URL("./data", import.meta.url).pathname;

/** The characters an "AI watermark remover" actually operates on. */
const characters = [
  { code: "U+200B", name: "Zero width space", char: "​" },
  { code: "U+200C", name: "Zero width non-joiner", char: "‌" },
  { code: "U+200D", name: "Zero width joiner", char: "‍" },
  { code: "U+2060", name: "Word joiner", char: "⁠" },
  { code: "U+FEFF", name: "Zero width no-break space (BOM)", char: "﻿" },
  { code: "U+00AD", name: "Soft hyphen", char: "­" },
  { code: "U+034F", name: "Combining grapheme joiner", char: "͏" },
  { code: "U+061C", name: "Arabic letter mark", char: "؜" },
  { code: "U+200E", name: "Left-to-right mark", char: "‎" },
  { code: "U+202D", name: "Left-to-right override", char: "‭" },
  { code: "U+2066", name: "Left-to-right isolate", char: "⁦" },
  { code: "U+FE0F", name: "Variation selector 16", char: "️" },
  { code: "U+E0041", name: "Tag latin capital A", char: "\u{E0041}" },
  { code: "U+00A0", name: "No-break space", char: " " },
  { code: "U+202F", name: "Narrow no-break space", char: " " },
  { code: "U+2009", name: "Thin space", char: " " },
  { code: "U+3000", name: "Ideographic space", char: "　" },
  { code: "U+1680", name: "Ogham space mark", char: " " },
];

/**
 * Each transformation is something software genuinely does to text. The `note`
 * is what a reader needs to know about where it shows up in the wild.
 */
const transformations = [
  {
    id: "nfc",
    label: "Unicode NFC normalization",
    note: "The default normalization for storage and comparison in many systems.",
    run: (s) => s.normalize("NFC"),
  },
  {
    id: "nfd",
    label: "Unicode NFD normalization",
    note: "Canonical decomposition. Used by some filesystems, notably macOS HFS+.",
    run: (s) => s.normalize("NFD"),
  },
  {
    id: "nfkc",
    label: "Unicode NFKC normalization",
    note: "Compatibility normalization. Applied by identifier rules, search indexes, and many sanitizers.",
    run: (s) => s.normalize("NFKC"),
  },
  {
    id: "nfkd",
    label: "Unicode NFKD normalization",
    note: "Compatibility decomposition, the aggressive cousin of NFKC.",
    run: (s) => s.normalize("NFKD"),
  },
  {
    id: "json",
    label: "JSON round-trip",
    note: "Every API call, config file, and log line that carries the text.",
    run: (s) => JSON.parse(JSON.stringify(s)),
  },
  {
    id: "uri",
    label: "URI encode and decode",
    note: "Query strings, form submissions, and anything that travels in a URL.",
    run: (s) => decodeURIComponent(encodeURIComponent(s)),
  },
  {
    id: "base64",
    label: "Base64 round-trip (UTF-8)",
    note: "Email transport, data URIs, and token payloads.",
    run: (s) => Buffer.from(s, "utf8").toString("base64") && Buffer.from(Buffer.from(s, "utf8").toString("base64"), "base64").toString("utf8"),
  },
  {
    id: "latin1",
    label: "Latin-1 storage (lossy)",
    note: "A legacy database column or export that keeps only the low byte of each character.",
    // Buffer.from(str, "latin1") truncates each code unit to its low byte, which
    // is exactly what a naive single-byte column does to text it cannot hold.
    run: (s) => Buffer.from(s, "latin1").toString("latin1"),
  },
  {
    id: "whitespace-collapse",
    label: "Whitespace collapse (/\\s+/ to one space)",
    note: "The single most common 'tidy up this text' regex in production code.",
    run: (s) => s.replace(/\s+/g, " "),
  },
  {
    id: "trim-lines",
    label: "Per-line trim",
    note: "Applied by editors on save, and by most Markdown pipelines.",
    run: (s) => s.split("\n").map((line) => line.trim()).join("\n"),
  },
  {
    id: "ascii-only",
    label: "Strip non-ASCII",
    note: "The naive sanitizer. Destroys accented letters and every non-Latin script too.",
    run: (s) => s.replace(/[^\x20-\x7E\n]/g, ""),
  },
  {
    id: "printable-filter",
    label: "Strip Unicode format characters (\\p{Cf})",
    note: "The targeted version: removes the format category and leaves real text alone.",
    run: (s) => s.replace(/\p{Cf}/gu, ""),
  },
];

/**
 * Carrier: the character sits between two ordinary words, on its own line, so a
 * per-line trim has something to act on and a whitespace collapse sees real
 * neighbours. Using one character per test avoids interaction effects.
 */
function carrier(char) {
  return `before${char}after\nsecond${char}line`;
}

const results = [];
for (const character of characters) {
  const input = carrier(character.char);
  const row = { code: character.code, name: character.name, survives: {} };
  for (const transformation of transformations) {
    let survived;
    try {
      survived = transformation.run(input).includes(character.char);
    } catch {
      survived = null; // transformation threw on this input
    }
    row.survives[transformation.id] = survived;
  }
  results.push(row);
}

const summary = {
  study: "Transformation-survival matrix for invisible characters",
  runDate: process.env.RUN_DATE ?? new Date().toISOString().slice(0, 10),
  characters: characters.length,
  transformations: transformations.map(({ id, label, note }) => ({ id, label, note })),
  results,
  totals: transformations.map((t) => ({
    id: t.id,
    label: t.label,
    survivors: results.filter((r) => r.survives[t.id] === true).length,
    destroyed: results.filter((r) => r.survives[t.id] === false).length,
  })),
  // Which characters come through every transformation that is NOT explicitly
  // trying to remove them. The two targeted strippers and the lossy encoding are
  // excluded, because surviving those would be the surprising result.
  survivesEverythingIncidental: results
    .filter((r) =>
      transformations
        .filter((t) => !["ascii-only", "printable-filter", "latin1"].includes(t.id))
        .every((t) => r.survives[t.id] === true),
    )
    .map((r) => r.code),
  note:
    "Survival means the exact code point is still present after the transformation. It does not mean the text is unchanged, and it says nothing about applications this script cannot run.",
};

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "matrix.json"), `${JSON.stringify(summary, null, 2)}\n`);

const header = ["code", "name", ...transformations.map((t) => t.id)].join(",");
const rows = results.map((r) => [r.code, `"${r.name}"`, ...transformations.map((t) => (r.survives[t.id] === null ? "error" : r.survives[t.id] ? "survives" : "destroyed"))].join(","));
writeFileSync(join(outDir, "matrix.csv"), `${header}\n${rows.join("\n")}\n`);

console.log(JSON.stringify({ totals: summary.totals, survivesEverythingIncidental: summary.survivesEverythingIncidental }, null, 2));
