-- ============================================================================
-- VƯƠNG PHÁT ERP — SCRIPT CẬP NHẬT DATABASE (GIAI ĐOẠN 2 & GIAI ĐOẠN 3)
-- Dành cho cơ sở dữ liệu Supabase đã chạy schema ban đầu.
-- Mở Supabase Dashboard > SQL Editor > Dán toàn bộ nội dung này và bấm "Run".
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. KIỂU DỮ LIỆU & ENUMS MỚI (NẾU CHƯA CÓ)
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.payment_status as enum ('chua_thanh_toan', 'thanh_toan_mot_phan', 'da_thanh_toan');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sales_order_status as enum ('cho_xac_nhan', 'da_giao', 'huy');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.purchase_order_status as enum ('cho_xac_nhan', 'da_nhap', 'huy');
exception when duplicate_object then null; end $$;

-- Thêm giá trị 'ban_thanh_pham' vào item_type enum nếu chưa có
alter type public.item_type add value if not exists 'ban_thanh_pham';

-- Thêm các cột quy cách đóng gói cho hàng hóa (đặc biệt là thành phẩm)
alter table public.items add column if not exists packing_spec text;
alter table public.items add column if not exists pack_size numeric(14, 3);
alter table public.items add column if not exists pack_unit text;

-- ---------------------------------------------------------------------------
-- 2. BẢNG KHÁCH HÀNG & ĐƠN BÁN HÀNG
-- ---------------------------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default (
    'KH-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
  ),
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
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
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
  created_at timestamptz not null default now()
);

create index if not exists sales_orders_customer_idx on public.sales_orders (customer_id, order_date desc);
create index if not exists sales_order_items_order_idx on public.sales_order_items (order_id);

-- ---------------------------------------------------------------------------
-- 3. BẢNG ĐƠN MUA HÀNG (PURCHASE ORDERS)
-- ---------------------------------------------------------------------------
create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default (
    'DHM-' || to_char(now(), 'YYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
  ),
  supplier_id uuid not null references public.suppliers (id) on delete restrict,
  order_date date not null default current_date,
  delivery_date date,
  status public.purchase_order_status not null default 'cho_xac_nhan',
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
  created_at timestamptz not null default now()
);

create index if not exists purchase_orders_supplier_idx on public.purchase_orders (supplier_id, order_date desc);
create index if not exists purchase_order_items_order_idx on public.purchase_order_items (order_id);

-- ---------------------------------------------------------------------------
-- 4. BỔ SUNG CÁC CỘT GIÁ THÀNH & HAO HỤT VÀO PRODUCTION_ORDERS
-- ---------------------------------------------------------------------------
alter table public.production_orders add column if not exists actual_quantity numeric(14, 3);
alter table public.production_orders add column if not exists waste_quantity numeric(14, 3) not null default 0;
alter table public.production_orders add column if not exists material_cost numeric(14, 2) not null default 0;
alter table public.production_orders add column if not exists labor_cost numeric(14, 2) not null default 0;
alter table public.production_orders add column if not exists other_cost numeric(14, 2) not null default 0;
alter table public.production_orders add column if not exists total_cost numeric(14, 2) not null default 0;
alter table public.production_orders add column if not exists unit_cost numeric(14, 2) not null default 0;

-- ---------------------------------------------------------------------------
-- 5. PHÂN QUYỀN RLS
-- ---------------------------------------------------------------------------
alter table public.customers enable row level security;
alter table public.sales_orders enable row level security;
alter table public.sales_order_items enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;

-- Customers
drop policy if exists "customers_select" on public.customers;
create policy "customers_select" on public.customers for select to authenticated using (true);

drop policy if exists "customers_write" on public.customers;
create policy "customers_write" on public.customers for all to authenticated
  using (public.my_role() in ('admin', 'ke_toan', 'kho'))
  with check (public.my_role() in ('admin', 'ke_toan', 'kho'));

-- Sales Orders
drop policy if exists "sales_orders_select" on public.sales_orders;
create policy "sales_orders_select" on public.sales_orders for select to authenticated using (true);

