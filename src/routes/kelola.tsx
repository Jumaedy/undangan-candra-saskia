import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
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
  updateGuest,
  updateWish,
  type InvitationSettings,
} from "@/lib/undangan.functions";
import { WEDDING, type Wish } from "@/lib/wedding";

export const Route = createFileRoute("/kelola")({
  component: Kelola,
});

const PIN_KEY = "undangan-admin-pin";
const PINTU_KEY = "undangan-pintu";

type Guest = { id: number; name: string };

function Kelola() {
  const [terbuka, setTerbuka] = useState(false);
  const [draft, setDraft] = useState("");
  const [pin, setPin] = useState("");
  const [salah, setSalah] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [needSetup, setNeedSetup] = useState(false);
  const [tab, setTab] = useState<"tamu" | "isi" | "ucapan" | "laporan">("tamu");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [guests, setGuests] = useState<Guest[]>([]);
  const [names, setNames] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [waQueue, setWaQueue] = useState<string[]>([]);

  const [settings, setSettings] = useState<InvitationSettings>(WEDDING);
  const [settingsDraft, setSettingsDraft] = useState<InvitationSettings>(WEDDING);

  const [wishes, setWishes] = useState<Wish[]>([]);
  const [wishNote, setWishNote] = useState("");

  const refreshGuests = useCallback(
    async (currentPin: string) => {
      const res = await listGuests({ data: { pin: currentPin } });
      if (res.ok) setGuests(res.guests);
      else throw new Error(res.error);
    },
    [],
  );

  const refreshWishes = useCallback(async () => {
    setWishNote("");
    try {
      const rows = await listWishes();
      setWishes(rows);
    } catch {
      setWishNote("Daftar ucapan belum terbaca. Tekan Muat ulang.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await pinStatus();
        if (cancelled) return;
        if (!status.ready) {
          setNeedSetup(true);
          setLoading(false);
          return;
        }
        const saved = sessionStorage.getItem(PIN_KEY);
        if (saved) {
          const res = await unlock({ data: { pin: saved } });
          if (cancelled) return;
          if (res.ok) {
            setPin(saved);
            setTerbuka(true);
            sessionStorage.setItem(PINTU_KEY, "1");
            const s = await getSettings().catch(() => WEDDING);
            if (!cancelled) {
              setSettings(s);
              setSettingsDraft(s);
            }
            await refreshGuests(saved);
            await refreshWishes();
          } else {
            sessionStorage.removeItem(PIN_KEY);
            sessionStorage.removeItem(PINTU_KEY);
          }
        }
      } catch {
        /* offline / no db yet — still show login */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshGuests, refreshWishes]);

  useEffect(() => {
    if (!terbuka || tab !== "ucapan") return;
    void refreshWishes();
  }, [terbuka, tab, refreshWishes]);

  async function masuk(e: FormEvent) {
    e.preventDefault();
    setSalah(false);
    setErrorMsg("");
    setBusy(true);
    const value = draft.trim();
    try {
      if (needSetup) {
        const res = await setupPin({ data: { pin: value } });
        if (!res.ok) {
          setErrorMsg(res.error);
          setSalah(true);
          return;
        }
        setNeedSetup(false);
      } else {
        const res = await unlock({ data: { pin: value } });
        if (!res.ok) {
          setErrorMsg(res.error);
          setSalah(true);
          return;
        }
      }
      sessionStorage.setItem(PIN_KEY, value);
      sessionStorage.setItem(PINTU_KEY, "1");
      setPin(value);
      setTerbuka(true);
      setDraft("");
      const s = await getSettings().catch(() => WEDDING);
      setSettings(s);
      setSettingsDraft(s);
      await refreshGuests(value);
      await refreshWishes();
    } catch {
      setErrorMsg("Tidak bisa terhubung ke server. Pastikan DATABASE_URL terpasang di Vercel.");
      setSalah(true);
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    sessionStorage.removeItem(PIN_KEY);
    sessionStorage.removeItem(PINTU_KEY);
    setTerbuka(false);
    setPin("");
    setSelected([]);
    setWaQueue([]);
    setNotice("");
    setGuests([]);
  }

  function tautan(name: string) {
    if (typeof window === "undefined") return `/?to=${encodeURIComponent(`${name}~k`)}`;
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
      `${settings.groom} & ${settings.bride}`,
      settings.dateLabel,
      `Akad ${settings.akadTime}`,
      `Resepsi ${settings.resepsiTime}`,
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

  async function tambahTamu(e: FormEvent) {
    e.preventDefault();
    const list = names
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (list.length === 0 || !pin) return;
    setBusy(true);
    try {
      const res = await addGuests({ data: { pin, names: list } });
      if (!res.ok) {
        setNotice(res.error);
        return;
      }
      setNames("");
      await refreshGuests(pin);
      setNotice(`${list.length} tamu ditambahkan. Tautannya siap dikirim.`);
    } catch {
      setNotice("Gagal menambah tamu. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  function toggleSelect(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleSelectAll() {
    if (selected.length === guests.length) setSelected([]);
    else setSelected(guests.map((g) => g.id));
  }

  async function editGuest(id: number) {
    const guest = guests.find((g) => g.id === id);
    if (!guest || !pin) return;
    const baru = window.prompt("Ubah nama tamu:", guest.name);
    if (baru === null) return;
    const namaBaru = baru.trim();
    if (!namaBaru || namaBaru === guest.name) return;
    setBusy(true);
    try {
      const res = await updateGuest({ data: { pin, id, name: namaBaru } });
      if (!res.ok) {
        setNotice(res.error);
        return;
      }
      await refreshGuests(pin);
      setNotice(`Nama diubah menjadi "${namaBaru}".`);
    } catch {
      setNotice("Gagal mengubah nama.");
    } finally {
      setBusy(false);
    }
  }

  async function hapusSatu(id: number) {
    if (!pin || !window.confirm("Hapus tamu ini?")) return;
    setBusy(true);
    try {
      const res = await deleteGuest({ data: { pin, id } });
      if (!res.ok) {
        setNotice(res.error);
        return;
      }
      setSelected((prev) => prev.filter((x) => x !== id));
      await refreshGuests(pin);
      setNotice("Tamu dihapus.");
    } catch {
      setNotice("Gagal menghapus tamu.");
    } finally {
      setBusy(false);
    }
  }

  async function hapusMassal() {
    if (selected.length === 0 || !pin) return;
    if (!window.confirm(`Hapus ${selected.length} tamu terpilih?`)) return;
    setBusy(true);
    const jumlah = selected.length;
    try {
      for (const id of selected) {
        await deleteGuest({ data: { pin, id } });
      }
      setSelected([]);
      await refreshGuests(pin);
      setNotice(`${jumlah} tamu dihapus.`);
    } catch {
      setNotice("Sebagian tamu gagal dihapus.");
      await refreshGuests(pin);
    } finally {
      setBusy(false);
    }
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

  async function simpanIsi(e: FormEvent) {
    e.preventDefault();
    if (!pin) return;
    setBusy(true);
    try {
      const {
        groom,
        bride,
        groomFull,
        brideFull,
        dateLabel,
        resepsiIso,
        akadTime,
        resepsiTime,
        akadVenue,
        resepsiVenue,
        akadMaps,
        resepsiMaps,
        groomParents,
        brideParents,
        igGroom,
        igBride,
        credit,
        arabic,
        meaning,
        ref,
      } = settingsDraft;
      const res = await saveSettings({
        data: {
          pin,
          settings: {
            groom,
            bride,
            groomFull,
            brideFull,
            dateLabel,
            resepsiIso,
            akadTime,
            resepsiTime,
            akadVenue,
            resepsiVenue,
            akadMaps,
            resepsiMaps,
            groomParents,
            brideParents,
            igGroom,
            igBride,
            credit,
            arabic,
            meaning,
            ref,
          },
        },
      });
      if (!res.ok) {
        setNotice(res.error);
        return;
      }
      setSettings(settingsDraft);
      setNotice("Isi undangan disimpan. Perubahan langsung terlihat oleh tamu.");
    } catch {
      setNotice("Gagal menyimpan. Pastikan database terhubung.");
    } finally {
      setBusy(false);
    }
  }

  async function ubahUcapan(wish: Wish) {
    if (!pin) return;
    const baru = window.prompt("Ubah ucapan:", wish.message);
    if (baru === null) return;
    const message = baru.trim();
    if (!message || message === wish.message) return;
    setBusy(true);
    try {
      const res = await updateWish({
        data: { pin, id: wish.id, name: wish.name, message, attend: wish.attend },
      });
      if (!res.ok) {
        setNotice(res.error);
        return;
      }
      setWishes((prev) => prev.map((item) => (item.id === wish.id ? { ...item, message } : item)));
      setNotice("Ucapan diubah.");
    } catch {
      setNotice("Ucapan belum berubah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function hapusUcapan(wish: Wish) {
    if (!pin || !window.confirm(`Hapus ucapan ${wish.name}?`)) return;
    setBusy(true);
    try {
      const res = await deleteWish({ data: { pin, id: wish.id } });
      if (!res.ok) {
        setNotice(res.error);
        return;
      }
      setWishes((prev) => prev.filter((item) => item.id !== wish.id));
      setNotice("Ucapan dihapus.");
    } catch {
      setNotice("Ucapan belum terhapus. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  const hadir = wishes.filter((w) => w.attend === "Hadir").length;
  const tidakHadir = wishes.filter((w) => w.attend === "Tidak Hadir").length;

  if (loading) {
    return (
      <Shell>
        <p className="text-sm text-[#d7e6de]">Memuat panel admin…</p>
      </Shell>
    );
  }

  return (
    <Shell>
      {!terbuka ? (
        <form onSubmit={masuk}>
          <h1 className="font-serif text-3xl text-[#f7f3ea]">
            {needSetup ? "Buat kata sandi admin" : "Masuk panel admin"}
          </h1>
          <p className="mt-2 text-sm text-[#d7e6de]">
            {needSetup
              ? "Pertama kali: buat PIN (minimal 4 karakter). Hanya admin yang bisa masuk ke sini. Tamu tidak perlu login."
              : "Halaman ini hanya untuk pengelola. Tamu tidak bisa melihat daftar nama tanpa kata sandi."}
          </p>
          <input
            type="password"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setSalah(false);
              setErrorMsg("");
            }}
            required
            minLength={needSetup ? 4 : 1}
            placeholder={needSetup ? "Buat PIN baru" : "Kata sandi"}
            className="mt-6 min-h-11 w-full rounded-2xl border border-[#d4af37]/40 bg-[#05281e] px-4 text-sm text-[#f7f3ea] outline-none"
          />
          {salah && (
            <p className="mt-3 text-sm text-[#f3e6c0]">{errorMsg || "Kata sandi salah."}</p>
          )}
          <button
            disabled={busy}
            className="mt-4 min-h-11 w-full rounded-full bg-linear-to-r from-[#f3e6c0] to-[#d4af37] font-serif text-xs tracking-[0.2em] text-[#05281e] uppercase disabled:opacity-60"
          >
            {busy ? "Memproses…" : needSetup ? "Simpan PIN" : "Masuk"}
          </button>
        </form>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-serif text-3xl text-[#f7f3ea]">Kelola undangan</h1>
              <p className="mt-2 text-sm text-[#d7e6de]">
                Data tamu, ucapan, dan isi undangan tersimpan di server. Hanya admin yang bisa mengubah.
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
                ["isi", "Isi"],
                ["ucapan", "Ucapan"],
                ["laporan", "Laporan"],
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
            <form onSubmit={tambahTamu} className="mt-6">
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

          {tab === "isi" && (
            <form onSubmit={simpanIsi} className="mt-6 space-y-3 text-sm">
              {(
                [
                  ["groom", "Nama panggilan mempelai pria"],
                  ["bride", "Nama panggilan mempelai wanita"],
                  ["groomFull", "Nama lengkap pria"],
                  ["brideFull", "Nama lengkap wanita"],
                  ["dateLabel", "Tanggal (label)"],
                  ["resepsiIso", "ISO resepsi (untuk countdown)"],
                  ["akadTime", "Waktu akad"],
                  ["resepsiTime", "Waktu resepsi"],
                  ["akadVenue", "Tempat akad"],
                  ["resepsiVenue", "Tempat resepsi"],
                  ["akadMaps", "Link maps akad"],
                  ["resepsiMaps", "Link maps resepsi"],
                  ["groomParents", "Orang tua pria"],
                  ["brideParents", "Orang tua wanita"],
                  ["igGroom", "IG pria"],
                  ["igBride", "IG wanita"],
                  ["credit", "Kredit / pembuat"],
                  ["ref", "Referensi ayat"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block">
                  <span className="text-[#d7e6de]">{label}</span>
                  <input
                    value={settingsDraft[key]}
                    onChange={(e) => setSettingsDraft((s) => ({ ...s, [key]: e.target.value }))}
                    className="mt-1 min-h-10 w-full rounded-xl border border-[#d4af37]/40 bg-[#05281e] px-3 text-[#f7f3ea] outline-none"
                  />
                </label>
              ))}
              <label className="block">
                <span className="text-[#d7e6de]">Ayat (Arab)</span>
                <textarea
                  value={settingsDraft.arabic}
                  onChange={(e) => setSettingsDraft((s) => ({ ...s, arabic: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-[#d4af37]/40 bg-[#05281e] px-3 py-2 text-[#f7f3ea] outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[#d7e6de]">Arti ayat</span>
                <textarea
                  value={settingsDraft.meaning}
                  onChange={(e) => setSettingsDraft((s) => ({ ...s, meaning: e.target.value }))}
                  rows={4}
                  className="mt-1 w-full rounded-xl border border-[#d4af37]/40 bg-[#05281e] px-3 py-2 text-[#f7f3ea] outline-none"
                />
              </label>
              <button
                disabled={busy}
                className="min-h-11 w-full rounded-full bg-linear-to-r from-[#f3e6c0] to-[#d4af37] font-serif text-xs tracking-[0.2em] text-[#05281e] uppercase disabled:opacity-60"
              >
                Simpan isi undangan
              </button>
            </form>
          )}

          {tab === "ucapan" && (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => void refreshWishes()}
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

          {tab === "laporan" && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-[#d4af37]/25 bg-[#05281e] p-4">
                  <p className="text-xs tracking-wide text-[#d7e6de] uppercase">Total tamu</p>
                  <p className="mt-1 font-serif text-3xl text-[#f7f3ea]">{guests.length}</p>
                </div>
                <div className="rounded-2xl border border-[#d4af37]/25 bg-[#05281e] p-4">
                  <p className="text-xs tracking-wide text-[#d7e6de] uppercase">Total ucapan</p>
                  <p className="mt-1 font-serif text-3xl text-[#f7f3ea]">{wishes.length}</p>
                </div>
                <div className="rounded-2xl border border-[#d4af37]/25 bg-[#05281e] p-4">
                  <p className="text-xs tracking-wide text-[#d7e6de] uppercase">Konfirmasi hadir</p>
                  <p className="mt-1 font-serif text-3xl text-[#f7f3ea]">{hadir}</p>
                </div>
                <div className="rounded-2xl border border-[#d4af37]/25 bg-[#05281e] p-4">
                  <p className="text-xs tracking-wide text-[#d7e6de] uppercase">Tidak hadir</p>
                  <p className="mt-1 font-serif text-3xl text-[#f7f3ea]">{tidakHadir}</p>
                </div>
              </div>
              <p className="text-sm text-[#d7e6de]">
                Laporan dihitung dari data server. Muat ulang tab Ucapan jika angka belum update.
              </p>
              <button
                type="button"
                onClick={() => {
                  void refreshGuests(pin);
                  void refreshWishes();
                  setNotice("Laporan diperbarui.");
                }}
                className="min-h-10 rounded-full border border-[#d4af37]/50 px-4 text-xs text-[#f3e6c0]"
              >
                Segarkan laporan
              </button>
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
