export type Locale = "en" | "ja";

export const translations: Record<Locale, Record<string, string>> = {
  en: {
    tonality: "Tonality",
    key: "Key",
    piano: "Piano",
    guitar: "Guitar",
    freeInput: "Free Input",
    freeInputHint: "Cmaj7 Dm7 G7 C ...",
  },
  ja: {
    tonality: "調性",
    key: "キー",
    piano: "ピアノ",
    guitar: "ギター",
    freeInput: "フリー入力",
    freeInputHint: "Cmaj7 Dm7 G7 C ...",
  },
};
