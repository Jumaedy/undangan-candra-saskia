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
};

const KEY = "candra-fulanah-wishes-v2";

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
  localStorage.setItem(KEY, JSON.stringify(wishes));
}

const WISH_STORE = "https://crudcrud.com/api/5294fc3acdb84b7ea4d5f7d3ce57183d/wishes";

function asWish(row: { _id?: string; name?: string; message?: string; attend?: string; at?: number }): Wish | null {
  if (row.attend !== "Hadir" && row.attend !== "Tidak Hadir") return null;
  const name = String(row.name ?? "").trim();
  const message = String(row.message ?? "").trim();
  if (!name || !message) return null;
  return {
    id: String(row._id ?? crypto.randomUUID()),
    name: name.slice(0, 80),
    message: message.slice(0, 500),
    attend: row.attend,
    at: typeof row.at === "number" ? row.at : Date.now(),
  };
}

export async function fetchSharedWishes(): Promise<Wish[]> {
  const res = await fetch(WISH_STORE);
  if (!res.ok) throw new Error("Daftar ucapan belum terbaca.");
  const rows = (await res.json()) as Array<Parameters<typeof asWish>[0]>;
  return rows
    .map((row) => asWish(row))
    .filter((row): row is Wish => Boolean(row))
    .sort((a, b) => b.at - a.at);
}

export async function postSharedWish(data: {
  name: string;
  message: string;
  attend: Wish["attend"];
}): Promise<Wish> {
  const at = Date.now();
  const res = await fetch(WISH_STORE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: data.name, message: data.message, attend: data.attend, at }),
  });
  if (!res.ok) throw new Error("Ucapan belum tersimpan.");
  const row = (await res.json()) as { _id?: string };
  return { id: String(row._id ?? crypto.randomUUID()), name: data.name, message: data.message, attend: data.attend, at };
}
