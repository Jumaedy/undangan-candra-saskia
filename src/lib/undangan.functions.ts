/** Semua doa/ucapan & tamu disimpan di Postgres (Neon di Vercel, PGLite lokal). */

export const listWishes = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const sql = await getSql();
    await sql`alter table wishes add column if not exists parent_id text`;
    await sql`alter table wishes add column if not exists likes int not null default 0`;
    const rows = await sql<{
      id: string;
      name: string;
      message: string;
      attend: string;
      at: string;
      parent_id: string | null;
      likes: number;
    }>`
      select id, name, message, attend, created_at::text as at,
             parent_id, coalesce(likes, 0)::int as likes
      from wishes
      order by created_at desc
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
          parentId: row.parent_id,
          likes: Number(row.likes) || 0,
        }),
      );
  } catch {
    return [] as Wish[];
  }
});

export const addWish = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().trim().min(1).max(80),
      message: z.string().trim().min(1).max(500),
      attend: z.enum(["Hadir", "Tidak Hadir"]),
      parentId: z.string().min(1).max(80).optional().nullable(),
    }),
  )
  .handler(async ({ data }): Promise<Wish> => {
    const sql = await getSql();
    await sql`alter table wishes add column if not exists parent_id text`;
    await sql`alter table wishes add column if not exists likes int not null default 0`;
    const id = crypto.randomUUID();
    const parentId = data.parentId ?? null;
    await sql`
      insert into wishes (id, name, message, attend, parent_id, likes)
      values (${id}, ${data.name}, ${data.message}, ${data.attend}, ${parentId}, 0)
    `;
    return {
      id,
      name: data.name,
      message: data.message,
      attend: data.attend,
      at: Date.now(),
      parentId,
      likes: 0,
    };
  });

export const likeWish = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1).max(80) }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql`alter table wishes add column if not exists likes int not null default 0`;
    await sql`update wishes set likes = coalesce(likes, 0) + 1 where id = ${data.id}`;
    const rows = await sql<{ likes: number }>`
      select coalesce(likes, 0)::int as likes from wishes where id = ${data.id}
    `;
    return { ok: true as const, likes: Number(rows[0]?.likes ?? 0) };
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

/** Tamu menghapus ucapan miliknya. */
export const deleteWishById = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1).max(80) }))
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