drop policy if exists "sales_orders_write" on public.sales_orders;
create policy "sales_orders_write" on public.sales_orders for all to authenticated
  using (public.my_role() in ('admin', 'ke_toan'))
  with check (public.my_role() in ('admin', 'ke_toan'));

-- Sales Order Items
drop policy if exists "sales_order_items_select" on public.sales_order_items;
create policy "sales_order_items_select" on public.sales_order_items for select to authenticated using (true);

drop policy if exists "sales_order_items_write" on public.sales_order_items;
create policy "sales_order_items_write" on public.sales_order_items for all to authenticated
  using (public.my_role() in ('admin', 'ke_toan'))
  with check (public.my_role() in ('admin', 'ke_toan'));

-- Purchase Orders
drop policy if exists "purchase_orders_select" on public.purchase_orders;
create policy "purchase_orders_select" on public.purchase_orders for select to authenticated using (true);

drop policy if exists "purchase_orders_write" on public.purchase_orders;
create policy "purchase_orders_write" on public.purchase_orders for all to authenticated
  using (public.my_role() in ('admin', 'kho', 'ke_toan'))
  with check (public.my_role() in ('admin', 'kho', 'ke_toan'));

-- Purchase Order Items
drop policy if exists "purchase_order_items_select" on public.purchase_order_items;
create policy "purchase_order_items_select" on public.purchase_order_items for select to authenticated using (true);

drop policy if exists "purchase_order_items_write" on public.purchase_order_items;
create policy "purchase_order_items_write" on public.purchase_order_items for all to authenticated
  using (public.my_role() in ('admin', 'kho', 'ke_toan'))
  with check (public.my_role() in ('admin', 'kho', 'ke_toan'));

-- ---------------------------------------------------------------------------
-- 6. CÁC HÀM XỬ LÝ GIAO DỊCH (RPC FUNCTIONS)
-- ---------------------------------------------------------------------------

-- RPC: Xác nhận giao hàng đơn bán (Trừ kho tự động)
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

