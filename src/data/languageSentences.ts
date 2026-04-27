export type LanguageSentence = {
  id: string;
  code: string;
  label: {
    en: string;
    is: string;
  };
  sentence: string;
};

export const LANGUAGE_SENTENCES: LanguageSentence[] = [
  {
    id: "es-1",
    code: "es",
    label: { en: "Spanish", is: "Spænska" },
    sentence: "El tren llega a la estación antes del amanecer.",
  },
  {
    id: "fr-1",
    code: "fr",
    label: { en: "French", is: "Franska" },
    sentence: "La petite lampe reste allumée près de la fenêtre.",
  },
  {
    id: "de-1",
    code: "de",
    label: { en: "German", is: "Þýska" },
    sentence: "Der Regen klingt leise auf dem alten Dach.",
  },
  {
    id: "it-1",
    code: "it",
    label: { en: "Italian", is: "Ítalska" },
    sentence: "La strada scende lentamente verso il mare.",
  },
  {
    id: "pt-1",
    code: "pt",
    label: { en: "Portuguese", is: "Portúgalska" },
    sentence: "A cidade acorda cedo quando o sol aparece.",
  },
  {
    id: "nl-1",
    code: "nl",
    label: { en: "Dutch", is: "Hollenska" },
    sentence: "De fiets staat naast de brug in de regen.",
  },
  {
    id: "sv-1",
    code: "sv",
    label: { en: "Swedish", is: "Sænska" },
    sentence: "Den lilla båten ligger stilla vid bryggan.",
  },
  {
    id: "no-1",
    code: "no",
    label: { en: "Norwegian", is: "Norska" },
    sentence: "Fjellet blir blått når kvelden kommer.",
  },
  {
    id: "da-1",
    code: "da",
    label: { en: "Danish", is: "Danska" },
    sentence: "Barnet finder en rød sten på stranden.",
  },
  {
    id: "fi-1",
    code: "fi",
    label: { en: "Finnish", is: "Finnska" },
    sentence: "Metsän reunalla seisoo pieni sininen talo.",
  },
  {
    id: "pl-1",
    code: "pl",
    label: { en: "Polish", is: "Pólska" },
    sentence: "Na stole leży książka i kubek herbaty.",
  },
  {
    id: "cs-1",
    code: "cs",
    label: { en: "Czech", is: "Tékkneska" },
    sentence: "Starý most vede přes tichou řeku.",
  },
  {
    id: "tr-1",
    code: "tr",
    label: { en: "Turkish", is: "Tyrkneska" },
    sentence: "Küçük kedi güneşli pencerenin yanında uyuyor.",
  },
  {
    id: "id-1",
    code: "id",
    label: { en: "Indonesian", is: "Indónesíska" },
    sentence: "Burung kecil itu terbang di atas sawah hijau.",
  },
  {
    id: "tl-1",
    code: "tl",
    label: { en: "Tagalog", is: "Tagalog" },
    sentence: "Tahimik ang kalye pagkatapos ng malakas na ulan.",
  },
  {
    id: "ja-1",
    code: "ja",
    label: { en: "Japanese", is: "Japanska" },
    sentence: "小さな駅の前で猫が眠っています。",
  },
  {
    id: "ko-1",
    code: "ko",
    label: { en: "Korean", is: "Kóreska" },
    sentence: "조용한 아침에 창문을 열었습니다.",
  },
  {
    id: "zh-1",
    code: "zh",
    label: { en: "Chinese", is: "Kínverska" },
    sentence: "清晨的街道上只有几盏灯还亮着。",
  },
  {
    id: "ar-1",
    code: "ar",
    label: { en: "Arabic", is: "Arabíska" },
    sentence: "تفتح المدينة أبوابها مع أول ضوء في الصباح.",
  },
  {
    id: "he-1",
    code: "he",
    label: { en: "Hebrew", is: "Hebreska" },
    sentence: "הספר הישן מונח ליד החלון הפתוח.",
  },
  {
    id: "el-1",
    code: "el",
    label: { en: "Greek", is: "Gríska" },
    sentence: "Το μικρό καράβι γυρίζει αργά στο λιμάνι.",
  },
  {
    id: "ru-1",
    code: "ru",
    label: { en: "Russian", is: "Rússneska" },
    sentence: "Вечером на площади зажглись первые огни.",
  },
  {
    id: "uk-1",
    code: "uk",
    label: { en: "Ukrainian", is: "Úkraínska" },
    sentence: "Старий сад пахне яблуками після дощу.",
  },
  {
    id: "hi-1",
    code: "hi",
    label: { en: "Hindi", is: "Hindí" },
    sentence: "सुबह की धूप खिड़की से कमरे में आई।",
  },
  {
    id: "bn-1",
    code: "bn",
    label: { en: "Bengali", is: "Bengalska" },
    sentence: "ছোট নদীর ধারে নীল ফুল ফুটেছে।",
  },
  {
    id: "th-1",
    code: "th",
    label: { en: "Thai", is: "Taílenska" },
    sentence: "แมวตัวเล็กนอนอยู่ใต้โต๊ะไม้.",
  },
  {
    id: "vi-1",
    code: "vi",
    label: { en: "Vietnamese", is: "Víetnamska" },
    sentence: "Con đường nhỏ dẫn ra cánh đồng xanh.",
  },
  {
    id: "sw-1",
    code: "sw",
    label: { en: "Swahili", is: "Svahílí" },
    sentence: "Mtoto mdogo anacheza karibu na mti mkubwa.",
  },
  {
    id: "ga-1",
    code: "ga",
    label: { en: "Irish", is: "Írska" },
    sentence: "Tá an ghaoth ag séideadh thar an gcnoc ciúin.",
  },
  {
    id: "cy-1",
    code: "cy",
    label: { en: "Welsh", is: "Velska" },
    sentence: "Mae'r afon fach yn llifo drwy'r pentref.",
  },
  {
    id: "is-1",
    code: "is",
    label: { en: "Icelandic", is: "Íslenska" },
    sentence: "Litli báturinn liggur kyrr við bryggjuna.",
  },
];
