export type Locale = "en" | "is";

export type GameStatus = "idle" | "playing" | "won" | "lost";

export type Game = {
  id: string;
  slug: string;
  titleKey: string;
  descriptionKey: string;
  emoji: string;
  available: boolean;
};

export type DailyPuzzle = {
  id: string;
  game_id: string;
  date: string; // YYYY-MM-DD
  answer_id: string;
  answer_data: Record<string, unknown>;
  created_at: string;
};

export type UserScore = {
  id: string;
  user_id: string;
  game_id: string;
  date: string;
  won: boolean;
  guesses: number;
  streak: number;
  created_at: string;
};

export type Waterfall = {
  id: string;
  name_en: string;
  name_is: string;
  region: string;
  height_m: number | null;
  image_url: string;
  fun_fact_en: string | null;
  fun_fact_is: string | null;
};

export type GuessResult = "correct" | "wrong" | "close";
