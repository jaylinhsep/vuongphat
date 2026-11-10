-- ============================================================================
-- Vương Phát ERP — Supabase schema
-- Chạy toàn bộ file này trong Supabase SQL Editor (một lần).
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Kiểu dữ liệu
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('admin', 'kho', 'san_xuat', 'ke_toan');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.item_type as enum ('nguyen_lieu', 'thanh_pham');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.movement_type as enum
    ('nhap', 'xuat', 'dieu_chinh', 'san_xuat_tieu_hao', 'san_xuat_nhap');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.production_status as enum ('cho_xac_nhan', 'hoan_thanh', 'huy');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.cash_type as enum ('thu', 'chi');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('tien_mat', 'ngan_hang');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 2. Hồ sơ người dùng + phân quyền
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role public.user_role not null default 'kho',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Đọc role của chính mình; security definer để tránh đệ quy RLS.
create or replace function public.my_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.my_role() = 'admin', false);
$$;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Tự tạo hồ sơ khi có user mới (mặc định vai trò "kho").
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 3. Danh mục
-- ---------------------------------------------------------------------------
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  phone text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  unit text not null,
  type public.item_type not null,
  unit_price numeric(14, 2) not null default 0 check (unit_price >= 0),
  min_stock numeric(14, 3) not null default 0 check (min_stock >= 0),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4. Kho: phiếu nhập / xuất / điều chỉnh
--    quantity là số CÓ DẤU: nhập > 0, xuất < 0.
-- ---------------------------------------------------------------------------
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete restrict,
  type public.movement_type not null,
  quantity numeric(14, 3) not null check (quantity <> 0),
  unit_price numeric(14, 2) not null default 0 check (unit_price >= 0),
  supplier_id uuid references public.suppliers (id) on delete set null,
  note text,
  reference_type text,
  reference_id uuid,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists stock_movements_item_idx
  on public.stock_movements (item_id, created_at desc);

-- Tồn kho hiện tại = tổng đại số các phiếu.
create or replace view public.item_stock
with (security_invoker = true) as
select
  i.id,
  i.code,
  i.name,
  i.unit,
  i.type,
  i.unit_price,
  i.min_stock,
  i.created_at,
  coalesce(sum(m.quantity), 0)::numeric(14, 3) as on_hand
from public.items i
left join public.stock_movements m on m.item_id = i.id
group by i.id;

