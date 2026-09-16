/**
 * Named ice ages of the last 800,000 years.
 *
 * Two layers: the marine isotope stages (MIS) counted in deep-sea δ¹⁸O,
 * with boundary ages from the LR04 benthic stack (Lisiecki & Raymo 2005),
 * and the classic North European stage names that land geology hangs on
 * them. Odd MIS numbers are warm (interglacial), even numbers are cold
 * (glacial). Times are kyr relative to today, negative = past.
 */

// LR04 boundaries, kyr before present. MIS 1 is the Holocene.
export const MIS = [
  { n: 1, from: -14, to: 0 },
  { n: 2, from: -29, to: -14 },
  { n: 3, from: -57, to: -29 },
  { n: 4, from: -71, to: -57 },
  { n: 5, from: -130, to: -71 },
  { n: 6, from: -191, to: -130 },
  { n: 7, from: -243, to: -191 },
  { n: 8, from: -300, to: -243 },
  { n: 9, from: -337, to: -300 },
  { n: 10, from: -374, to: -337 },
  { n: 11, from: -424, to: -374 },
  { n: 12, from: -478, to: -424 },
  { n: 13, from: -533, to: -478 },
  { n: 14, from: -563, to: -533 },
  { n: 15, from: -621, to: -563 },
  { n: 16, from: -676, to: -621 },
  { n: 17, from: -712, to: -676 },
  { n: 18, from: -761, to: -712 },
  { n: 19, from: -790, to: -761 },
  { n: 20, from: -814, to: -790 },
  { n: 21, from: -866, to: -814 },
].map((s) => ({ ...s, warm: s.n % 2 === 1 }));

/**
 * North European stages (the Weichsel, Saale, Elster nomenclature of
 * Germany, the Netherlands and Scandinavia) with their usual equivalents.
 * kind: 'warm' interglacial, 'cold' glacial, 'mixed' a complex of both.
 * The display name, short label and note for each stage are looked up in
 * i18n.js as stage.<key>.name / .short / .note, in both languages.
 */
export const STAGES = [
  { key: 'holocene', kind: 'warm', from: -11.7, to: 0, mis: '1', alps: 'Holocene', britain: 'Flandrian', america: 'Holocene' },
  { key: 'weichselian', kind: 'cold', from: -115, to: -11.7, mis: '5d–2', alps: 'Würm', britain: 'Devensian', america: 'Wisconsin' },
  { key: 'eemian', kind: 'warm', from: -130, to: -115, mis: '5e', alps: 'Riss–Würm', britain: 'Ipswichian', america: 'Sangamonian' },
  { key: 'saalian', kind: 'cold', from: -374, to: -130, mis: '10–6', alps: 'Riss', britain: 'Wolstonian', america: 'Illinoian' },
  { key: 'holsteinian', kind: 'warm', from: -424, to: -374, mis: '11', alps: 'Mindel–Riss', britain: 'Hoxnian', america: 'pre-Illinoian' },
  { key: 'elsterian', kind: 'cold', from: -478, to: -424, mis: '12', alps: 'Mindel', britain: 'Anglian', america: 'pre-Illinoian' },
  { key: 'cromerian', kind: 'mixed', from: -866, to: -478, mis: '21–13', alps: 'Günz, Haslach', britain: 'Cromerian', america: 'pre-Illinoian' },
];

/** Marine isotope stage containing time t (kyr), or null in the future. */
export function misAt(t) {
  if (t > 0) return null;
  return MIS.find((s) => t >= s.from && t <= s.to) || null;
}

/** Named North European stage containing time t (kyr), or null in the future. */
export function stageAt(t) {
  if (t > 0) return null;
  return STAGES.find((s) => t >= s.from && t <= s.to) || null;
}
