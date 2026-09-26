import { useEffect, useRef, useState } from "react";
import AOS from "aos";
import { WEDDING, loadWishes, saveWishes, type Wish } from "@/lib/wedding";
import { cn } from "@/lib/utils";

function useCountdown(iso: string) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const target = new Date(iso).getTime();
  const diff = now === null ? 0 : Math.max(0, target - now);
  const s = Math.floor(diff / 1000);
  return {
    hari: Math.floor(s / 86400),
    jam: Math.floor((s % 86400) / 3600),
    menit: Math.floor((s % 3600) / 60),
    detik: s % 60,
  };
}

type ThemeId = "emerald" | "ivory";

function ThemeSwitch({
  theme,
  onChange,
}: {
  theme: ThemeId;
  onChange: (theme: ThemeId) => void;
}) {
  return (
    <div
      className="inline-flex rounded-full border border-gold/50 bg-black/30 p-1 backdrop-blur-sm"
      role="group"
      aria-label="Pilih tema"
    >
      {(
        [
          ["emerald", "Emerald"],
          ["ivory", "Krem"],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          type="button"
          aria-pressed={theme === id}
          onClick={() => onChange(id)}
          className={cn(
            "min-h-9 rounded-full px-3 text-[10px] tracking-[0.16em] uppercase",
            theme === id ? "bg-gold text-sage-dark" : "text-[#f7f3ea]",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function LeafDivider() {
  return (
    <div className="my-6 flex items-center justify-center gap-3 text-gold" aria-hidden>
      <span className="h-px w-12 bg-gold/50" />
      <i className="fa-solid fa-leaf text-sm" />
      <span className="h-px w-12 bg-gold/50" />
    </div>
  );
}

const MOTIFS = [
  { kind: "leaf", top: "6%", left: "4%", size: 22, delay: "0s", dur: "8s", p: 0.06, shift: 0.015, rot: -18 },
  { kind: "leaf", top: "18%", left: "88%", size: 16, delay: "1.2s", dur: "11s", p: 0.12, shift: -0.02, rot: 24 },
  { kind: "leaf", top: "34%", left: "7%", size: 14, delay: "0.4s", dur: "9s", p: 0.09, shift: 0.03, rot: -8 },
  { kind: "butterfly", top: "12%", left: "78%", size: 28, delay: "0.6s", dur: "10s", p: 0.16, shift: -0.04, rot: 8 },
  { kind: "leaf", top: "48%", left: "92%", size: 20, delay: "2s", dur: "12s", p: 0.07, shift: 0.01, rot: 16 },
  { kind: "butterfly", top: "58%", left: "6%", size: 24, delay: "1.5s", dur: "13s", p: 0.18, shift: 0.025, rot: -6 },
  { kind: "leaf", top: "72%", left: "84%", size: 15, delay: "0.8s", dur: "9.5s", p: 0.1, shift: -0.018, rot: 30 },
  { kind: "leaf", top: "84%", left: "8%", size: 18, delay: "2.4s", dur: "11s", p: 0.05, shift: 0.02, rot: -24 },
  { kind: "butterfly", top: "90%", left: "70%", size: 22, delay: "0.2s", dur: "14s", p: 0.14, shift: -0.03, rot: 12 },
] as const;

function Butterfly({ size }: { size: number }) {
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 64 46" fill="none" aria-hidden>
      <g className="wing">
        <path d="M32 24C24 6 6 4 4 18c-2 12 12 18 28 8z" fill="#d4af37" fillOpacity="0.9" />
        <path d="M32 24C40 6 58 4 60 18c2 12-12 18-28 8z" fill="#f3e6c0" fillOpacity="0.85" />
      </g>
      <path d="M32 10v28" stroke="#05281e" strokeWidth="1.4" />
    </svg>
  );
}

function Garden() {
  return (
    <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden" aria-hidden>
      <div
        className="glow-orb motif-shift absolute top-[8%] -left-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.35),transparent_68%)] blur-md"
        style={{ ["--p" as string]: 0.04, ["--shift" as string]: 0.01 }}
      />
      <div
        className="glow-orb motif-shift absolute top-[46%] -right-20 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(46,180,120,0.28),transparent_70%)] blur-md"
        style={{ ["--p" as string]: 0.08, ["--shift" as string]: -0.012, animationDelay: "1.5s" }}
      />
      {MOTIFS.map((m, i) => (
        <div
          key={i}
          className="motif-shift absolute"
          style={{
            top: m.top,
            left: m.left,
            ["--p" as string]: m.p,
            ["--shift" as string]: m.shift,
          }}
        >
          <div
            className="motif-float text-gold drop-shadow-[0_6px_10px_rgba(0,0,0,0.25)]"
            style={{
              ["--delay" as string]: m.delay,
              ["--dur" as string]: m.dur,
              ["--rot" as string]: `${m.rot}deg`,
            }}
          >
            {m.kind === "leaf" ? (
              <i className="fa-solid fa-leaf" style={{ fontSize: m.size }} />
            ) : (
              <Butterfly size={m.size} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Invitation({ guest }: { guest: string }) {
  const [opened, setOpened] = useState(false);
  const [coverGone, setCoverGone] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [theme, setTheme] = useState<ThemeId>("emerald");
  const audioRef = useRef<HTMLAudioElement>(null);
  const count = useCountdown(WEDDING.iso);

  const [wishes, setWishes] = useState<Wish[]>([]);
  const [name, setName] = useState("");
  const [attend, setAttend] = useState<"Hadir" | "Tidak Hadir">("Hadir");
  const [message, setMessage] = useState("");

  useEffect(() => {
    document.body.style.overflow = opened ? "" : "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [opened]);

  useEffect(() => {
    const saved = localStorage.getItem("undangan-tema");
    if (saved === "ivory" || saved === "emerald") setTheme(saved);
  }, []);

  useEffect(() => {
    AOS.init({ once: true, duration: 850, easing: "ease-out-cubic", offset: 40 });
  }, []);

  useEffect(() => {
    if (!opened) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        document.documentElement.style.setProperty("--scroll", String(window.scrollY));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [opened]);

  function pilihTema(next: ThemeId) {
    setTheme(next);
    localStorage.setItem("undangan-tema", next);
  }

  function bukaUndangan() {
    setOpened(true);
    const audio = audioRef.current;
    if (audio) {
      audio.volume = 0.85;
      void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
    window.setTimeout(() => setCoverGone(true), 900);
  }

  function toggleMusic() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused || audio.ended) {
      if (audio.ended) audio.currentTime = 0;
      void audio.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  function kirimUcapan(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;
    const next: Wish[] = [
      {
        id: crypto.randomUUID(),
        name: name.trim(),
        attend,
        message: message.trim(),
        at: Date.now(),
      },
      ...wishes,
    ];
    setWishes(next);
    saveWishes(next);
    setName("");
    setMessage("");
    setAttend("Hadir");
  }

  const gallery = [
    "/images/hero.jpg",
    "/images/gallery/g1.jpg",
    "/images/gallery/g2.jpg",
    "/images/gallery/g3.jpg",
    "/images/gallery/g4.jpg",
    "/images/gallery/g5.jpg",
  ];

  useEffect(() => {
    if (opened) {
      AOS.refresh();
      setWishes(loadWishes());
    }
  }, [opened]);

  return (
    <div data-theme={theme} className="emerald-canvas relative min-h-svh font-sans text-[var(--page-ink)]">
      <audio ref={audioRef} src="/audio/ar-rum-21-tilawah.mp3" preload="auto" loop />

      {/* ===== 1. COVER / WELCOME (kunci scroll) ===== */}
      {!coverGone && (
        <div
          className={cn(
            "fixed inset-0 z-50 flex min-h-svh flex-col items-center justify-end overflow-hidden",
            opened && "cover-leave",
          )}
        >
          <img
            src="/images/hero.jpg"
            alt=""
            className="absolute inset-0 h-full w-full bg-[#c9d4c4] object-cover object-[center_20%] md:object-contain"
          />
          <div className="absolute inset-0 bg-linear-to-t from-[#041c16]/95 via-[#063528]/45 to-[#041c16]/15" />
          <div className="relative z-10 w-full max-w-md px-6 pb-16 text-center text-broken">
            <p className="font-serif text-[11px] tracking-[0.45em] text-gold uppercase">
              The Wedding of
            </p>
            <h1 className="mt-3 font-serif text-4xl leading-tight text-balance sm:text-5xl">
              {WEDDING.groom}
              <span className="mt-1 block font-serif text-xl font-normal italic text-gold">
                &
              </span>
              {WEDDING.bride}
            </h1>
            <p className="mt-6 text-xs tracking-[0.2em] text-broken/80 uppercase">Kepada Yth.</p>
            <p className="mt-1 font-serif text-lg text-gold">{guest}</p>
            <p className="mt-2 text-sm text-broken/75">{WEDDING.dateLabel}</p>
            <div className="mt-6 flex justify-center">
              <ThemeSwitch theme={theme} onChange={pilihTema} />
            </div>
            <button
              type="button"
              onClick={bukaUndangan}
              className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-full bg-linear-to-r from-[#f3e6c0] to-gold px-8 py-3 font-serif text-xs tracking-[0.28em] text-sage-dark uppercase shadow-[0_12px_30px_rgba(212,175,55,0.4)] transition-transform duration-150 active:scale-[0.96]"
            >
              <i className="fa-regular fa-envelope-open" />
              Buka Undangan
            </button>
          </div>
        </div>
      )}

      {opened && <Garden />}

      {/* ===== HALAMAN UTAMA ===== */}
      <main className={opened ? "block" : "invisible h-svh overflow-hidden"}>
        {/* 2. HERO */}
        <section className="relative">
          <img
            src="/images/hero.jpg"
            alt="Candra Purnama dan Saskia"
            className="hero-fade mx-auto h-[64vh] w-full object-cover object-[center_8%] md:h-[74vh] md:w-auto md:max-w-3xl md:object-contain"
          />
          <div className="relative z-10 -mt-28 px-5 pb-2 text-center">
            <p className="font-serif text-[11px] tracking-[0.4em] text-gold uppercase">
              We Are Getting Married
            </p>
            <h2 className="mt-2 font-serif text-4xl text-balance text-[var(--page-ink)] sm:text-5xl">
              {WEDDING.groom} & {WEDDING.bride}
            </h2>
            <p className="mt-2 text-sm text-[var(--page-soft)]">{WEDDING.dateLabel}</p>
          </div>
        </section>

        <section className="relative px-5 pt-6 pb-14">
          <div className="mx-auto max-w-lg text-center" data-aos="fade-up">
            <p className="font-arabic text-xl leading-relaxed text-[var(--page-verse)]" dir="rtl">
              {WEDDING.arabic}
            </p>
            <p className="mt-5 text-pretty text-sm leading-relaxed text-[var(--page-soft)] italic">
              “{WEDDING.meaning}”
            </p>
            <p className="mt-3 font-serif text-xs tracking-[0.2em] text-gold uppercase">
              {WEDDING.ref}
            </p>
            <LeafDivider />
            <p className="mb-5 font-serif text-sm tracking-[0.25em] text-gold uppercase">
              Menghitung Hari
            </p>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  ["Hari", count.hari],
                  ["Jam", count.jam],
                  ["Menit", count.menit],
                  ["Detik", count.detik],
                ] as const
              ).map(([label, n]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-gold/25 bg-cream px-1 py-4 shadow-sm"
                >
                  <div className="font-serif text-2xl tabular-nums text-sage-dark">{n}</div>
                  <div className="mt-1 text-[10px] tracking-widest text-muted uppercase">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. PROFIL */}
        <section className="px-5 py-16">
          <p
            className="mb-10 text-center font-serif text-xs tracking-[0.35em] text-gold uppercase"
            data-aos="fade-up"
          >
            The Beloved
          </p>
          <div className="mx-auto grid max-w-3xl gap-10 md:grid-cols-2 md:gap-8">
            <article
              className="rounded-3xl bg-broken p-6 text-center shadow-[0_12px_40px_rgba(90,110,88,0.08)]"
              data-aos="slide-right"
            >
              <div className="mx-auto h-44 w-36 overflow-hidden rounded-t-full border-4 border-gold/40">
                <img src="/images/groom.jpg" alt="Candra Purnama" className="h-full w-full object-cover object-top" />
              </div>
              <h3 className="mt-5 font-serif text-3xl text-sage-dark">{WEDDING.groomFull}</h3>
              <p className="mt-2 text-sm text-muted">
                Putra dari
                <br />
                <span className="text-ink">{WEDDING.groomParents}</span>
              </p>
              <a
                href={WEDDING.igGroom}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex min-h-11 items-center gap-2 text-sage"
              >
                <i className="fa-brands fa-instagram" />
                Instagram
              </a>
            </article>
            <article
              className="rounded-3xl bg-broken p-6 text-center shadow-[0_12px_40px_rgba(90,110,88,0.08)]"
              data-aos="slide-left"
            >
              <div className="mx-auto h-44 w-36 overflow-hidden rounded-t-full border-4 border-gold/40">
                <img
                  src="/images/bride.jpg"
                  alt="Saskia"
                  className="h-full w-full object-cover object-top"
                />
              </div>
              <h3 className="mt-5 font-serif text-3xl text-sage-dark">{WEDDING.brideFull}</h3>
              <p className="mt-2 text-sm text-muted">
                Putri dari
                <br />
                <span className="text-ink">{WEDDING.brideParents}</span>
              </p>
              <a
                href={WEDDING.igBride}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex min-h-11 items-center gap-2 text-sage"
              >
                <i className="fa-brands fa-instagram" />
                Instagram
              </a>
            </article>
          </div>
        </section>

        {/* 4. DETAIL ACARA */}
        <section className="px-5 py-16">
          <p
            className="mb-8 text-center font-serif text-xs tracking-[0.35em] text-gold uppercase"
            data-aos="fade-up"
          >
            Save The Date
          </p>
          <div className="mx-auto grid max-w-3xl gap-5 md:grid-cols-2">
            <div
              className="rounded-3xl border border-gold/20 bg-cream px-6 py-8 text-center"
              data-aos="fade-up"
            >
              <i className="fa-solid fa-moon mb-3 text-gold" />
              <h3 className="font-serif text-2xl text-sage-dark">Akad Nikah</h3>
              <p className="mt-3 text-sm text-ink">{WEDDING.dateLabel}</p>
              <p className="text-sm text-muted">{WEDDING.akadTime}</p>
              <p className="mt-3 text-pretty text-sm text-ink">{WEDDING.akadVenue}</p>
              <a
                href={WEDDING.akadMaps}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-sage px-5 text-sm text-broken"
              >
                <i className="fa-solid fa-location-dot" />
                Google Maps
              </a>
            </div>
            <div
              className="rounded-3xl border border-gold/20 bg-cream px-6 py-8 text-center"
              data-aos="fade-up"
              data-aos-delay="120"
            >
              <i className="fa-solid fa-champagne-glasses mb-3 text-gold" />
              <h3 className="font-serif text-2xl text-sage-dark">Resepsi</h3>
              <p className="mt-3 text-sm text-ink">{WEDDING.dateLabel}</p>
              <p className="text-sm text-muted">{WEDDING.resepsiTime}</p>
              <p className="mt-3 text-pretty text-sm text-ink">{WEDDING.resepsiVenue}</p>
              <a
                href={WEDDING.resepsiMaps}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-sage px-5 text-sm text-broken"
              >
                <i className="fa-solid fa-location-dot" />
                Google Maps
              </a>
            </div>
          </div>
        </section>

        {/* 5. GALERI */}
        <section className="px-5 py-16">
          <p
            className="mb-8 text-center font-serif text-xs tracking-[0.35em] text-gold uppercase"
            data-aos="fade-up"
          >
            Our Gallery
          </p>
          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3">
            {gallery.map((src, i) => (
              <div
                key={src}
                className={cn(
                  "overflow-hidden rounded-2xl",
                  i === 0 && "col-span-2 sm:col-span-2 sm:row-span-2",
                )}
                data-aos="zoom-in"
                data-aos-delay={i * 60}
              >
                <img
                  src={src}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-110"
                />
              </div>
            ))}
          </div>
        </section>

        {/* 6. RSVP */}
        <section className="px-5 py-16">
          <div className="mx-auto max-w-lg" data-aos="fade-up">
            <p className="text-center font-serif text-xs tracking-[0.35em] text-gold uppercase">
              RSVP & Ucapan
            </p>
            <h3 className="mt-2 text-center font-serif text-3xl text-[var(--page-ink)]">Doa Restu</h3>
            <form onSubmit={kirimUcapan} className="mt-8 space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama lengkap"
                className="min-h-11 w-full rounded-2xl border border-gold/25 bg-cream px-4 text-sm outline-none"
                required
              />
              <select
                value={attend}
                onChange={(e) => setAttend(e.target.value as Wish["attend"])}
                className="min-h-11 w-full rounded-2xl border border-gold/25 bg-cream px-4 text-sm outline-none"
              >
                <option>Hadir</option>
                <option>Tidak Hadir</option>
              </select>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tulis ucapan & doa restu"
                rows={4}
                className="w-full rounded-2xl border border-gold/25 bg-cream px-4 py-3 text-sm outline-none"
                required
              />
              <button
                type="submit"
                className="min-h-11 w-full rounded-full bg-linear-to-r from-[#f3e6c0] to-gold font-serif text-xs tracking-[0.28em] text-sage-dark uppercase"
              >
                Kirim
              </button>
            </form>

            <ul className="mt-8 max-h-80 space-y-3 overflow-y-auto">
              {wishes.length === 0 && (
                <li className="text-center text-sm text-[var(--page-soft)]">
                  Belum ada ucapan. Jadilah yang pertama.
                </li>
              )}
              {wishes.map((w) => (
                <li key={w.id} className="rounded-2xl border border-gold/15 bg-cream p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-serif text-base text-sage-dark">{w.name}</p>
                    <span className="text-[10px] tracking-wide text-gold uppercase">{w.attend}</span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{w.message}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <footer className="bg-sage-dark px-5 py-14 text-center text-broken">
          <p className="text-pretty text-sm italic text-broken/80">
            Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i
            berkenan hadir dan memberikan doa restu.
          </p>
          <p className="mt-6 font-serif text-2xl">
            {WEDDING.groom} & {WEDDING.bride}
          </p>
          <LeafDivider />
          <p className="text-[11px] tracking-[0.22em] text-gold uppercase">
            by {WEDDING.credit}
          </p>
        </footer>
      </main>

      {opened && (
        <div className="fixed right-4 bottom-[4.75rem] z-40">
          <ThemeSwitch theme={theme} onChange={pilihTema} />
        </div>
      )}

      {/* Audio control — kanan bawah */}
      {opened && (
        <button
          type="button"
          onClick={toggleMusic}
          className="fixed right-5 bottom-5 z-40 inline-flex min-h-12 min-w-12 items-center justify-center rounded-full border border-gold/50 bg-[var(--disc)] text-gold shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
          aria-label={playing ? "Jeda tilawah" : "Putar tilawah"}
        >
          <i
            className={cn(
              "fa-solid fa-compact-disc text-xl",
              playing && "vinyl-spin",
            )}
          />
        </button>
      )}
    </div>
  );
}
