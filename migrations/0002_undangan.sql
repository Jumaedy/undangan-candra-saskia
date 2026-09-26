create table if not exists invitation_settings (
  id int primary key default 1,
  groom text not null,
  bride text not null,
  groom_full text not null,
  bride_full text not null,
  date_label text not null,
  resepsi_iso text not null,
  akad_time text not null,
  resepsi_time text not null,
  akad_venue text not null,
  resepsi_venue text not null,
  akad_maps text not null,
  resepsi_maps text not null,
  groom_parents text not null,
  bride_parents text not null,
  ig_groom text not null,
  ig_bride text not null,
  credit text not null,
  arabic text not null,
  meaning text not null,
  ref text not null,
  constraint invitation_settings_one check (id = 1)
);

create table if not exists guests (
  id serial primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists wishes (
  id text primary key,
  name text not null,
  message text not null,
  attend text not null,
  created_at timestamptz not null default now()
);

create table if not exists admin_lock (
  id int primary key default 1,
  pin_hash text not null,
  constraint admin_lock_one check (id = 1)
);
