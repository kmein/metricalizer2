// all entries are normalised (see normWord)

export const FUNCTION_WORDS: Set<string> = new Set([
  // articles and pronouns
  "der", "die", "das", "den", "dem", "des", "ein", "ich", "du", "er", "sie", "es", "wir", "ihr",
  "mich", "dich", "sich", "mir", "dir", "uns", "euch", "ihm", "ihn", "sein", "mein", "dein",
  "wer", "was", "wen", "wem", "wes", "man",
  // prepositions
  "an", "auf", "aus", "bei", "bis", "durch", "für", "gen", "in", "mit", "nach", "seit", "um",
  "von", "vor", "zu", "zum", "zur", "am", "im", "ins", "vom", "beim", "ans", "aufs", "durchs",
  "fürs", "ums", "ab",
  // conjunctions and particles
  "und", "doch", "noch", "auch", "als", "wie", "wenn", "ob", "daß", "dass", "denn", "so", "da",
  "weil", "nun", "nicht", "nur", "schon", "ja", "gar", "wohl", "je",
  // auxiliaries and modals
  "bin", "bist", "ist", "sind", "seid", "war", "warst", "wart", "hat", "hast", "hab", "wird",
  "wirst", "werd", "kann", "kannst", "muß", "muss", "mußt", "musst", "soll", "sollst", "will",
  "willst", "darf", "mag",
]);

export const UNSTRESSED_PREFIXES = ["be", "ge", "ver", "zer", "ent", "emp", "er"];
export const STRESSED_PREFIXES = ["un", "ur"];

export const ADVERB_COMPOUND =
  /^(?:her|hin|da|dar|wo|wor|war|vor|hie|hier)(?:ab|an|auf|aus|bei|durch|ein|für|gegen|hin|her|in|mit|nach|neben|nieder|über|um|unter|von|vor|weg|wider|zu|zwischen)$/;

export const UNSTRESSED_SUFFIXES: RegExp[] = [
  /(?:lich|ig|isch)(?:e|en|er|es|em|ere|eren|ste|sten)?$/,
  /(?:ung|heit|keit|schaft)(?:en)?$/,
  /nis(?:se|sen)?$/,
  /ling(?:e|en)?$/,
  /(?:chen|lein|tum|sam|bar|haft|mal|sal)(?:e|en|er|es|em)?$/,
];

/** `vowel`: its first occurrence inside the match is the stressed one */
export const STRESSED_SUFFIXES: { re: RegExp; vowel: string }[] = [
  { re: /ei$/, vowel: "e" },
  { re: /ie$/, vowel: "i" },
  { re: /ier(?:en|e|st|t|te|ten|test|tet)?$/, vowel: "i" },
  { re: /ion(?:en)?$/, vowel: "o" },
  { re: /tät(?:en)?$/, vowel: "ä" },
  { re: /ur(?:en)?$/, vowel: "u" },
  { re: /ant(?:en)?$/, vowel: "a" },
  { re: /ent(?:en)?$/, vowel: "e" },
  { re: /ist(?:en)?$/, vowel: "i" },
  { re: /al$/, vowel: "a" },
  { re: /ell(?:e|en)?$/, vowel: "e" },
  { re: /ett(?:e|en)?$/, vowel: "e" },
  { re: /ee$/, vowel: "e" },
];

/** one `+`/`-` per syllable of syllabify(word) */
export const EXCEPTIONS: Record<string, string> = {
  lebendig: "-+-",
  holunder: "-+-",
  wacholder: "-+-",
  hornisse: "-+-",
  jahrhundert: "-+-",
  jahrhunderte: "-+--",
  vielleicht: "-+",
  zurück: "-+",
  allein: "-+",
  alleine: "-+-",
  sogar: "-+",
  zuerst: "-+",
  zuletzt: "-+",
  jedoch: "-+",
  obwohl: "-+",
  indem: "-+",
  nachdem: "-+",
  sobald: "-+",
  solang: "-+",
  solange: "-+-",
  bisher: "-+",
  hinfort: "-+",
  fortan: "-+",
  durchaus: "-+",
  einander: "-+-",
  kaffee: "+-",
  musik: "-+",
  kritik: "-+",
  fabrik: "-+",
  paris: "-+",
  berlin: "-+",
  apoll: "-+",
  hexameter: "-+--",
  pentameter: "-+--",
};

export const STEM_CLUSTERS = [
  "bl", "br", "dr", "fl", "fr", "gl", "gr", "kl", "kn", "kr", "pf", "pl", "pr", "schl", "schm",
  "schn", "schr", "schw", "spr", "str", "tr", "zw", "qu",
];
