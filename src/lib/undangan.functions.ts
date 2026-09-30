import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql, type Sql } from "@/lib/db";
import { WEDDING, type Wish } from "@/lib/wedding";

export type InvitationSettings = typeof WEDDING;

type SettingsRow = {
  groom: string;
  bride: string;
  groom_full: string;
  bride_full: string;
  date_label: string;
  resepsi_iso: string;
  akad_time: string;
  resepsi_time: string;
  akad_venue: string;
  resepsi_venue: string;
  akad_maps: string;
  resepsi_maps: string;
  groom_parents: string;
  bride_parents: string;
  ig_groom: string;
  ig_bride: string;
  credit: string;
  arabic: string;
  meaning: string;
  ref: string;
};

function toSettings(row: SettingsRow): InvitationSettings {
  return {
    groom: row.groom,
    bride: row.bride,
    groomFull: row.groom_full,
    brideFull: row.bride_full,
    dateLabel: row.date_label,
    iso: WEDDING.iso,
    resepsiIso: row.resepsi_iso,
    akadTime: row.akad_time,
    resepsiTime: row.resepsi_time,
    akadVenue: row.akad_venue,
    resepsiVenue: row.resepsi_venue,
    akadMaps: row.akad_maps,
    resepsiMaps: row.resepsi_maps,
    groomParents: row.groom_parents,
    brideParents: row.bride_parents,
    igGroom: row.ig_groom,
    igBride: row.ig_bride,
    credit: row.credit,
    arabic: row.arabic,
    meaning: row.meaning,
    ref: row.ref,
  };
}

async function hashPin(pin: string) {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(`undangan-candra-saskia:${pin}`).digest("hex");
}

async function pinError(sql: Sql, pin: string) {
  const rows = await sql<{ pin_hash: string }>`select pin_hash from admin_lock where id = 1`;
  if (!rows[0]) return "Kata sandi belum dibuat.";
  const hash = await hashPin(pin);
  const { timingSafeEqual } = await import("node:crypto");
  const a = Buffer.from(hash);
  const b = Buffer.from(rows[0].pin_hash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return "Kata sandi salah.";
  return null;
}

async function ensureSettings(sql: Sql) {
  const w = WEDDING;
  await sql`
    insert into invitation_settings (
      id, groom, bride, groom_full, bride_full, date_label, resepsi_iso,
      akad_time, resepsi_time, akad_venue, resepsi_venue, akad_maps, resepsi_maps,
      groom_parents, bride_parents, ig_groom, ig_bride, credit, arabic, meaning, ref
    ) values (
      1, ${w.groom}, ${w.bride}, ${w.groomFull}, ${w.brideFull}, ${w.dateLabel}, ${w.resepsiIso},
      ${w.akadTime}, ${w.resepsiTime}, ${w.akadVenue}, ${w.resepsiVenue}, ${w.akadMaps}, ${w.resepsiMaps},
      ${w.groomParents}, ${w.brideParents}, ${w.igGroom}, ${w.igBride}, ${w.credit}, ${w.arabic}, ${w.meaning}, ${w.ref}
    )
    on conflict (id) do nothing
  `;
}

const settingsSchema = z.object({
  groom: z.string().trim().min(1).max(80),
  bride: z.string().trim().min(1).max(80),
  groomFull: z.string().trim().min(1).max(120),
  brideFull: z.string().trim().min(1).max(120),
  dateLabel: z.string().trim().min(1).max(80),
  resepsiIso: z.string().trim().min(1).max(40),
  akadTime: z.string().trim().min(1).max(40),
  resepsiTime: z.string().trim().min(1).max(40),
  akadVenue: z.string().trim().max(200),
  resepsiVenue: z.string().trim().min(1).max(200),
  akadMaps: z.string().trim().max(500),
  resepsiMaps: z.string().trim().max(500),
  groomParents: z.string().trim().max(160),
  brideParents: z.string().trim().max(160),
  igGroom: z.string().trim().max(200),
  igBride: z.string().trim().max(200),
  credit: z.string().trim().max(80),
  arabic: z.string().trim().min(1).max(800),
  meaning: z.string().trim().min(1).max(800),
  ref: z.string().trim().max(40),
});

export const getSettings = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const sql = await getSql();
    await ensureSettings(sql);
    const rows = await sql<SettingsRow>`select * from invitation_settings where id = 1`;
    return rows[0] ? toSettings(rows[0]) : WEDDING;
  } catch {
    return WEDDING;
  }
});

/** PIN default admin — disimpan sebagai hash di tabel admin_lock saat pertama kali. */
const DEFAULT_ADMIN_PIN = "istigfar8888";

export const pinStatus = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const sql = await getSql();
    const rows = await sql<{ n: number }>`select count(*)::int as n from admin_lock`;
    if (Number(rows[0]?.n ?? 0) === 0) {
      const pinHash = await hashPin(DEFAULT_ADMIN_PIN);
      await sql`insert into admin_lock (id, pin_hash) values (1, ${pinHash}) on conflict (id) do nothing`;
    }
    return { ready: true as const };
  } catch {
    return { ready: false as const };
  }
});

export const setupPin = createServerFn({ method: "POST" })
  .validator(z.object({ pin: z.string().trim().min(4).max(40) }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const existing = await sql<{ n: number }>`select count(*)::int as n from admin_lock`;
    if (Number(existing[0]?.n ?? 0) > 0) return { ok: false as const, error: "Kata sandi sudah dibuat." };
    const pinHash = await hashPin(data.pin);
    await sql`insert into admin_lock (id, pin_hash) values (1, ${pinHash})`;
    return { ok: true as const };
  });