-- ---------------------------------------------------------------------------
-- 5. Công thức định lượng (BOM) + lệnh sản xuất
-- ---------------------------------------------------------------------------
create table if not exists public.boms (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.items (id) on delete cascade,
  output_quantity numeric(14, 3) not null default 1 check (output_quantity > 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bom_items (
  id uuid primary key default gen_random_uuid(),
  bom_id uuid not null references public.boms (id) on delete cascade,
  material_id uuid not null references public.items (id) on delete restrict,
  quantity numeric(14, 3) not null check (quantity > 0),
  unique (bom_id, material_id)
);

create table if not exists public.production_orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default (
    'LSX-' || to_char(now(), 'YYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
  ),
  product_id uuid not null references public.items (id) on delete restrict,
  quantity numeric(14, 3) not null check (quantity > 0),
  actual_quantity numeric(14, 3),
  waste_quantity numeric(14, 3) not null default 0,
  material_cost numeric(14, 2) not null default 0,
  labor_cost numeric(14, 2) not null default 0,
  other_cost numeric(14, 2) not null default 0,
  total_cost numeric(14, 2) not null default 0,
  unit_cost numeric(14, 2) not null default 0,
  status public.production_status not null default 'cho_xac_nhan',
  planned_date date not null default current_date,
  completed_at timestamptz,
  note text,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 6. Kế toán: sổ quỹ thu / chi
-- ---------------------------------------------------------------------------
create table if not exists public.cash_transactions (
  id uuid primary key default gen_random_uuid(),
  type public.cash_type not null,
  amount numeric(14, 2) not null check (amount > 0),
  method public.payment_method not null default 'tien_mat',
  category text not null default 'Khác',
  description text,
  transaction_date date not null default current_date,
  reference_type text,
  reference_id uuid,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists cash_transactions_date_idx
  on public.cash_transactions (transaction_date desc);

create or replace view public.cash_balance
with (security_invoker = true) as
select coalesce(sum(
  case when type = 'thu' then amount else -amount end
), 0)::numeric(14, 2) as balance
from public.cash_transactions;

-- ---------------------------------------------------------------------------
-- 7. RLS
-- ---------------------------------------------------------------------------
alter table public.suppliers enable row level security;
alter table public.items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.boms enable row level security;
alter table public.bom_items enable row level security;
alter table public.production_orders enable row level security;
alter table public.cash_transactions enable row level security;

-- Nhà cung cấp
drop policy if exists "suppliers_select" on public.suppliers;
create policy "suppliers_select" on public.suppliers
  for select to authenticated using (true);

drop policy if exists "suppliers_write" on public.suppliers;
create policy "suppliers_write" on public.suppliers
  for all to authenticated
  using (public.my_role() in ('admin', 'kho'))
  with check (public.my_role() in ('admin', 'kho'));

-- Hàng hóa
drop policy if exists "items_select" on public.items;
create policy "items_select" on public.items
  for select to authenticated using (true);

drop policy if exists "items_write" on public.items;
create policy "items_write" on public.items
  for all to authenticated
  using (public.my_role() in ('admin', 'kho'))
  with check (public.my_role() in ('admin', 'kho'));

-- Phiếu kho: chỉ đọc trực tiếp, ghi qua RPC (kiểm tra tồn kho + quyền).
drop policy if exists "stock_movements_select" on public.stock_movements;
create policy "stock_movements_select" on public.stock_movements
  for select to authenticated using (true);

-- BOM
drop policy if exists "boms_select" on public.boms;
create policy "boms_select" on public.boms
  for select to authenticated using (true);

drop policy if exists "bom_items_select" on public.bom_items;
create policy "bom_items_select" on public.bom_items
  for select to authenticated using (true);

-- Lệnh sản xuất
drop policy if exists "production_orders_select" on public.production_orders;
create policy "production_orders_select" on public.production_orders
  for select to authenticated using (true);

drop policy if exists "production_orders_insert" on public.production_orders;
create policy "production_orders_insert" on public.production_orders
  for insert to authenticated
  with check (public.my_role() in ('admin', 'san_xuat'));

drop policy if exists "production_orders_update" on public.production_orders;
create policy "production_orders_update" on public.production_orders
  for update to authenticated
  using (public.my_role() in ('admin', 'san_xuat'))
  with check (public.my_role() in ('admin', 'san_xuat'));

drop policy if exists "production_orders_delete" on public.production_orders;
create policy "production_orders_delete" on public.production_orders
  for delete to authenticated
  using (public.my_role() in ('admin', 'san_xuat'));

-- Sổ quỹ: chỉ Admin và Kế toán
drop policy if exists "cash_select" on public.cash_transactions;
create policy "cash_select" on public.cash_transactions
  for select to authenticated
  using (public.my_role() in ('admin', 'ke_toan'));

drop policy if exists "cash_insert" on public.cash_transactions;
create policy "cash_insert" on public.cash_transactions
  for insert to authenticated
  with check (public.my_role() in ('admin', 'ke_toan'));

drop policy if exists "cash_update" on public.cash_transactions;
create policy "cash_update" on public.cash_transactions
  for update to authenticated
  using (public.my_role() in ('admin', 'ke_toan'))
  with check (public.my_role() in ('admin', 'ke_toan'));

drop policy if exists "cash_delete" on public.cash_transactions;
create policy "cash_delete" on public.cash_transactions
  for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 8. RPC nghiệp vụ
-- ---------------------------------------------------------------------------

-- Tạo phiếu nhập / xuất / điều chỉnh kho.
-- p_quantity: nhập & xuất truyền số dương; điều chỉnh truyền số có dấu.
create or replace function public.create_stock_movement(
  p_item_id uuid,
  p_type public.movement_type,
  p_quantity numeric,
  p_unit_price numeric default 0,
  p_supplier_id uuid default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_qty numeric;
  v_on_hand numeric;
  v_movement_id uuid;
begin
  if public.my_role() not in ('admin', 'kho') then
    raise exception 'Bạn không có quyền thực hiện thao tác kho';
  end if;

  if p_type not in ('nhap', 'xuat', 'dieu_chinh') then
    raise exception 'Loại phiếu kho không hợp lệ';
  end if;

  -- Khóa dòng hàng hóa để tránh ghi đè tồn kho đồng thời.
  perform 1 from public.items where id = p_item_id for update;
  if not found then
    raise exception 'Không tìm thấy hàng hóa';
  end if;

  if p_quantity is null or p_quantity = 0 then
    raise exception 'Số lượng phải khác 0';
  end if;

  v_qty := case
    when p_type = 'nhap' then abs(p_quantity)
    when p_type = 'xuat' then -abs(p_quantity)
    else p_quantity
  end;

  select coalesce(sum(quantity), 0) into v_on_hand
  from public.stock_movements where item_id = p_item_id;

  if v_qty < 0 and v_on_hand + v_qty < 0 then
    raise exception 'Tồn kho không đủ (hiện còn %)', v_on_hand;
  end if;

  insert into public.stock_movements
    (item_id, type, quantity, unit_price, supplier_id, note, created_by)
  values
    (p_item_id, p_type, v_qty, coalesce(p_unit_price, 0), p_supplier_id, p_note, auth.uid())
  returning id into v_movement_id;

  return v_movement_id;
end;
$$;

-- Lưu công thức định lượng (tạo mới hoặc ghi đè theo thành phẩm).
-- p_items: [{"material_id": "...", "quantity": 0.5}, ...]
create or replace function public.save_bom(
  p_product_id uuid,
  p_output_quantity numeric,
  p_note text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bom_id uuid;
  v_count integer;
  v_duplicates integer;
begin
  if public.my_role() not in ('admin', 'san_xuat') then
    raise exception 'Bạn không có quyền thiết lập công thức';
  end if;

  if not exists (
    select 1 from public.items where id = p_product_id and type = 'thanh_pham'
  ) then
    raise exception 'Thành phẩm không hợp lệ';
  end if;

  if p_output_quantity is null or p_output_quantity <= 0 then
    raise exception 'Số lượng đầu ra phải lớn hơn 0';
  end if;

  select count(*) into v_count
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb));

  if v_count = 0 then
    raise exception 'Công thức phải có ít nhất một nguyên liệu';
  end if;

  select count(*) into v_duplicates
  from (
    select value ->> 'material_id' as material_id
    from jsonb_array_elements(p_items)
    group by 1
    having count(*) > 1
  ) d;

  if v_duplicates > 0 then
    raise exception 'Nguyên liệu bị lặp trong công thức';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) e
    where not exists (
      select 1 from public.items i
      where i.id = (e ->> 'material_id')::uuid and i.type = 'nguyen_lieu'
    )
    or coalesce((e ->> 'quantity')::numeric, 0) <= 0
  ) then
    raise exception 'Nguyên liệu hoặc định lượng không hợp lệ';
  end if;

  insert into public.boms (product_id, output_quantity, note, updated_at)
  values (p_product_id, p_output_quantity, p_note, now())
  on conflict (product_id) do update
    set output_quantity = excluded.output_quantity,
        note = excluded.note,
        updated_at = now()
  returning id into v_bom_id;

  delete from public.bom_items where bom_id = v_bom_id;

  insert into public.bom_items (bom_id, material_id, quantity)
  select v_bom_id, (e ->> 'material_id')::uuid, (e ->> 'quantity')::numeric
  from jsonb_array_elements(p_items) e;

  return v_bom_id;
end;
$$;

-- Xác nhận hoàn thành lệnh sản xuất: kiểm tra & trừ nguyên liệu, nhập thành phẩm theo sản lượng thực tế, tính giá thành đầy đủ.
create or replace function public.confirm_production(
  p_order_id uuid,
  p_actual_quantity numeric default null,
  p_waste_quantity numeric default 0,
  p_labor_cost numeric default 0,
  p_other_cost numeric default 0,
  p_note text default null
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.production_orders;
  v_bom public.boms;
  v_line record;
  v_on_hand numeric;
  v_material_cost numeric := 0;
  v_total_cost numeric := 0;
  v_unit_cost numeric := 0;
  v_actual_quantity numeric;
  v_waste_quantity numeric := coalesce(p_waste_quantity, 0);
  v_labor_cost numeric := coalesce(p_labor_cost, 0);
  v_other_cost numeric := coalesce(p_other_cost, 0);
begin
  if public.my_role() not in ('admin', 'san_xuat') then
    raise exception 'Bạn không có quyền xác nhận sản xuất';
  end if;

  select * into v_order
  from public.production_orders where id = p_order_id for update;

  if not found then
    raise exception 'Không tìm thấy lệnh sản xuất';
  end if;

  if v_order.status <> 'cho_xac_nhan' then
    raise exception 'Lệnh sản xuất đã được xử lý';
  end if;

  v_actual_quantity := coalesce(p_actual_quantity, v_order.quantity);
  if v_actual_quantity <= 0 then
    raise exception 'Số lượng thực tế nhập kho phải lớn hơn 0';
  end if;

  select * into v_bom from public.boms where product_id = v_order.product_id;
  if not found then
    raise exception 'Thành phẩm chưa có công thức định lượng (BOM)';
  end if;

  if not exists (select 1 from public.bom_items where bom_id = v_bom.id) then
    raise exception 'Công thức định lượng đang rỗng';
  end if;

  -- Khóa toàn bộ hàng hóa liên quan theo thứ tự id để tránh deadlock.
  perform 1 from public.items
  where id in (
    select material_id from public.bom_items where bom_id = v_bom.id
    union
    select v_order.product_id
  )
  order by id
  for update;

  for v_line in
    select bi.material_id,
           i.name,
           bi.quantity * v_order.quantity / v_bom.output_quantity as needed
    from public.bom_items bi
    join public.items i on i.id = bi.material_id
    where bi.bom_id = v_bom.id
  loop
    select coalesce(sum(quantity), 0) into v_on_hand
    from public.stock_movements where item_id = v_line.material_id;

    if v_on_hand < v_line.needed then
      raise exception 'Nguyên liệu "%" không đủ: cần %, chỉ còn %',
        v_line.name, v_line.needed, v_on_hand;
    end if;
  end loop;

  select coalesce(sum(
    bi.quantity * v_order.quantity / v_bom.output_quantity * i.unit_price
  ), 0)
  into v_material_cost
  from public.bom_items bi
  join public.items i on i.id = bi.material_id
  where bi.bom_id = v_bom.id;

  v_total_cost := v_material_cost + v_labor_cost + v_other_cost;
  v_unit_cost := round(v_total_cost / v_actual_quantity, 2);

  insert into public.stock_movements
    (item_id, type, quantity, unit_price, note, reference_type, reference_id, created_by)
  select bi.material_id,
         'san_xuat_tieu_hao',
         -(bi.quantity * v_order.quantity / v_bom.output_quantity),
         i.unit_price,
         'Xuất nguyên liệu cho lệnh ' || v_order.code,
         'production_order',
         v_order.id,
         auth.uid()
  from public.bom_items bi
  join public.items i on i.id = bi.material_id
  where bi.bom_id = v_bom.id;

  insert into public.stock_movements
    (item_id, type, quantity, unit_price, note, reference_type, reference_id, created_by)
  values
    (v_order.product_id, 'san_xuat_nhap', v_actual_quantity, v_unit_cost,
     'Nhập thành phẩm từ lệnh ' || v_order.code || ' (thực tế: ' || v_actual_quantity || ', hao hụt: ' || v_waste_quantity || ')',
     'production_order', v_order.id, auth.uid());

  update public.production_orders
  set status = 'hoan_thanh',
      actual_quantity = v_actual_quantity,
      waste_quantity = v_waste_quantity,
      material_cost = v_material_cost,
      labor_cost = v_labor_cost,
      other_cost = v_other_cost,
      total_cost = v_total_cost,
      unit_cost = v_unit_cost,
      note = case when p_note is not null and p_note <> '' then p_note else note end,
      completed_at = now()
  where id = p_order_id;

  return v_total_cost;
end;
$$;

grant execute on function public.create_stock_movement(
  uuid, public.movement_type, numeric, numeric, uuid, text
) to authenticated;

grant execute on function public.save_bom(uuid, numeric, text, jsonb) to authenticated;
grant execute on function public.confirm_production(uuid, numeric, numeric, numeric, numeric, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 9. Ghi chú vận hành
-- ---------------------------------------------------------------------------
-- Sau khi tạo user trong Authentication > Users, cấp quyền Admin bằng:
--   update public.profiles set role = 'admin' where id = '<UUID user>';
-- Các vai trò hợp lệ: admin | kho | san_xuat | ke_toan

-- ---------------------------------------------------------------------------
-- 10. Nhân sự: hồ sơ mở rộng, nhiệm vụ, chấm công, lương theo ngày công
-- ---------------------------------------------------------------------------

-- 10.1 Mở rộng hồ sơ nhân viên (email là bản sao hiển thị từ auth.users,
--      được đồng bộ bởi trigger tạo user và action đổi email).
alter table public.profiles
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists job_title text,
  add column if not exists date_of_birth date,
  add column if not exists start_date date,
  add column if not exists daily_wage numeric(14, 2) not null default 0,
  add column if not exists active boolean not null default true;

-- Sao email từ auth.users sang các hồ sơ đã tồn tại (chạy một lần, bỏ qua null).
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

-- Trigger tạo hồ sơ: nay kèm email.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 10.2 Trạng thái nhiệm vụ
do $$ begin
  create type public.task_status as enum ('can_lam', 'hoan_thanh');
exception when duplicate_object then null; end $$;

-- 10.3 Nhiệm vụ hằng ngày (admin giao, nhân viên tự tích hoàn thành)
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  due_date date not null default current_date,
  status public.task_status not null default 'can_lam',
  completed_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists tasks_employee_idx
  on public.tasks (employee_id, due_date desc);

-- 10.4 Chấm công theo ngày (hỗ trợ nửa ngày: 0.5, 1, 1.5, 2)
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles (id) on delete cascade,
  work_date date not null,
  days numeric(4, 2) not null default 1 check (days >= 0 and days <= 2),
  note text,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (employee_id, work_date)
);

create index if not exists attendance_date_idx
  on public.attendance (work_date desc);

-- 10.5 Điều chỉnh lương (thưởng dương / khấu trừ, tạm ứng âm) theo kỳ YYYY-MM
create table if not exists public.payroll_adjustments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles (id) on delete cascade,
  period text not null,
  amount numeric(14, 2) not null,
  description text,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists payroll_adjustments_period_idx
  on public.payroll_adjustments (period, employee_id);

-- 10.6 RLS nhân sự
alter table public.tasks enable row level security;
alter table public.attendance enable row level security;
alter table public.payroll_adjustments enable row level security;

-- Nhiệm vụ: nhân viên thấy/sửa việc của mình, admin toàn quyền.
drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select" on public.tasks
  for select to authenticated
  using (employee_id = auth.uid() or public.is_admin());

drop policy if exists "tasks_insert" on public.tasks;
create policy "tasks_insert" on public.tasks
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "tasks_update" on public.tasks;
create policy "tasks_update" on public.tasks
  for update to authenticated
  using (employee_id = auth.uid() or public.is_admin())
  with check (employee_id = auth.uid() or public.is_admin());

drop policy if exists "tasks_delete" on public.tasks;
create policy "tasks_delete" on public.tasks
  for delete to authenticated
  using (public.is_admin());

-- Chấm công & điều chỉnh lương: chỉ Admin.
drop policy if exists "attendance_admin" on public.attendance;
create policy "attendance_admin" on public.attendance
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "payroll_adjustments_admin" on public.payroll_adjustments;
create policy "payroll_adjustments_admin" on public.payroll_adjustments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 10.7 RPC tính lương theo ngày công cho một kỳ (YYYY-MM).
--      base = tổng ngày công × lương/ngày; net = base + tổng điều chỉnh.
create or replace function public.calculate_payroll(p_period text)
returns table (
  employee_id uuid,
  full_name text,
  job_title text,
  role public.user_role,
  total_days numeric,
  daily_wage numeric,
  base_salary numeric,
  adjustments numeric,
  net_salary numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Bạn không có quyền xem bảng lương';
  end if;

  return query
  with att as (
    select a.employee_id, coalesce(sum(a.days), 0) as total_days
    from public.attendance a
    where to_char(a.work_date, 'YYYY-MM') = p_period
    group by a.employee_id
  ),
  adj as (
    select pa.employee_id, coalesce(sum(pa.amount), 0) as total_adj
    from public.payroll_adjustments pa
    where pa.period = p_period
    group by pa.employee_id
  )
  select
    p.id,
    p.full_name,
    p.job_title,
    p.role,
    coalesce(att.total_days, 0),
    p.daily_wage,
    round(coalesce(att.total_days, 0) * p.daily_wage, 2),
    coalesce(adj.total_adj, 0),
    round(coalesce(att.total_days, 0) * p.daily_wage + coalesce(adj.total_adj, 0), 2)
  from public.profiles p
  left join att on att.employee_id = p.id
  left join adj on adj.employee_id = p.id
  where p.active
  order by p.full_name;
end;
$$;

grant execute on function public.calculate_payroll(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 11. Bán hàng & Khách hàng
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.sales_order_status as enum ('cho_xac_nhan', 'da_giao', 'huy');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('chua_thanh_toan', 'thanh_toan_mot_phan', 'da_thanh_toan');
exception when duplicate_object then null; end $$;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('KH' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))),
  name text not null,
  phone text,
  address text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.sales_orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default (
    'DHB-' || to_char(now(), 'YYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 5))
  ),
  customer_id uuid not null references public.customers (id) on delete restrict,
  order_date date not null default current_date,
  delivery_date date,
  status public.sales_order_status not null default 'cho_xac_nhan',
  total_amount numeric(14, 2) not null default 0 check (total_amount >= 0),
  paid_amount numeric(14, 2) not null default 0 check (paid_amount >= 0),
  payment_status public.payment_status not null default 'chua_thanh_toan',
  note text,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.sales_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.sales_orders (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete restrict,
  quantity numeric(14, 3) not null check (quantity > 0),
  unit_price numeric(14, 2) not null default 0 check (unit_price >= 0),
  total_price numeric(14, 2) not null default 0 check (total_price >= 0),
  unique (order_id, item_id)
);

create index if not exists sales_orders_customer_idx on public.sales_orders (customer_id, order_date desc);
create index if not exists sales_order_items_order_idx on public.sales_order_items (order_id);

alter table public.customers enable row level security;
alter table public.sales_orders enable row level security;
alter table public.sales_order_items enable row level security;

-- Policies for customers
drop policy if exists "customers_select" on public.customers;
create policy "customers_select" on public.customers
  for select to authenticated using (true);

drop policy if exists "customers_write" on public.customers;
create policy "customers_write" on public.customers
  for all to authenticated
  using (public.my_role() in ('admin', 'ke_toan', 'kho'))
  with check (public.my_role() in ('admin', 'ke_toan', 'kho'));

-- Policies for sales_orders
drop policy if exists "sales_orders_select" on public.sales_orders;
create policy "sales_orders_select" on public.sales_orders
  for select to authenticated using (true);

drop policy if exists "sales_orders_write" on public.sales_orders;
create policy "sales_orders_write" on public.sales_orders
  for all to authenticated
  using (public.my_role() in ('admin', 'ke_toan'))
  with check (public.my_role() in ('admin', 'ke_toan'));

-- Policies for sales_order_items
drop policy if exists "sales_order_items_select" on public.sales_order_items;
create policy "sales_order_items_select" on public.sales_order_items
  for select to authenticated using (true);

drop policy if exists "sales_order_items_write" on public.sales_order_items;
create policy "sales_order_items_write" on public.sales_order_items
  for all to authenticated
  using (public.my_role() in ('admin', 'ke_toan'))
  with check (public.my_role() in ('admin', 'ke_toan'));

-- RPC Xác nhận xuất kho giao hàng cho đơn bán
create or replace function public.confirm_sales_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.sales_orders;
  v_item record;
  v_on_hand numeric;
begin
  if public.my_role() not in ('admin', 'ke_toan', 'kho') then
    raise exception 'Bạn không có quyền xác nhận giao hàng';
  end if;

  select * into v_order from public.sales_orders where id = p_order_id for update;
  if not found then
    raise exception 'Không tìm thấy đơn hàng';
  end if;

  if v_order.status <> 'cho_xac_nhan' then
    raise exception 'Đơn hàng này không ở trạng thái chờ xác nhận';
  end if;

  -- Kiểm tra và khóa các mặt hàng liên quan
  perform 1 from public.items
  where id in (select item_id from public.sales_order_items where order_id = p_order_id)
  order by id
  for update;

  for v_item in
    select soi.item_id, i.name, soi.quantity, soi.unit_price
    from public.sales_order_items soi
    join public.items i on i.id = soi.item_id
    where soi.order_id = p_order_id
  loop
    select coalesce(sum(quantity), 0) into v_on_hand
    from public.stock_movements where item_id = v_item.item_id;

    if v_on_hand < v_item.quantity then
      raise exception 'Hàng "%" không đủ tồn kho để xuất bán: cần %, chỉ còn %',
        v_item.name, v_item.quantity, v_on_hand;
    end if;

    -- Ghi phiếu xuất kho
    insert into public.stock_movements
      (item_id, type, quantity, unit_price, note, reference_type, reference_id, created_by)
    values
      (v_item.item_id, 'xuat', -v_item.quantity, v_item.unit_price,
       'Xuất bán theo đơn ' || v_order.code,
       'sales_order', v_order.id, auth.uid());
  end loop;

  update public.sales_orders
  set status = 'da_giao'
  where id = p_order_id;
end;
$$;

-- RPC Ghi nhận thanh toán đơn bán hàng
create or replace function public.pay_sales_order(
  p_order_id uuid,
  p_amount numeric,
  p_method public.payment_method default 'tien_mat',
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.sales_orders;
  v_new_paid numeric;
  v_status public.payment_status;
begin
  if public.my_role() not in ('admin', 'ke_toan') then
    raise exception 'Bạn không có quyền ghi nhận thanh toán';
  end if;

  if p_amount <= 0 then
    raise exception 'Số tiền thanh toán phải lớn hơn 0';
  end if;

  select * into v_order from public.sales_orders where id = p_order_id for update;
  if not found then
    raise exception 'Không tìm thấy đơn hàng';
  end if;

  v_new_paid := v_order.paid_amount + p_amount;
  if v_new_paid > v_order.total_amount then
    raise exception 'Số tiền thanh toán vượt quá tổng giá trị đơn hàng';
  end if;

  if v_new_paid >= v_order.total_amount then
    v_status := 'da_thanh_toan';
  else
    v_status := 'thanh_toan_mot_phan';
  end if;

  update public.sales_orders
  set paid_amount = v_new_paid,
      payment_status = v_status
  where id = p_order_id;

  -- Ghi nhận phiếu thu vào sổ quỹ
  insert into public.cash_transactions
    (type, amount, method, category, description, transaction_date, reference_type, reference_id, created_by)
  values
    ('thu', p_amount, p_method, 'Bán hàng',
     coalesce(p_note, 'Thu tiền đơn bán ' || v_order.code),
     current_date, 'sales_order', v_order.id, auth.uid());
end;
$$;

grant execute on function public.confirm_sales_order(uuid) to authenticated;
grant execute on function public.pay_sales_order(uuid, numeric, public.payment_method, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 12. Mua hàng (Purchase Orders)
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.purchase_order_status as enum ('cho_nhap_kho', 'da_nhap_kho', 'huy');
exception when duplicate_object then null; end $$;

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default (
    'DHN-' || to_char(now(), 'YYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 5))
  ),
  supplier_id uuid not null references public.suppliers (id) on delete restrict,
  order_date date not null default current_date,
  delivery_date date,
  status public.purchase_order_status not null default 'cho_nhap_kho',
  total_amount numeric(14, 2) not null default 0 check (total_amount >= 0),
  paid_amount numeric(14, 2) not null default 0 check (paid_amount >= 0),
  payment_status public.payment_status not null default 'chua_thanh_toan',
  note text,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.purchase_orders (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete restrict,
  quantity numeric(14, 3) not null check (quantity > 0),
  unit_price numeric(14, 2) not null default 0 check (unit_price >= 0),
  total_price numeric(14, 2) not null default 0 check (total_price >= 0),
  unique (order_id, item_id)
);

create index if not exists purchase_orders_supplier_idx on public.purchase_orders (supplier_id, order_date desc);
create index if not exists purchase_order_items_order_idx on public.purchase_order_items (order_id);

alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;

-- Policies
drop policy if exists "purchase_orders_select" on public.purchase_orders;
create policy "purchase_orders_select" on public.purchase_orders
  for select to authenticated using (true);

drop policy if exists "purchase_orders_write" on public.purchase_orders;
create policy "purchase_orders_write" on public.purchase_orders
  for all to authenticated
  using (public.my_role() in ('admin', 'kho', 'ke_toan'))
  with check (public.my_role() in ('admin', 'kho', 'ke_toan'));

drop policy if exists "purchase_order_items_select" on public.purchase_order_items;
create policy "purchase_order_items_select" on public.purchase_order_items
  for select to authenticated using (true);

drop policy if exists "purchase_order_items_write" on public.purchase_order_items;
create policy "purchase_order_items_write" on public.purchase_order_items
  for all to authenticated
  using (public.my_role() in ('admin', 'kho', 'ke_toan'))
  with check (public.my_role() in ('admin', 'kho', 'ke_toan'));

-- RPC Xác nhận nhập kho cho đơn mua
create or replace function public.confirm_purchase_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.purchase_orders;
  v_item record;
begin
  if public.my_role() not in ('admin', 'kho', 'ke_toan') then
    raise exception 'Bạn không có quyền xác nhận nhập kho';
  end if;

  select * into v_order from public.purchase_orders where id = p_order_id for update;
  if not found then
    raise exception 'Không tìm thấy đơn mua hàng';
  end if;

  if v_order.status <> 'cho_nhap_kho' then
    raise exception 'Đơn hàng này không ở trạng thái chờ nhập kho';
  end if;

  for v_item in
    select poi.item_id, poi.quantity, poi.unit_price
    from public.purchase_order_items poi
    where poi.order_id = p_order_id
  loop
    -- Ghi phiếu nhập kho
    insert into public.stock_movements
      (item_id, type, quantity, unit_price, supplier_id, note, reference_type, reference_id, created_by)
    values
      (v_item.item_id, 'nhap', v_item.quantity, v_item.unit_price, v_order.supplier_id,
       'Nhập kho theo đơn mua ' || v_order.code,
       'purchase_order', v_order.id, auth.uid());
  end loop;

  update public.purchase_orders
  set status = 'da_nhap_kho'
  where id = p_order_id;
end;
$$;

-- RPC Thanh toán tiền mua hàng
create or replace function public.pay_purchase_order(
  p_order_id uuid,
  p_amount numeric,
  p_method public.payment_method default 'tien_mat',
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.purchase_orders;
  v_new_paid numeric;
  v_status public.payment_status;
begin
  if public.my_role() not in ('admin', 'ke_toan') then
    raise exception 'Bạn không có quyền thanh toán đơn mua hàng';
  end if;

  if p_amount <= 0 then
    raise exception 'Số tiền thanh toán phải lớn hơn 0';
  end if;

  select * into v_order from public.purchase_orders where id = p_order_id for update;
  if not found then
    raise exception 'Không tìm thấy đơn mua hàng';
  end if;

  v_new_paid := v_order.paid_amount + p_amount;
  if v_new_paid > v_order.total_amount then
    raise exception 'Số tiền thanh toán vượt quá giá trị đơn mua hàng';
  end if;

  if v_new_paid >= v_order.total_amount then
    v_status := 'da_thanh_toan';
  else
    v_status := 'thanh_toan_mot_phan';
  end if;

  update public.purchase_orders
  set paid_amount = v_new_paid,
      payment_status = v_status
  where id = p_order_id;

  -- Ghi nhận phiếu chi vào sổ quỹ
  insert into public.cash_transactions
    (type, amount, method, category, description, transaction_date, reference_type, reference_id, created_by)
  values
    ('chi', p_amount, p_method, 'Mua nguyên liệu',
     coalesce(p_note, 'Chi thanh toán đơn mua ' || v_order.code),
     current_date, 'purchase_order', v_order.id, auth.uid());
end;
$$;

grant execute on function public.confirm_purchase_order(uuid) to authenticated;
grant execute on function public.pay_purchase_order(uuid, numeric, public.payment_method, text) to authenticated;
