import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { getSettings, listWishes, pinStatus } from "@/lib/undangan.functions";
import { WEDDING, type Wish } from "@/lib/wedding";
import type { InvitationSettings } from "@/lib/undangan.functions";

export const Route = createFileRoute("/kelola")({
  component: Kelola,
});

const GUEST_KEY = "undangan-tamu-lokal";
const SANDI = "safarmoramo";
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
  const [wishes, setWishes] = useState<Wish[]>([]);

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
        setWishes(nextWishes);
      })
      .catch(() => {
        window.clearTimeout(timer);
        setServer("mati");
      });
    return () => window.clearTimeout(timer);
  }, []);

  function masuk(e: FormEvent) {
    e.preventDefault();
    if (draft.trim() !== SANDI) {
      setSalah(true);
      return;
    }
    sessionStorage.setItem(PINTU_KEY, "1");
    setTerbuka(true);
    setSalah(false);
  }

  function simpan(next: Guest[]) {
    setGuests(next);
    localStorage.setItem(GUEST_KEY, JSON.stringify(next));
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
    return `${window.location.origin}/?to=${encodeURIComponent(name)}`;
  }

  async function salin(name: string) {
    await navigator.clipboard.writeText(tautan(name));
    setNotice(`Tautan ${name} disalin.`);
  }

  function wa(name: string) {
    const text = `Kepada Yth. ${name}\n\nAssalamu'alaikum warahmatullahi wabarakatuh.\nTurut mengundang Bapak/Ibu/Saudara/i pada pernikahan kami.\n\n${tautan(name)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
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
          <h1 className="font-serif text-3xl text-[#f7f3ea]">Kelola undangan</h1>
          <p className="mt-2 text-sm text-[#d7e6de]">
            {server === "mati"
              ? "Daftar tamu tersimpan di HP ini. Tautan yang dikirim tetap bisa dibuka tamu di situs."
              : server === "hidup"
                ? "Panel tersambung. Daftar tamu tetap disimpan di HP ini supaya cepat dibagikan."
                : "Daftar tamu siap dipakai. Tidak perlu menunggu."}
          </p>
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
              <ul className="mt-6 space-y-3">
                {guests.length === 0 && (
                  <li className="text-sm text-[#d7e6de]">Belum ada tamu. Tambahkan nama di atas.</li>
                )}
                {guests.map((guest) => (
                  <li key={guest.id} className="rounded-2xl border border-[#d4af37]/25 bg-[#05281e] p-4">
                    <p className="font-serif text-lg text-[#f7f3ea]">{guest.name}</p>
                    <p className="mt-1 truncate text-xs text-[#d7e6de]">{tautan(guest.name)}</p>
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={() => void salin(guest.name)} className="min-h-10 flex-1 rounded-full border border-[#d4af37]/50 text-xs text-[#f3e6c0]">
                        Salin
                      </button>
                      <button type="button" onClick={() => wa(guest.name)} className="min-h-10 flex-1 rounded-full bg-[#0e6b4f] text-xs text-[#f7f3ea]">
                        WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={() => simpan(guests.filter((item) => item.id !== guest.id))}
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
            <ul className="mt-6 space-y-3">
              {server !== "hidup" && (
                <li className="text-sm text-[#d7e6de]">Ucapan tamu di situs Vercel ini masih tersimpan di HP masing-masing, belum di satu daftar bersama.</li>
              )}
              {wishes.map((wish) => (
                <li key={wish.id} className="rounded-2xl border border-[#d4af37]/25 bg-[#05281e] p-4">
                  <p className="font-serif text-[#f7f3ea]">{wish.name}</p>
                  <p className="mt-1 text-sm text-[#d7e6de]">{wish.message}</p>
                </li>
              ))}
            </ul>
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