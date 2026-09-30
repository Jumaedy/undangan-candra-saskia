import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  addGuests,
  deleteGuest,
  deleteGuestsBulk,
  deleteWish,
  getSettings,
  listGuests,
  listWishes,
  pinStatus,
  updateGuest,
  updateWish,
  type InvitationSettings,
} from "@/lib/undangan.functions";
import { WEDDING, type Wish } from "@/lib/wedding";

export const Route = createFileRoute("/kelola")({
  component: Kelola,
});

/** Hanya admin yang tahu sandi ini. Tamu tidak pernah membuka /kelola. */
const GUEST_KEY = "undangan-tamu-lokal";
const SANDI = "istigfar8888";
const PINTU_KEY = "undangan-pintu";

type Guest = { id: number; name: string };

function loadLocal(): Guest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    const parsed = raw ? (JSON.parse(raw) as Guest[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function Kelola() {
  const [guests, setGuests] = useState<Guest[]>(loadLocal);
  const [names, setNames] = useState("");
  const [notice, setNotice] = useState("");
  const [terbuka, setTerbuka] = useState(false);
  const [draft, setDraft] = useState("");
  const [salah, setSalah] = useState(false);
  const [tab, setTab] = useState<"tamu" | "isi" | "ucapan" | "laporan">("tamu");
  const [server, setServer] = useState<"cek" | "hidup" | "mati">("cek");
  const [settings, setSettings] = useState<InvitationSettings>(WEDDING);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [waQueue, setWaQueue] = useState<string[]>([]);
  const [wishNote, setWishNote] = useState("");
  const [wishTick, setWishTick] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(PINTU_KEY) === "1") setTerbuka(true);
    const timer = window.setTimeout(() => {
      setServer((current) => (current === "cek" ? "mati" : current));
    }, 4000);
    pinStatus()
      .then(async () => {
        window.clearTimeout(timer);
        setServer("hidup");
        const nextSettings = await getSettings();
        setSettings(nextSettings);
      })
      .catch(() => {
        window.clearTimeout(timer);
        setServer("mati");
      });
    return () => window.clearTimeout(timer);
  }, []);

  // Saat admin masuk & server hidup, coba sinkron daftar tamu dari database
  useEffect(() => {
    if (!terbuka || server !== "hidup") return;
    void listGuests({ data: { pin: SANDI } })
      .then((res) => {
        if (res.ok && res.guests.length > 0) {
          setGuests(res.guests);
          localStorage.setItem(GUEST_KEY, JSON.stringify(res.guests));
        }
      })
      .catch(() => {
        /* tetap pakai localStorage */
      });
  }, [terbuka, server]);

  useEffect(() => {
    if (!terbuka) return;
    setWishNote("");
    void listWishes()
      .then((rows) => {
        setWishes(rows);
        setWishNote("");
      })
      .catch(() => setWishNote("Daftar ucapan belum terbaca dari database. Tekan Muat ulang."));
  }, [terbuka, tab, wishTick]);

  function masuk(e: FormEvent) {
    e.preventDefault();
    if (draft.trim() !== SANDI) {
      setSalah(true);
      return;
    }
    sessionStorage.setItem(PINTU_KEY, "1");
    setTerbuka(true);
    setSalah(false);
    setDraft("");
  }

  function logout() {
    sessionStorage.removeItem(PINTU_KEY);
    setTerbuka(false);
    setSelected([]);
    setWaQueue([]);
    setNotice("");
  }

  function simpanLokal(next: Guest[]) {
    setGuests(next);
    localStorage.setItem(GUEST_KEY, JSON.stringify(next));
    setSelected((prev) => prev.filter((id) => next.some((g) => g.id === id)));
  }

  async function tambahTamu(e: FormEvent) {
    e.preventDefault();
    const list = names
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (list.length === 0) return;
    setBusy(true);
    try {
      if (server === "hidup") {
        const res = await addGuests({ data: { pin: SANDI, names: list } });
        if (res.ok) {
          const refreshed = await listGuests({ data: { pin: SANDI } });
          if (refreshed.ok) {
            simpanLokal(refreshed.guests);
            setNames("");
            setNotice(`${list.length} tamu ditambahkan ke server.`);
            return;
          }
        }
      }
      // fallback lokal (Vercel tanpa database)
      const start = Date.now();
      simpanLokal([...list.map((name, i) => ({ id: start + i, name })), ...guests]);
      setNames("");
      setNotice(`${list.length} tamu ditambahkan (tersimpan di perangkat ini).`);
    } finally {
      setBusy(false);
    }
  }

  function tautan(name: string) {
    return `${window.location.origin}/?to=${encodeURIComponent(`${name}~k`)}`;
  }

  function pesan(name: string) {
    const jarak = "\u00A0";
    return [
      "Bismillah....Assalamu'alaikum warahmatullahi wabarakatuh.",
      `Kepada ${name}`,
      jarak,
      "Tanpa mengurangi rasa hormat, kami mengundang Bapak/Ibu untuk hadir pada pernikahan kami:",
      jarak,
      "Candra Purnama & Saskia",
      "Kamis, 01 Oktober 2026",
      "Akad pukul 10.00 WITA",
      "Resepsi pukul 18.00 WITA",
      jarak,
      "Mohon kesediaan Bapak/Ibu untuk membuka undangan di tautan berikut:",
      tautan(name),
      jarak,
      "Wassalamu'alaikum warahmatullahi wabarakatuh.",
    ].join("\n");
  }

  async function salin(name: string) {
    await navigator.clipboard.writeText(pesan(name));
    setNotice(`Pesan ${name} disalin, lengkap dengan jarak barisnya.`);
  }

  function wa(name: string) {
    window.open(`https://wa.me/?text=${encodeURIComponent(pesan(name))}`, "_blank", "noopener,noreferrer");
  }

  function toggleSelect(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleSelectAll() {
    if (selected.length === guests.length) {
      setSelected([]);
    } else {
      setSelected(guests.map((g) => g.id));
    }
  }

  async function editGuest(id: number) {
    const guest = guests.find((g) => g.id === id);
    if (!guest) return;
    const baru = window.prompt("Ubah nama tamu:", guest.name);
    if (baru === null) return;
    const namaBaru = baru.trim();
    if (!namaBaru || namaBaru === guest.name) return;

    if (server === "hidup") {
      try {
        const res = await updateGuest({ data: { pin: SANDI, id, name: namaBaru } });
        if (res.ok) {
          simpanLokal(guests.map((g) => (g.id === id ? { ...g, name: namaBaru } : g)));
          setNotice(`Nama diubah menjadi "${namaBaru}".`);
          return;
        }
      } catch {
        /* fallback lokal */
      }
    }
    simpanLokal(guests.map((g) => (g.id === id ? { ...g, name: namaBaru } : g)));
    setNotice(`Nama diubah menjadi "${namaBaru}" (lokal).`);
  }

  async function hapusSatu(id: number) {
    if (!window.confirm("Hapus tamu ini?")) return;
    if (server === "hidup") {
      try {
        await deleteGuest({ data: { pin: SANDI, id } });
      } catch {
        /* tetap hapus lokal */
      }
    }
    simpanLokal(guests.filter((g) => g.id !== id));
    setNotice("Tamu dihapus.");
  }

  async function hapusMassal() {
    if (selected.length === 0) return;
    if (!window.confirm(`Hapus ${selected.length} tamu terpilih?`)) return;
    const jumlah = selected.length;
    const ids = [...selected];
    if (server === "hidup") {
      try {
        await deleteGuestsBulk({ data: { pin: SANDI, ids } });
      } catch {
        /* tetap hapus lokal */
      }
    }
    simpanLokal(guests.filter((g) => !ids.includes(g.id)));
    setSelected([]);
    setNotice(`${jumlah} tamu dihapus.`);
  }

  /**
   * WA Massal: browser HP memblokir banyak popup sekaligus.
   * Solusi andal = antrian + klik "Lanjut Kirim" satu per satu (setiap klik = 1 gestur user).
   */
  function mulaiWAMassal() {
    if (selected.length === 0) return;
    const list = guests.filter((g) => selected.includes(g.id)).map((g) => g.name);
    setWaQueue(list);
    wa(list[0]);
    setNotice(`Membuka 1 dari ${list.length}. Setelah kirim di WA, kembali ke sini & klik "Lanjut Kirim".`);
  }

  function lanjutKirimWA() {
    if (waQueue.length <= 1) {
      setWaQueue([]);
      setNotice("Selesai mengirim semua pesan WhatsApp.");
      return;
    }
    const sisa = waQueue.slice(1);
    setWaQueue(sisa);
    wa(sisa[0]);
    setNotice(`Membuka berikutnya. Sisa ${sisa.length - 1} setelah ini. Klik "Lanjut Kirim" lagi.`);
  }

  function batalkanAntrian() {
    setWaQueue([]);
    setNotice("Antrian WhatsApp dibatalkan.");
  }

  async function ubahUcapan(wish: Wish) {
    const baru = window.prompt("Ubah ucapan:", wish.message);
    if (baru === null) return;
    const message = baru.trim();
    if (!message || message === wish.message) return;
    const nextWish = { ...wish, message };
    try {
      const res = await updateWish({ data: { id: wish.id, message, pin: SANDI } });
      if (!res.ok) {
        setNotice(res.error ?? "Ucapan belum berubah.");
        return;
      }
      setWishes((prev) => prev.map((item) => (item.id === wish.id ? nextWish : item)));
      setNotice("Ucapan diubah di database.");
    } catch {
      setNotice("Ucapan belum berubah. Coba lagi.");
    }
  }

  async function hapusUcapan(wish: Wish) {
    if (!window.confirm(`Hapus ucapan ${wish.name}?`)) return;
    try {
      const res = await deleteWish({ data: { pin: SANDI, id: wish.id } });
      if (!res.ok) {
        setNotice(res.error ?? "Ucapan belum terhapus.");
        return;
      }
      setWishes((prev) => prev.filter((item) => item.id !== wish.id));
      setNotice("Ucapan dihapus dari database.");
    } catch {
      setNotice("Ucapan belum terhapus. Coba lagi.");
    }
  }

  const hadir = wishes.filter((w) => w.attend === "Hadir").length;
  const tidakHadir = wishes.filter((w) => w.attend === "Tidak Hadir").length;

  return (
    <Shell>
      {!terbuka ? (
        <form onSubmit={masuk}>
          <h1 className="font-serif text-3xl text-[#f7f3ea]">Masuk panel admin</h1>
          <p className="mt-2 text-sm text-[#d7e6de]">
            Halaman ini khusus pengelola undangan. Tamu tidak perlu login dan tidak bisa melihat daftar
            nama tanpa kata sandi.
          </p>
          <input
            type="password"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setSalah(false);
            }}
            required
            placeholder="Kata sandi admin"
            className="mt-6 min-h-11 w-full rounded-2xl border border-[#d4af37]/40 bg-[#05281e] px-4 text-sm text-[#f7f3ea] outline-none"
          />
          {salah && <p className="mt-3 text-sm text-[#f3e6c0]">Kata sandi salah.</p>}
          <button className="mt-4 min-h-11 w-full rounded-full bg-linear-to-r from-[#f3e6c0] to-[#d4af37] font-serif text-xs tracking-[0.2em] text-[#05281e] uppercase">
            Masuk
          </button>
        </form>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-serif text-3xl text-[#f7f3ea]">Kelola undangan</h1>
              <p className="mt-2 text-sm text-[#d7e6de]">
                {server === "mati"
                  ? "Mode lokal: daftar tamu tersimpan di HP/browser ini. Tautan undangan tetap bisa dibuka tamu."
                  : server === "hidup"
                    ? "Tersambung database. Daftar tamu ikut tersinkron jika server aktif."
                    : "Memeriksa koneksi…"}
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="shrink-0 rounded-full border border-[#d4af37]/40 px-3 py-1.5 text-xs text-[#f3e6c0]"
            >
              Logout
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              [
                ["tamu", "Tamu"],
                ["ucapan", "Ucapan"],
                ["laporan", "Laporan"],
                ["isi", "Isi"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={
                  tab === id
                    ? "min-h-11 rounded-full bg-[#d4af37] text-xs tracking-wide text-[#05281e] uppercase"
                    : "min-h-11 rounded-full border border-[#d4af37]/40 text-xs tracking-wide text-[#f7f3ea] uppercase"
                }
              >
                {label}
              </button>
            ))}
          </div>

          {notice && <p className="mt-4 text-sm text-[#f3e6c0]">{notice}</p>}

          {waQueue.length > 0 && (
            <div className="mt-4 rounded-2xl border border-[#d4af37]/40 bg-[#0a3328] p-4">
              <p className="text-sm text-[#f3e6c0]">
                Antrian WhatsApp: <strong>{waQueue.length}</strong> tersisa (termasuk yang sedang dibuka)
              </p>
              <p className="mt-1 text-xs text-[#d7e6de]">
                Kirim dulu di aplikasi WhatsApp, lalu kembali ke halaman ini dan tekan Lanjut Kirim.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={lanjutKirimWA}
                  className="min-h-10 flex-1 rounded-full bg-[#0e6b4f] text-xs text-[#f7f3ea]"
                >
                  Lanjut Kirim
                </button>
                <button
                  type="button"
                  onClick={batalkanAntrian}
                  className="min-h-10 rounded-full border border-[#d4af37]/40 px-4 text-xs text-[#d7e6de]"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {tab === "tamu" && (
            <form onSubmit={(e) => void tambahTamu(e)} className="mt-6">
              <label className="text-sm text-[#d7e6de]">Satu nama per baris. Bisa tempel banyak sekaligus.</label>
              <textarea
                value={names}
                onChange={(e) => setNames(e.target.value)}
                rows={5}
                placeholder={"Pak Jumaedy, S.Kom\nKeluarga Besar"}
                className="mt-2 w-full rounded-2xl border border-[#d4af37]/40 bg-[#05281e] px-4 py-3 text-sm text-[#f7f3ea] outline-none"
              />
              <button
                disabled={busy}
                className="mt-3 min-h-11 w-full rounded-full bg-linear-to-r from-[#f3e6c0] to-[#d4af37] font-serif text-xs tracking-[0.2em] text-[#05281e] uppercase disabled:opacity-60"
              >
                {busy ? "Menyimpan…" : "Tambah tamu"}
              </button>

              {guests.length > 0 && (
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-[#d7e6de]">
                    <input
                      type="checkbox"
                      checked={selected.length === guests.length && guests.length > 0}
                      onChange={toggleSelectAll}
                      className="size-4 accent-[#d4af37]"
                    />
                    Pilih semua ({selected.length}/{guests.length})
                  </label>
                  {selected.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={mulaiWAMassal}
                        className="min-h-9 rounded-full bg-[#0e6b4f] px-4 text-xs text-[#f7f3ea]"
                      >
                        WA Massal ({selected.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => void hapusMassal()}
                        className="min-h-9 rounded-full border border-red-400/60 px-4 text-xs text-red-300"
                      >
                        Hapus Massal
                      </button>
                    </div>
                  )}
                </div>
              )}

              <ul className="mt-4 space-y-3">
                {guests.length === 0 && (
                  <li className="text-sm text-[#d7e6de]">Belum ada tamu. Tambahkan nama di atas.</li>
                )}
                {guests.map((guest) => (
                  <li key={guest.id} className="rounded-2xl border border-[#d4af37]/25 bg-[#05281e] p-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(guest.id)}
                        onChange={() => toggleSelect(guest.id)}
                        className="mt-1 size-4 shrink-0 accent-[#d4af37]"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-serif text-lg text-[#f7f3ea]">{guest.name}</p>
                        <p className="mt-1 truncate text-xs text-[#d7e6de]">{tautan(guest.name)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void editGuest(guest.id)}
                        className="min-h-10 rounded-full border border-[#d4af37]/50 px-3 text-xs text-[#f3e6c0]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void salin(guest.name)}
                        className="min-h-10 flex-1 rounded-full border border-[#d4af37]/50 text-xs text-[#f3e6c0]"
                      >
                        Salin
                      </button>
                      <button
                        type="button"
                        onClick={() => wa(guest.name)}
                        className="min-h-10 flex-1 rounded-full bg-[#0e6b4f] text-xs text-[#f7f3ea]"
                      >
                        WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={() => void hapusSatu(guest.id)}
                        className="min-h-10 rounded-full px-3 text-xs text-[#d7e6de]"
                      >
                        Hapus
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </form>
          )}

          {tab === "laporan" && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-[#d4af37]/25 bg-[#05281e] p-4 text-center">
                  <p className="text-2xl font-serif text-[#f7f3ea]">{guests.length}</p>
                  <p className="mt-1 text-[10px] tracking-wide text-[#d7e6de] uppercase">Tamu undangan</p>
                </div>
                <div className="rounded-2xl border border-[#d4af37]/25 bg-[#05281e] p-4 text-center">
                  <p className="text-2xl font-serif text-[#f7f3ea]">{hadir}</p>
                  <p className="mt-1 text-[10px] tracking-wide text-[#d7e6de] uppercase">Konfirmasi hadir</p>
                </div>
                <div className="rounded-2xl border border-[#d4af37]/25 bg-[#05281e] p-4 text-center">
                  <p className="text-2xl font-serif text-[#f7f3ea]">{tidakHadir}</p>
                  <p className="mt-1 text-[10px] tracking-wide text-[#d7e6de] uppercase">Tidak hadir</p>
                </div>
              </div>
              <p className="text-sm text-[#d7e6de]">
                Total ucapan/doa: <strong className="text-[#f3e6c0]">{wishes.length}</strong>
              </p>
              <p className="text-xs text-[#d7e6de]">
                Data konfirmasi diambil dari form RSVP di undangan. Daftar tamu yang dikirim undangan di tab
                Tamu.
              </p>
            </div>
          )}

          {tab === "isi" && (
            <div className="mt-6 space-y-2 text-sm text-[#d7e6de]">
              <p>
                {settings.groom} & {settings.bride}
              </p>
              <p>{settings.dateLabel}</p>
              <p>
                Akad: {settings.akadTime} — {settings.akadVenue}
              </p>
              <p>
                Resepsi: {settings.resepsiTime} — {settings.resepsiVenue}
              </p>
              {server !== "hidup" && (
                <p className="pt-2 text-[#f3e6c0]">
                  Mengubah isi undangan untuk semua pengunjung di Vercel membutuhkan database (Neon).
                  Membagikan tautan tamu tetap bisa tanpa database.
                </p>
              )}
            </div>
          )}

          {tab === "ucapan" && (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setWishTick((n) => n + 1)}
                className="min-h-10 rounded-full border border-[#d4af37]/50 px-4 text-xs text-[#f3e6c0]"
              >
                Muat ulang
              </button>
              {wishNote && <p className="mt-3 text-sm text-[#f3e6c0]">{wishNote}</p>}
              <ul className="mt-4 space-y-3">
                {wishes.length === 0 && !wishNote && (
                  <li className="text-sm text-[#d7e6de]">Belum ada ucapan dari tamu.</li>
                )}
                {wishes.map((wish) => (
                  <li key={wish.id} className="rounded-2xl border border-[#d4af37]/25 bg-[#05281e] p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-serif text-[#f7f3ea]">{wish.name}</p>
                      <span className="text-[10px] tracking-wide text-[#d4af37] uppercase">{wish.attend}</span>
                    </div>
                    <p className="mt-1 text-sm text-[#d7e6de]">{wish.message}</p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => void ubahUcapan(wish)}
                        className="min-h-10 rounded-full border border-[#d4af37]/50 px-3 text-xs text-[#f3e6c0]"
                      >
                        Ubah
                      </button>
                      <button
                        type="button"
                        onClick={() => void hapusUcapan(wish)}
                        className="min-h-10 rounded-full px-3 text-xs text-[#d7e6de]"
                      >
                        Hapus
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-svh bg-[#041c16] px-5 py-8 text-[#f7f3ea]">
      <div className="mx-auto max-w-lg">
        <Link to="/" search={{ to: "Tamu Undangan" }} className="text-xs tracking-[0.2em] text-[#d4af37] uppercase">
          Lihat undangan
        </Link>
        <div className="mt-4">{children}</div>
      </div>
    </main>
  );
}
