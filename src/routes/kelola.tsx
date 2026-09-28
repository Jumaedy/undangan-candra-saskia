import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { getSettings, pinStatus } from "@/lib/undangan.functions";
import { WEDDING, fetchSharedWishes, loadWishes, type Wish } from "@/lib/wedding";
import type { InvitationSettings } from "@/lib/undangan.functions";

export const Route = createFileRoute("/kelola")({
  component: Kelola,
});

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
  const [tab, setTab] = useState<"tamu" | "isi" | "ucapan">("tamu");
  const [server, setServer] = useState<"cek" | "hidup" | "mati">("cek");
  const [settings, setSettings] = useState<InvitationSettings>(WEDDING);
  const [wishes, setWishes] = useState<Wish[]>(loadWishes);
  const [selected, setSelected] = useState<number[]>([]);
  const [waQueue, setWaQueue] = useState<string[]>([]);
  const [wishNote, setWishNote] = useState("");
  const [wishTick, setWishTick] = useState(0);

  useEffect(() => {
    if (sessionStorage.getItem(PINTU_KEY) === "1") setTerbuka(true);
    const timer = window.setTimeout(() => {
      setServer((current) => (current === "cek" ? "mati" : current));
    }, 4000);
    pinStatus()
      .then(async () => {
        window.clearTimeout(timer);
        setServer("hidup");
        const [nextSettings, nextWishes] = await Promise.all([getSettings(), listWishes()]);
        setSettings(nextSettings);
        if (nextWishes.length > 0) setWishes(nextWishes);
      })
      .catch(() => {
        window.clearTimeout(timer);
        setServer("mati");
      });
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!terbuka) return;
    setWishNote("");
    void listWishes()
      .then((rows) => {
        setWishes(rows);
        setWishNote("");
      })
      .catch(() => setWishNote("Daftar ucapan belum terbaca. Tekan Muat ulang."));
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

  function simpan(next: Guest[]) {
    setGuests(next);
    localStorage.setItem(GUEST_KEY, JSON.stringify(next));
    setSelected((prev) => prev.filter((id) => next.some((g) => g.id === id)));
  }

  function tambahTamu(e: FormEvent) {
    e.preventDefault();
    const list = names
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (list.length === 0) return;
    const start = Date.now();
    simpan([...list.map((name, i) => ({ id: start + i, name })), ...guests]);
    setNames("");
    setNotice(`${list.length} tamu ditambahkan. Tautannya siap dikirim.`);
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

  function editGuest(id: number) {
    const guest = guests.find((g) => g.id === id);
    if (!guest) return;
    const baru = window.prompt("Ubah nama tamu:", guest.name);
    if (baru === null) return;
    const namaBaru = baru.trim();
    if (!namaBaru || namaBaru === guest.name) return;
    simpan(guests.map((g) => (g.id === id ? { ...g, name: namaBaru } : g)));
    setNotice(`Nama diubah menjadi "${namaBaru}".`);
  }

  function hapusSatu(id: number) {
    if (!window.confirm("Hapus tamu ini?")) return;
    simpan(guests.filter((g) => g.id !== id));
    setNotice("Tamu dihapus.");
  }

  function hapusMassal() {
    if (selected.length === 0) return;
    if (!window.confirm(`Hapus ${selected.length} tamu terpilih?`)) return;
    const jumlah = selected.length;
    simpan(guests.filter((g) => !selected.includes(g.id)));
    setSelected([]);
    setNotice(`${jumlah} tamu dihapus.`);
  }

  function mulaiWAMassal() {
    if (selected.length === 0) return;
    const list = guests.filter((g) => selected.includes(g.id)).map((g) => g.name);
    setWaQueue(list);
    wa(list[0]);
    setNotice(`Membuka 1 dari ${list.length}. Klik "Lanjut Kirim" untuk berikutnya.`);
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
    setNotice(`Membuka berikutnya. Sisa ${sisa.length}. Klik "Lanjut Kirim" lagi.`);
  }

  function batalkanAntrian() {
    setWaQueue([]);
    setNotice("Antrian WhatsApp dibatalkan.");
  }

  return (
    <Shell>
      {!terbuka ? (
        <form onSubmit={masuk}>
          <h1 className="font-serif text-3xl text-[#f7f3ea]">Masuk panel</h1>
          <p className="mt-2 text-sm text-[#d7e6de]">
            Halaman ini hanya untuk pengelola. Tamu tidak bisa melihat daftar nama tanpa kata sandi.
          </p>
          <input
            type="password"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setSalah(false);
            }}
            required
            placeholder="Kata sandi"
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
                  ? "Daftar tamu tersimpan di HP ini. Tautan yang dikirim tetap bisa dibuka tamu di situs."
                  : server === "hidup"
                    ? "Panel tersambung. Daftar tamu tetap disimpan di HP ini supaya cepat dibagikan."
                    : "Daftar tamu siap dipakai. Tidak perlu menunggu."}
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
          <div className="mt-5 grid grid-cols-3 gap-2">
            {(
              [
                ["tamu", "Tamu"],
                ["isi", "Isi"],
                ["ucapan", "Ucapan"],
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
                Antrian WhatsApp: <strong>{waQueue.length}</strong> tersisa
              </p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={lanjutKirimWA} className="min-h-10 flex-1 rounded-full bg-[#0e6b4f] text-xs text-[#f7f3ea]">
                  Lanjut Kirim
                </button>
                <button type="button" onClick={batalkanAntrian} className="min-h-10 rounded-full border border-[#d4af37]/40 px-4 text-xs text-[#d7e6de]">
                  Batal
                </button>
              </div>
            </div>
          )}
          {tab === "tamu" && (
            <form onSubmit={tambahTamu} className="mt-6">
              <label className="text-sm text-[#d7e6de]">Satu nama per baris. Bisa tempel banyak sekaligus.</label>
              <textarea
                value={names}
                onChange={(e) => setNames(e.target.value)}
                rows={5}
                placeholder={"Pak Jumaedy, S.Kom\nKeluarga Besar"}
                className="mt-2 w-full rounded-2xl border border-[#d4af37]/40 bg-[#05281e] px-4 py-3 text-sm text-[#f7f3ea] outline-none"
              />
              <button className="mt-3 min-h-11 w-full rounded-full bg-linear-to-r from-[#f3e6c0] to-[#d4af37] font-serif text-xs tracking-[0.2em] text-[#05281e] uppercase">
                Tambah tamu
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
                      <button type="button" onClick={mulaiWAMassal} className="min-h-9 rounded-full bg-[#0e6b4f] px-4 text-xs text-[#f7f3ea]">
                        WA Massal ({selected.length})
                      </button>
                      <button type="button" onClick={hapusMassal} className="min-h-9 rounded-full border border-red-400/60 px-4 text-xs text-red-300">
                        Hapus Massal
                      </button>
                    </div>
                  )}
                </div>
              )}
              <ul className="mt-4 space-y-3">
                {guests.length === 0 && <li className="text-sm text-[#d7e6de]">Belum ada tamu. Tambahkan nama di atas.</li>}
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
                      <button type="button" onClick={() => editGuest(guest.id)} className="min-h-10 rounded-full border border-[#d4af37]/50 px-3 text-xs text-[#f3e6c0]">
                        Edit
                      </button>
                      <button type="button" onClick={() => void salin(guest.name)} className="min-h-10 flex-1 rounded-full border border-[#d4af37]/50 text-xs text-[#f3e6c0]">
                        Salin
                      </button>
                      <button type="button" onClick={() => wa(guest.name)} className="min-h-10 flex-1 rounded-full bg-[#0e6b4f] text-xs text-[#f7f3ea]">
                        WhatsApp
                      </button>
                      <button type="button" onClick={() => hapusSatu(guest.id)} className="min-h-10 rounded-full px-3 text-xs text-[#d7e6de]">
                        Hapus
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </form>
          )}
          {tab === "isi" && (
            <div className="mt-6 space-y-2 text-sm text-[#d7e6de]">
              <p>
                {settings.groom} & {settings.bride}
              </p>
              <p>{settings.dateLabel}</p>
              <p>{settings.resepsiVenue}</p>
              {server !== "hidup" && (
                <p className="pt-2 text-[#f3e6c0]">
                  Mengubah isi undangan untuk semua pengunjung belum bisa di situs Vercel ini, karena databasenya belum terhubung. Membagikan tautan tamu tetap bisa.
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
                {wishes.length === 0 && !wishNote && <li className="text-sm text-[#d7e6de]">Belum ada ucapan dari tamu.</li>}
                {wishes.map((wish) => (
                  <li key={wish.id} className="rounded-2xl border border-[#d4af37]/25 bg-[#05281e] p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-serif text-[#f7f3ea]">{wish.name}</p>
                      <span className="text-[10px] tracking-wide text-[#d4af37] uppercase">{wish.attend}</span>
                    </div>
                    <p className="mt-1 text-sm text-[#d7e6de]">{wish.message}</p>
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
