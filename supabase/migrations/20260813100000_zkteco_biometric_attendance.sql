-- Master prompt Part 8: ZKTeco biometric teacher/staff attendance. Only the
-- device's own numeric User_ID + punch timestamp are ever stored — no
-- fingerprint template or image, per the master prompt's explicit privacy
-- requirement. School and college get their own parallel tables (per Part 1's
-- "totally separate" rule), each scoped to their own organization/campus and
-- membership table.

create table if not exists public.school_teacher_biometric_devices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  campus_id uuid references public.school_campuses(id) on delete set null,
  name text not null,
  device_ip text not null,
  port integer not null default 4370 check (port between 1 and 65535),
  comm_key integer not null default 0,
  last_synced_at timestamptz,
  last_sync_status text not null default 'never' check (last_sync_status in ('never', 'ok', 'error')),
  last_sync_error text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.school_teacher_biometric_mappings (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.school_teacher_biometric_devices(id) on delete cascade,
  device_user_id text not null,
  membership_id uuid not null references public.school_memberships(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (device_id, device_user_id)
);

create table if not exists public.college_teacher_biometric_devices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.college_organizations(id) on delete cascade,
  campus_id uuid references public.college_campuses(id) on delete set null,
  name text not null,
  device_ip text not null,
  port integer not null default 4370 check (port between 1 and 65535),
  comm_key integer not null default 0,
  last_synced_at timestamptz,
  last_sync_status text not null default 'never' check (last_sync_status in ('never', 'ok', 'error')),
  last_sync_error text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.college_teacher_biometric_mappings (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.college_teacher_biometric_devices(id) on delete cascade,
  device_user_id text not null,
  membership_id uuid not null references public.college_memberships(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (device_id, device_user_id)
);

comment on table public.school_teacher_biometric_devices is
  'ZKTeco K40/K50-class device registrations (LAN IP/port only — see Part 8''s deployment-constraint note: the sync cron needs network reachability to this IP, which a public cloud host will not have unless the device is port-forwarded or a local bridge agent relays it).';
comment on table public.school_teacher_biometric_mappings is
  'Device numeric User_ID -> school_memberships.id. No biometric template/image is ever stored, only this mapping plus punch timestamps written to school_staff_attendance.';

alter table public.school_teacher_biometric_devices enable row level security;
alter table public.school_teacher_biometric_mappings enable row level security;
alter table public.college_teacher_biometric_devices enable row level security;
alter table public.college_teacher_biometric_mappings enable row level security;

drop policy if exists school_biometric_devices_manage on public.school_teacher_biometric_devices;
create policy school_biometric_devices_manage on public.school_teacher_biometric_devices
  for all
  using (public.school_has_role(organization_id, array['owner', 'admin']))
  with check (public.school_has_role(organization_id, array['owner', 'admin']));

drop policy if exists school_biometric_mappings_manage on public.school_teacher_biometric_mappings;
create policy school_biometric_mappings_manage on public.school_teacher_biometric_mappings
  for all
  using (
    exists (
      select 1 from public.school_teacher_biometric_devices d
      where d.id = device_id and public.school_has_role(d.organization_id, array['owner', 'admin'])
    )
  )
  with check (
    exists (
      select 1 from public.school_teacher_biometric_devices d
      where d.id = device_id and public.school_has_role(d.organization_id, array['owner', 'admin'])
    )
  );

drop policy if exists college_biometric_devices_manage on public.college_teacher_biometric_devices;
create policy college_biometric_devices_manage on public.college_teacher_biometric_devices
  for all
  using (public.college_has_role(organization_id, array['owner', 'admin']))
  with check (public.college_has_role(organization_id, array['owner', 'admin']));

drop policy if exists college_biometric_mappings_manage on public.college_teacher_biometric_mappings;
create policy college_biometric_mappings_manage on public.college_teacher_biometric_mappings
  for all
  using (
    exists (
      select 1 from public.college_teacher_biometric_devices d
      where d.id = device_id and public.college_has_role(d.organization_id, array['owner', 'admin'])
    )
  )
  with check (
    exists (
      select 1 from public.college_teacher_biometric_devices d
      where d.id = device_id and public.college_has_role(d.organization_id, array['owner', 'admin'])
    )
  );

-- The sync cron writes with the service-role key (bypasses RLS entirely), same
-- as every other cron route in this codebase — no separate cron-facing policy needed.
