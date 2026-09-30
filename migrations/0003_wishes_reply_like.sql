alter table wishes add column if not exists parent_id text;
alter table wishes add column if not exists likes int not null default 0;
