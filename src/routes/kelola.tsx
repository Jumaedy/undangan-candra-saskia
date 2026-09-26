import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  addGuests,
  deleteGuest,
  deleteWish,
  getSettings,
  listGuests,
  listWishes,
  pinStatus,
  saveSettings,
  setupPin,
  unlock,
  type InvitationSettings,
} from "@/lib/undangan.functions";
import type { Wish } from "@/lib/wedding";

export const Route = createFileRoute("/kelola")({
  component: Kelola,
});

const PIN_KEY = "undangan-pin";

function Kelola() {
  const [ready, setReady] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"isi" | "tamu" | "ucapan">("tamu");
  const [settings, setSettings] = useState<InvitationSettings | null>(null);
  const [guests, setGuests] = useState<{ id: number; name: string }[]>([]);
  const [names, setNames] = useState("");
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const saved = sessionStorage.getItem(PIN_KEY) ?? "";
    pinStatus()
      .then(async (status) => {
        setReady(status.ready);
        if (saved && status.ready) {
          const check = await unlock({ data: { pin: saved } });
          if (check.ok) setPin(saved);
        }
      })
      .catch(() => setError("Panel belum bisa tersambung. Muat ulang halaman."));
  }, []);

  useEffect(() => {
    if (!pin) return;
    void refresh(pin);
  }, [pin]);

  async function refresh(current: string) {
    const [nextSettings, nextGuests, nextWishes] = await Promise.all([
      getSettings(),
      listGuests({ data: { pin: current } }),
      listWishes(),
    ]);
    setSettings(nextSettings);
    if (nextGuests.ok) setGuests(nextGuests.guests);
    setWishes(nextWishes);
  }

  async function buatSandi(e: FormEvent) {
    e.preventDefault();
    setError("");
    const result = await setupPin({ data: { pin: draft } });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    sessionStorage.setItem(PIN_KEY, draft);
    setPin(draft);
    setReady(true);
  }

  async function masuk(e: FormEvent) {
    e.preventDefault();
    setError("");
    const result = await unlock({ data: { pin: draft } });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    sessionStorage.setItem(PIN_KEY, draft);
    setPin(draft);
  }

  async function simpanIsi(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setNotice("");
    const result = await saveSettings({ data: { pin, settings } });
    setNotice(result.ok ? "Isi undangan tersimpan." : result.error);
  }

  async function tambahTamu(e: FormEvent) {
    e.preventDefault();
    const list = names
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (list.length === 0) return;
    const result = await addGuests({ data: { pin, names: list } });
    if (!result.ok) {
      setNotice(result.error);
      return;
    }
    setNames("");
    setNotice(`${list.length} tamu ditambahkan.`);
    await refresh(pin);
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

  if (ready === null) {
    return <Shell>Memuat panel…</Shell>;
  }

  if (!pin) {
    return (
      <Shell>
        <h1 className="font-serif text-3xl text-[#f7f3ea]">{ready ? "Masuk panel" : "Buat kata sandi"}</h1>
        <p className="mt-2 text-sm text-[#d7e6de]">
          {ready
            ? "Kata sandi ini hanya untuk Anda, supaya orang lain tidak bisa mengubah undangan."
            : "Ini hanya sekali. Simpan kata sandinya. Minimal 4 huruf."}
        </p>
        <form onSubmit={ready ? masuk : buatSandi} className="mt-6 space-y-3">
          <input
            type="password"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            minLength={4}
            required
            placeholder="Kata sandi"
            className="min-h-11 w-full rounded-2xl border border-[#d4af37]/40 bg-[#05281e] px-4 text-sm text-[#f7f3ea] outline-none"
          />
          {error && <p className="text-sm text-[#f3e6c0]">{error}</p>}
          <button className="min-h-11 w-full rounded-full bg-linear-to-r from-[#f3e6c0] to-[#d4af37] font-serif text-xs tracking-[0.2em] text-[#05281e] uppercase">
            {ready ? "Masuk" : "Simpan kata sandi"}
          </button>
        </form>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-serif text-3xl text-[#f7f3ea]">Kelola undangan</h1>
        <button
          type="button"
          className="text-xs text-[#d4af37] underline"
          onClick={() => {
            sessionStorage.removeItem(PIN_KEY);
            setPin("");
          }}
        >
          Keluar
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
                    onClick={() => {
                      void deleteGuest({ data: { pin, id: guest.id } }).then(() => refresh(pin));
                    }}
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

      {tab === "isi" && settings && (
        <form onSubmit={simpanIsi} className="mt-6 space-y-3">
          <Field label="Mempelai pria" value={settings.groom} onChange={(groom) => setSettings({ ...settings, groom, groomFull: groom })} />
          <Field label="Mempelai wanita" value={settings.bride} onChange={(bride) => setSettings({ ...settings, bride, brideFull: bride })} />
          <Field label="Tanggal" value={settings.dateLabel} onChange={(dateLabel) => setSettings({ ...settings, dateLabel })} />
          <Field label="Waktu akad" value={settings.akadTime} onChange={(akadTime) => setSettings({ ...settings, akadTime })} />
          <Field label="Waktu resepsi" value={settings.resepsiTime} onChange={(resepsiTime) => setSettings({ ...settings, resepsiTime })} />
          <Field label="Hitung mundur resepsi" value={settings.resepsiIso} onChange={(resepsiIso) => setSettings({ ...settings, resepsiIso })} />
          <Field label="Tempat resepsi" value={settings.resepsiVenue} onChange={(resepsiVenue) => setSettings({ ...settings, resepsiVenue })} />
          <Field label="Link Google Maps" value={settings.resepsiMaps} onChange={(resepsiMaps) => setSettings({ ...settings, resepsiMaps })} />
          <Field label="Orang tua pria" value={settings.groomParents} onChange={(groomParents) => setSettings({ ...settings, groomParents })} />
          <Field label="Orang tua wanita" value={settings.brideParents} onChange={(brideParents) => setSettings({ ...settings, brideParents })} />
          <Field label="Instagram" value={settings.igGroom} onChange={(ig) => setSettings({ ...settings, igGroom: ig, igBride: ig })} />
          <button className="min-h-11 w-full rounded-full bg-linear-to-r from-[#f3e6c0] to-[#d4af37] font-serif text-xs tracking-[0.2em] text-[#05281e] uppercase">
            Simpan isi
          </button>
        </form>
      )}

      {tab === "ucapan" && (
        <ul className="mt-6 space-y-3">
          {wishes.length === 0 && <li className="text-sm text-[#d7e6de]">Belum ada ucapan.</li>}
          {wishes.map((wish) => (
            <li key={wish.id} className="rounded-2xl border border-[#d4af37]/25 bg-[#05281e] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-serif text-[#f7f3ea]">{wish.name}</p>
                <span className="text-[10px] tracking-wide text-[#d4af37] uppercase">{wish.attend}</span>
              </div>
              <p className="mt-1 text-sm text-[#d7e6de]">{wish.message}</p>
              <button
                type="button"
                className="mt-2 text-xs text-[#f3e6c0] underline"
                onClick={() => {
                  void deleteWish({ data: { pin, id: wish.id } }).then(() => refresh(pin));
                }}
              >
                Hapus
              </button>
            </li>
          ))}
        </ul>
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

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm text-[#d7e6de]">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 min-h-11 w-full rounded-2xl border border-[#d4af37]/40 bg-[#05281e] px-4 text-sm text-[#f7f3ea] outline-none"
      />
    </label>
  );
}