export const unlock = createServerFn({ method: "POST" })
  .validator(z.object({ pin: z.string().min(1).max(40) }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const error = await pinError(sql, data.pin);
    return error ? { ok: false as const, error } : { ok: true as const };
  });

export const saveSettings = createServerFn({ method: "POST" })
  .validator(z.object({ pin: z.string().min(1).max(40), settings: settingsSchema }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const error = await pinError(sql, data.pin);
    if (error) return { ok: false as const, error };
    const s = data.settings;
    await ensureSettings(sql);
    await sql`
      update invitation_settings set
        groom = ${s.groom},
        bride = ${s.bride},
        groom_full = ${s.groomFull},
        bride_full = ${s.brideFull},
        date_label = ${s.dateLabel},
        resepsi_iso = ${s.resepsiIso},
        akad_time = ${s.akadTime},
        resepsi_time = ${s.resepsiTime},
        akad_venue = ${s.akadVenue},
        resepsi_venue = ${s.resepsiVenue},
        akad_maps = ${s.akadMaps},
        resepsi_maps = ${s.resepsiMaps},
        groom_parents = ${s.groomParents},
        bride_parents = ${s.brideParents},
        ig_groom = ${s.igGroom},
        ig_bride = ${s.igBride},
        credit = ${s.credit},
        arabic = ${s.arabic},
        meaning = ${s.meaning},
        ref = ${s.ref}
      where id = 1
    `;
    return { ok: true as const };
  });

export const listGuests = createServerFn({ method: "POST" })
  .validator(z.object({ pin: z.string().min(1).max(40) }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const error = await pinError(sql, data.pin);
    if (error) return { ok: false as const, error, guests: [] as { id: number; name: string }[] };
    const guests = await sql<{ id: number; name: string }>`
      select id, name from guests order by created_at desc, id desc
    `;
    return { ok: true as const, guests };
  });

export const addGuests = createServerFn({ method: "POST" })
  .validator(
    z.object({
      pin: z.string().min(1).max(40),
      names: z.array(z.string().trim().min(1).max(80)).min(1).max(80),
    }),
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    const error = await pinError(sql, data.pin);
    if (error) return { ok: false as const, error };
    for (const name of data.names) {
      await sql`insert into guests (name) values (${name})`;
    }
    return { ok: true as const };
  });

export const deleteGuest = createServerFn({ method: "POST" })
  .validator(z.object({ pin: z.string().min(1).max(40), id: z.number().int().positive() }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const error = await pinError(sql, data.pin);
    if (error) return { ok: false as const, error };
    await sql`delete from guests where id = ${data.id}`;
    return { ok: true as const };
  });

export const updateGuest = createServerFn({ method: "POST" })
  .validator(
    z.object({
      pin: z.string().min(1).max(40),
      id: z.number().int().positive(),
      name: z.string().trim().min(1).max(80),
    }),
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    const error = await pinError(sql, data.pin);
    if (error) return { ok: false as const, error };
    await sql`update guests set name = ${data.name} where id = ${data.id}`;
    return { ok: true as const };
  });

export const deleteGuestsBulk = createServerFn({ method: "POST" })
  .validator(
    z.object({
      pin: z.string().min(1).max(40),
      ids: z.array(z.number().int().positive()).min(1).max(200),
    }),
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    const error = await pinError(sql, data.pin);
    if (error) return { ok: false as const, error };
    for (const id of data.ids) {
      await sql`delete from guests where id = ${id}`;
    }
    return { ok: true as const };
  });

/** Semua doa/ucapan & tamu disimpan di Postgres (Neon di Vercel, PGLite lokal). */

export const listWishes = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql<{ id: string; name: string; message: string; attend: string; at: string }>`
    select id, name, message, attend, created_at::text as at from wishes order by created_at desc
  `;
  return rows
    .filter((row) => row.attend === "Hadir" || row.attend === "Tidak Hadir")
    .map(
      (row): Wish => ({
        id: row.id,
        name: row.name,
        message: row.message,
        attend: row.attend as Wish["attend"],
        at: Date.parse(row.at) || Date.now(),
      }),
    );
});

export const addWish = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().trim().min(1).max(80),
      message: z.string().trim().min(1).max(500),
      attend: z.enum(["Hadir", "Tidak Hadir"]),
    }),
  )
  .handler(async ({ data }): Promise<Wish> => {
    const sql = await getSql();
    const id = crypto.randomUUID();
    await sql`
      insert into wishes (id, name, message, attend) values (${id}, ${data.name}, ${data.message}, ${data.attend})
    `;
    return { id, name: data.name, message: data.message, attend: data.attend, at: Date.now() };
  });

/** Admin menghapus ucapan (butuh PIN). */
export const deleteWish = createServerFn({ method: "POST" })
  .validator(z.object({ pin: z.string().min(1).max(40), id: z.string().min(1).max(80) }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const error = await pinError(sql, data.pin);
    if (error) return { ok: false as const, error };
    await sql`delete from wishes where id = ${data.id}`;
    return { ok: true as const };
  });

/** Tamu menghapus ucapan miliknya (id UUID sulit ditebak). */
export const deleteWishById = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql`delete from wishes where id = ${data.id}`;
    return { ok: true as const };
  });

export const updateWish = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1).max(80),
      message: z.string().trim().min(1).max(500),
      pin: z.string().min(1).max(40).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    if (data.pin) {
      const error = await pinError(sql, data.pin);
      if (error) return { ok: false as const, error };
    }
    await sql`update wishes set message = ${data.message} where id = ${data.id}`;
    return { ok: true as const };
  });
