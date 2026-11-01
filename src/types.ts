export type Bit = 0 | 1;

export type MeterFamily =
  | "iambic"
  | "trochaic"
  | "dactylic"
  | "dactylic_with_pre"
  | "anapestic"
  | "cretic"
  | "free_filling"
  | "alcaic"
  | "sapphic"
  | "asclepiadean_a"
  | "asclepiadean_b"
  | "distich"
  | "free_rhythm";

export type ReasonCode =
  | "LICENCE_MONO_UNSTRESSED_ON_LIFT"
  | "LICENCE_MONO_STRESSED_LINE_START_ON_DIP"
  | "LICENCE_FOOT_SUBSTITUTION"
  | "VIOLATION_SCHWA_ON_LIFT"
  | "VIOLATION_DISYLLABLE_STRESS_ON_DIP"
  | "MISMATCH_LIFT"
  | "MISMATCH_DIP";

export interface Syllable {
  text: string;
  word: number;
  index_in_word: number;
  word_syllables: number;
  nucleus: string;
  onset: string;
  coda: string;
  p_num: number;
  rules: string[];
  p_dig: Bit;
  meter: Bit;
  complexity: number;
  reason: ReasonCode | null;
}

export interface Line {
  text: string;
  words: string[];
  syllables: Syllable[];
  /** one `+`/`-` per syllable */
  prosody: string;
  /** one `+`/`-` per syllable */
  meter: string;
  stresses: number;
  complexity: number;
  rhyme: string;
}

export interface Stanza {
  lines: Line[];
  complexity: number;
}

export interface Analysis {
  title: string | null;
  author: string | null;
  ruleset: string;
  family: MeterFamily;
  label: string;
  forced: boolean;
  complexity: number;
  best_fit: { family: MeterFamily; complexity: number } | null;
  stanzas: Stanza[];
}
