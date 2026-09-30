export const WEDDING = {
  groom: "Candra Purnama",
  bride: "Saskia",
  groomFull: "Candra Purnama",
  brideFull: "Saskia",
  dateLabel: "Kamis, 01 Oktober 2026",
  iso: "2026-10-01T10:00:00+08:00",
  resepsiIso: "2026-10-01T18:00:00+08:00",
  akadTime: "Pukul 10.00 WITA",
  resepsiTime: "Pukul 18.00 WITA",
  akadVenue: "Jalan Laremba (depan Masjid Babul Muttaqin)",
  resepsiVenue: "Jalan Puri Tawang Alun II No. 7 (depan Toyyib Jaya Mart)",
  akadMaps:
    "https://www.google.com/maps/search/?api=1&query=Masjid+Babul+Muttaqin+Jalan+Laremba",
  resepsiMaps: "https://maps.app.goo.gl/WQomHk9LmUHvuK949",
  groomParents: "Bapak Rafid Yasin & Ibu Sitti Nurbaya",
  brideParents: "Bapak Naim, S.Ip & Ibu Nursaida",
  igGroom: "https://www.instagram.com/cndra_purnama/",
  igBride: "https://www.instagram.com/cndra_purnama/",
  credit: "Safar Moramo",
  arabic:
    "وَمِنْ ءَايَاتِهِ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَاجًا لِّتَسْكُنُوا إِلَيْهَا وَجَعَلَ بَيْنَكُم مَّوَدَّةً وَرَحْمَةً ۚ إِنَّ فِى ذٰلِكَ لَءَايَاتٍ لِّقَوْمٍ يَتَفَكَّرُونَ",
  meaning:
    "Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang. Sungguh, pada yang demikian itu benar-benar terdapat tanda-tanda (kebesaran Allah) bagi kaum yang berpikir.",
  ref: "QS. Ar-Rum: 21",
};

export type Wish = {
  id: string;
  name: string;
  message: string;
  attend: "Hadir" | "Tidak Hadir";
  at: number;
  parentId?: string | null;
  likes: number;
};

const KEY = "candra-fulanah-wishes-v2";
const MINE_KEY = "undangan-ucapan-saya";
const LIKED_KEY = "undangan-ucapan-liked";

export function loadWishes(): Wish[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Wish[]) : [];
  } catch {
    return [];
  }
}

export function saveWishes(wishes: Wish[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(wishes));
}

export function loadMine(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MINE_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function rememberMine(id: string) {
  const next = [id, ...loadMine().filter((item) => item !== id)];
  localStorage.setItem(MINE_KEY, JSON.stringify(next));
}

export function loadLiked(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LIKED_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function rememberLiked(id: string) {
  const next = [id, ...loadLiked().filter((item) => item !== id)];
  localStorage.setItem(LIKED_KEY, JSON.stringify(next));
}
