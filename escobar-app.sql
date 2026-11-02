-- AIO Pro Inspect — everything the installer's app needs, in one file.
-- ADDITIVE ONLY. Nothing existing is dropped, renamed or changed.
-- Paste the whole thing into the Supabase SQL editor and press Run. Safe to run twice.
--
--   job_cards   the job to perform: when, who, where it stands
--   job_parts   the equipment list: what, how many, have it, where to collect
--   job_items   what was sold, line by line: instructions, before photo, after photo
--   signed_list which papers the customer signed (owner + the technician who sent it)
--
-- Before/during/after photos keep using work_shots, which already exists.
-- What Escobar is owed keeps using sub_charges, which already exists.
-- Not one price the customer pays is stored in any of this.

-- ──────────────────────────────── 1. the job ────────────────────────────────
create table if not exists public.job_cards (
  id          text primary key,
  share_id    text,
  job_key     text,
  est_id      text,
  customer    text,
  address     text,
  phone       text,
  scope       text,
  day         date,
  start_time  text,
  performer   text,
  status      text not null default 'open',   -- open | offered | scheduled | doing | done
  offered_day date,                           -- the day HE says he can come
  offered_note text,
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists job_cards_day on public.job_cards (day);
create index if not exists job_cards_share on public.job_cards (share_id);

-- ────────────────────────── 2. the equipment list ───────────────────────────
create table if not exists public.job_parts (
  id         text primary key,
  card_id    text not null,
  name       text not null,
  qty        text,
  have       boolean not null default false,
  bring      boolean not null default false,   -- he has to bring it himself
  pickup     text,
  note       text,
  sort       int not null default 0,
  updated_at timestamptz not null default now()
);
create index if not exists job_parts_card on public.job_parts (card_id);

-- ─────────── 3. what was sold, line by line — the heart of his screen ───────────
create table if not exists public.job_items (
  id           text primary key,
  card_id      text not null,
  name         text not null,              -- the item, as it was sold
  instructions text,                       -- what he has to do, in his language
  before_shot  text,                       -- work_shots id, or a url
  after_shot   text,
  done         boolean not null default false,
  done_at      timestamptz,
  sort         int not null default 0,
  updated_at   timestamptz not null default now()
);
create index if not exists job_items_card on public.job_items (card_id);

-- ──────────────────────────── 4. who may do what ────────────────────────────
-- The office does everything. The installer reads his own jobs, ticks a part off,
-- marks an item done, and says which day suits him. He writes nothing else.

create or replace function public.job_card_list(p_key text, p_from date default null, p_to date default null)
returns setof public.job_cards
language plpgsql security definer set search_path = public as $$
declare r text;
begin
  r := public.app_role(p_key);
  if r is null or r = '' then raise exception 'not allowed'; end if;
  if r = 'owner' then
    return query select * from public.job_cards c
      where (p_from is null or c.day is null or c.day between p_from and p_to)
      order by c.day nulls last, c.created_at;
  else
    return query select * from public.job_cards c
      where c.performer = 'installer'
        and (p_from is null or c.day is null or c.day between p_from and p_to)
      order by c.day nulls last, c.created_at;
  end if;
end $$;

create or replace function public.job_card_put(p_key text, p_payload jsonb)
returns text
language plpgsql security definer set search_path = public as $$
declare r text; i text;
begin
  r := public.app_role(p_key);
  if r <> 'owner' then raise exception 'only the office can create or move a job'; end if;
  i := coalesce(nullif(p_payload->>'id',''), 'jc-' || replace(gen_random_uuid()::text,'-',''));
  insert into public.job_cards as c
    (id, share_id, job_key, est_id, customer, address, phone, scope, day, start_time, performer, status, note)
  values (i, p_payload->>'share_id', p_payload->>'job_key', p_payload->>'est_id',
          p_payload->>'customer', p_payload->>'address', p_payload->>'phone', p_payload->>'scope',
          nullif(p_payload->>'day','')::date, p_payload->>'start_time', p_payload->>'performer',
          coalesce(nullif(p_payload->>'status',''),'open'), p_payload->>'note')
  on conflict (id) do update set
    share_id = excluded.share_id, job_key = excluded.job_key, est_id = excluded.est_id,
    customer = excluded.customer, address = excluded.address, phone = excluded.phone,
    scope = excluded.scope, day = excluded.day, start_time = excluded.start_time,
    performer = excluded.performer, status = excluded.status, note = excluded.note,
    updated_at = now();
  return i;
end $$;

-- he says which day suits him; the office still decides
create or replace function public.job_card_offer(p_key text, p_id text, p_day date, p_note text default '')
returns text
language plpgsql security definer set search_path = public as $$
declare r text; n int;
begin
  r := public.app_role(p_key);
  if r is null or r = '' then raise exception 'not allowed'; end if;
  update public.job_cards
     set offered_day = p_day, offered_note = p_note,
         status = case when status = 'open' then 'offered' else status end,
         updated_at = now()
   where id = p_id and (r = 'owner' or performer = 'installer');
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'no such job'; end if;
  return 'ok';
end $$;

create or replace function public.job_parts_list(p_key text, p_card text)
returns setof public.job_parts
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(public.app_role(p_key),'') = '' then raise exception 'not allowed'; end if;
  return query select * from public.job_parts where card_id = p_card order by sort, name;
end $$;

create or replace function public.job_part_put(p_key text, p_payload jsonb)
returns text
language plpgsql security definer set search_path = public as $$
declare r text; i text;
begin
  r := public.app_role(p_key);
  if r is null or r = '' then raise exception 'not allowed'; end if;
  i := coalesce(nullif(p_payload->>'id',''), 'jp-' || replace(gen_random_uuid()::text,'-',''));
  if r = 'owner' then
    insert into public.job_parts as p (id, card_id, name, qty, have, bring, pickup, note, sort)
    values (i, p_payload->>'card_id', coalesce(p_payload->>'name','item'), p_payload->>'qty',
            coalesce((p_payload->>'have')::boolean,false), coalesce((p_payload->>'bring')::boolean,false),
            p_payload->>'pickup', p_payload->>'note', coalesce((p_payload->>'sort')::int,0))
    on conflict (id) do update set
      name = excluded.name, qty = excluded.qty, have = excluded.have, bring = excluded.bring,
      pickup = excluded.pickup, note = excluded.note, sort = excluded.sort, updated_at = now();
  else
    update public.job_parts
       set have = coalesce((p_payload->>'have')::boolean, have), updated_at = now()
     where id = i;
  end if;
  return i;
end $$;

create or replace function public.job_part_delete(p_key text, p_id text)
returns text
language plpgsql security definer set search_path = public as $$
begin
  if public.app_role(p_key) <> 'owner' then raise exception 'only the office can remove a line'; end if;
  delete from public.job_parts where id = p_id;
  return 'ok';
end $$;

create or replace function public.job_items_list(p_key text, p_card text)
returns setof public.job_items
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(public.app_role(p_key),'') = '' then raise exception 'not allowed'; end if;
  return query select * from public.job_items where card_id = p_card order by sort, name;
end $$;

create or replace function public.job_item_put(p_key text, p_payload jsonb)
returns text
language plpgsql security definer set search_path = public as $$
declare r text; i text;
begin
  r := public.app_role(p_key);
  if r is null or r = '' then raise exception 'not allowed'; end if;
  i := coalesce(nullif(p_payload->>'id',''), 'ji-' || replace(gen_random_uuid()::text,'-',''));
  if r = 'owner' then
    insert into public.job_items as x (id, card_id, name, instructions, before_shot, after_shot, done, sort)
    values (i, p_payload->>'card_id', coalesce(p_payload->>'name','item'), p_payload->>'instructions',
            p_payload->>'before_shot', p_payload->>'after_shot',
            coalesce((p_payload->>'done')::boolean,false), coalesce((p_payload->>'sort')::int,0))
    on conflict (id) do update set
      name = excluded.name, instructions = excluded.instructions,
      before_shot = excluded.before_shot, after_shot = excluded.after_shot,
      done = excluded.done, sort = excluded.sort, updated_at = now();
  else
    -- he may finish a line and hang his own photo on it, nothing else
    update public.job_items
       set after_shot = coalesce(nullif(p_payload->>'after_shot',''), after_shot),
           done = coalesce((p_payload->>'done')::boolean, done),
           done_at = case when coalesce((p_payload->>'done')::boolean, done) then now() else done_at end,
           updated_at = now()
     where id = i;
  end if;
  return i;
end $$;

-- ───────────────────── 5. which papers the customer signed ─────────────────────
create or replace function public.signed_list(p_key text, p_days int default 90)
returns table (
  id text, kind text, signed_at timestamptz, signer_name text,
  sign_date text, choice text, customer text, address text, total text
)
language plpgsql security definer set search_path = public as $$
declare r text;
begin
  r := public.app_role(p_key);
  if r is null or r = '' then raise exception 'not allowed'; end if;
  if r = 'owner' then
    return query
      select s.id::text, coalesce(s.kind,'estimate')::text, s.signed_at, s.signer_name::text,
             s.sign_date::text, s.choice::text,
             coalesce(d.customer, s.payload->'customer'->>'name')::text,
             coalesce(d.address,  s.payload->'customer'->>'address')::text,
             coalesce(d.total::text, s.payload->>'total')::text
        from public.shared_estimates s
        left join public.crew_docs d on d.share_id = s.id
       where s.signed_at is not null
         and s.signed_at > now() - make_interval(days => greatest(coalesce(p_days,90),1))
       order by s.signed_at desc;
  else
    return query
      select s.id::text, coalesce(s.kind,'estimate')::text, s.signed_at, s.signer_name::text,
             s.sign_date::text, s.choice::text, d.customer::text, d.address::text, d.total::text
        from public.shared_estimates s
        join public.crew_docs d on d.share_id = s.id
       where s.signed_at is not null
         and s.signed_at > now() - make_interval(days => greatest(coalesce(p_days,90),1))
         and d.by_role <> 'owner'
       order by s.signed_at desc;
  end if;
end $$;

grant execute on function public.job_card_list(text, date, date)   to anon, authenticated;
grant execute on function public.job_card_put(text, jsonb)         to anon, authenticated;
grant execute on function public.job_card_offer(text, text, date, text) to anon, authenticated;
grant execute on function public.job_parts_list(text, text)        to anon, authenticated;
grant execute on function public.job_part_put(text, jsonb)         to anon, authenticated;
grant execute on function public.job_part_delete(text, text)       to anon, authenticated;
grant execute on function public.job_items_list(text, text)        to anon, authenticated;
grant execute on function public.job_item_put(text, jsonb)         to anon, authenticated;
grant execute on function public.signed_list(text, int)            to anon, authenticated;

-- check
select 'job_cards' as t, count(*) from public.job_cards
union all select 'job_parts', count(*) from public.job_parts
union all select 'job_items', count(*) from public.job_items
union all select 'signed in 90d', count(*) from public.shared_estimates
   where signed_at is not null and signed_at > now() - interval '90 days';
