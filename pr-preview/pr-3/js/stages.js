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
 */
export const STAGES = [
  {
    name: 'Holocene', short: 'Hol.', kind: 'warm', from: -11.7, to: 0, mis: '1',
    alps: 'Holocene', britain: 'Flandrian', america: 'Holocene',
    note: 'The current interglacial: farming, cities, and us.',
  },
  {
    name: 'Weichselian', short: 'Weichsel', kind: 'cold', from: -115, to: -11.7, mis: '5d–2',
    alps: 'Würm', britain: 'Devensian', america: 'Wisconsin',
    note: 'The last ice age. Ice reached its greatest extent about 21 kyr ago.',
  },
  {
    name: 'Eemian', short: 'Eem', kind: 'warm', from: -130, to: -115, mis: '5e',
    alps: 'Riss–Würm', britain: 'Ipswichian', america: 'Sangamonian',
    note: 'Last interglacial, a little warmer than today; hippos in the Thames and Rhine.',
  },
  {
    name: 'Saalian complex', short: 'Saale', kind: 'cold', from: -374, to: -130, mis: '10–6',
    alps: 'Riss', britain: 'Wolstonian', america: 'Illinoian',
    note: 'Three cold stages (MIS 10, 8, 6) with warm interludes in MIS 9 and 7. The Drenthe and Warthe ice advances in MIS 6 were the largest.',
  },
  {
    name: 'Holsteinian', short: 'Holstein', kind: 'warm', from: -424, to: -374, mis: '11',
    alps: 'Mindel–Riss', britain: 'Hoxnian', america: 'pre-Illinoian',
    note: 'A long, mild interglacial during a nearly circular orbit, much like the Holocene.',
  },
  {
    name: 'Elsterian', short: 'Elster', kind: 'cold', from: -478, to: -424, mis: '12',
    alps: 'Mindel', britain: 'Anglian', america: 'pre-Illinoian',
    note: 'One of the most extensive glaciations; ice reached the southern North Sea and cut the Strait of Dover.',
  },
  {
    name: 'Cromerian complex', short: 'Cromerian', kind: 'mixed', from: -866, to: -478, mis: '21–13',
    alps: 'Günz, Haslach', britain: 'Cromerian', america: 'pre-Illinoian',
    note: 'Four interglacials (Cromerian I–IV) and three glacials (A, B, C); the Don glaciation in MIS 16 was the largest.',
  },
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