-- RPC: Thanh toán thu tiền đơn bán hàng (Ghi sổ quỹ thu)
create or replace function public.pay_sales_order(
  p_order_id uuid,
  p_amount numeric,
  p_method public.payment_method,
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
    raise exception 'Bạn không có quyền thu tiền đơn hàng';
  end if;

  select * into v_order from public.sales_orders where id = p_order_id for update;
  if not found then
    raise exception 'Không tìm thấy đơn hàng';
  end if;

  if p_amount <= 0 then
    raise exception 'Số tiền thanh toán phải lớn hơn 0';
  end if;

  if v_order.paid_amount + p_amount > v_order.total_amount then
    raise exception 'Số tiền thanh toán vượt quá giá trị đơn hàng';
  end if;

  v_new_paid := v_order.paid_amount + p_amount;
  if v_new_paid >= v_order.total_amount then
    v_status := 'da_thanh_toan';
  else
    v_status := 'thanh_toan_mot_phan';
  end if;

  update public.sales_orders
  set paid_amount = v_new_paid,
      payment_status = v_status
  where id = p_order_id;

  insert into public.cash_transactions
    (type, amount, method, category, description, transaction_date, reference_type, reference_id, created_by)
  values
    ('thu', p_amount, p_method, 'Thu tiền bán hàng',
     coalesce(p_note, 'Thu tiền cho đơn hàng ' || v_order.code),
     current_date, 'sales_order', v_order.id, auth.uid());
end;
$$;

-- RPC: Xác nhận nhập kho đơn mua hàng (Cộng tồn kho NVL tự động)
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
    raise exception 'Bạn không có quyền xác nhận nhập kho đơn mua';
  end if;

  select * into v_order from public.purchase_orders where id = p_order_id for update;
  if not found then
    raise exception 'Không tìm thấy đơn mua hàng';
  end if;

  if v_order.status <> 'cho_xac_nhan' then
    raise exception 'Đơn mua hàng không ở trạng thái chờ nhận hàng';
  end if;

  perform 1 from public.items
  where id in (select item_id from public.purchase_order_items where order_id = p_order_id)
  order by id
  for update;

  for v_item in
    select poi.item_id, i.name, poi.quantity, poi.unit_price
    from public.purchase_order_items poi
    join public.items i on i.id = poi.item_id
    where poi.order_id = p_order_id
  loop
    insert into public.stock_movements
      (item_id, type, quantity, unit_price, supplier_id, note, reference_type, reference_id, created_by)
    values
      (v_item.item_id, 'nhap', v_item.quantity, v_item.unit_price, v_order.supplier_id,
       'Nhập hàng theo đơn mua ' || v_order.code,
       'purchase_order', v_order.id, auth.uid());
  end loop;

  update public.purchase_orders
  set status = 'da_nhap'
  where id = p_order_id;
end;
$$;

-- RPC: Chi trả tiền đơn mua hàng cho Nhà cung cấp (Ghi sổ quỹ chi)
create or replace function public.pay_purchase_order(
  p_order_id uuid,
  p_amount numeric,
  p_method public.payment_method,
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
    raise exception 'Bạn không có quyền chi trả tiền đơn mua';
  end if;

  select * into v_order from public.purchase_orders where id = p_order_id for update;
  if not found then
    raise exception 'Không tìm thấy đơn mua hàng';
  end if;

  if p_amount <= 0 then
    raise exception 'Số tiền thanh toán phải lớn hơn 0';
  end if;

  if v_order.paid_amount + p_amount > v_order.total_amount then
    raise exception 'Số tiền thanh toán vượt quá số nợ đơn hàng';
  end if;

  v_new_paid := v_order.paid_amount + p_amount;
  if v_new_paid >= v_order.total_amount then
    v_status := 'da_thanh_toan';
  else
    v_status := 'thanh_toan_mot_phan';
  end if;

  update public.purchase_orders
  set paid_amount = v_new_paid,
      payment_status = v_status
  where id = p_order_id;

  insert into public.cash_transactions
    (type, amount, method, category, description, transaction_date, reference_type, reference_id, created_by)
  values
    ('chi', p_amount, p_method, 'Chi trả nhà cung cấp',
     coalesce(p_note, 'Chi tiền mua hàng theo đơn ' || v_order.code),
     current_date, 'purchase_order', v_order.id, auth.uid());
end;
$$;

-- RPC: Cập nhật hàm confirm_production tính giá thành & hao hụt thực tế
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

-- Cập nhật hàm save_bom hỗ trợ Bán thành phẩm làm đầu ra hoặc đầu vào BOM
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
    select 1 from public.items where id = p_product_id and type in ('thanh_pham', 'ban_thanh_pham')
  ) then
    raise exception 'Thành phẩm hoặc Bán thành phẩm không hợp lệ';
  end if;

  if p_output_quantity is null or p_output_quantity <= 0 then
    raise exception 'Số lượng đầu ra phải lớn hơn 0';
  end if;

  select count(*) into v_count
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb));

  if v_count = 0 then
    raise exception 'Công thức phải có ít nhất một nguyên liệu hoặc bán thành phẩm';
  end if;

  select count(*) into v_duplicates
  from (
    select value ->> 'material_id' as material_id
    from jsonb_array_elements(p_items)
    group by 1
    having count(*) > 1
  ) d;

  if v_duplicates > 0 then
    raise exception 'Thành phần bị lặp trong công thức';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) e
    where (e ->> 'material_id')::uuid = p_product_id
    or not exists (
      select 1 from public.items i
      where i.id = (e ->> 'material_id')::uuid and i.type in ('nguyen_lieu', 'ban_thanh_pham')
    )
    or coalesce((e ->> 'quantity')::numeric, 0) <= 0
  ) then
    raise exception 'Nguyên liệu, bán thành phẩm hoặc định lượng không hợp lệ';
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

-- Cấp quyền thực thi
grant execute on function public.save_bom(uuid, numeric, text, jsonb) to authenticated;
grant execute on function public.confirm_sales_order(uuid) to authenticated;
grant execute on function public.pay_sales_order(uuid, numeric, public.payment_method, text) to authenticated;
grant execute on function public.confirm_purchase_order(uuid) to authenticated;
grant execute on function public.pay_purchase_order(uuid, numeric, public.payment_method, text) to authenticated;
grant execute on function public.confirm_production(uuid, numeric, numeric, numeric, numeric, text) to authenticated;
