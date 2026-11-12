-- ============================================================================
-- VƯỢNG PHÁT INK — TẠO BẢNG KHÁCH HÀNG & ĐƠN BÁN HÀNG TRÊN SUPABASE
-- Hướng dẫn: Mở Supabase Dashboard > SQL Editor > Dán toàn bộ nội dung này và bấm "Run" (hoặc Ctrl + Enter).
-- ============================================================================

-- 1. Kiểu dữ liệu / Enums & Cột quy cách đóng gói
do $$ begin
  create type public.payment_status as enum ('chua_thanh_toan', 'thanh_toan_mot_phan', 'da_thanh_toan');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sales_order_status as enum ('cho_xac_nhan', 'da_giao', 'huy');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.purchase_order_status as enum ('cho_nhap_kho', 'da_nhap_kho', 'huy');
exception when duplicate_object then null; end $$;

-- Bổ sung cột quy cách đóng gói cho bảng hàng hóa items
alter table public.items add column if not exists packing_spec text;
alter table public.items add column if not exists pack_size numeric(14, 3);
alter table public.items add column if not exists pack_unit text;

-- 2. Bảng khách hàng (Customers)
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('KH' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))),
  name text not null,
  phone text,
  address text,
  note text,
  created_at timestamptz not null default now()
);

-- 3. Bảng đơn bán hàng (Sales Orders)
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

-- 4. Bảng chi tiết đơn bán hàng (Sales Order Items)
create table if not exists public.sales_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.sales_orders (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete restrict,
  quantity numeric(14, 3) not null check (quantity > 0),
  unit_price numeric(14, 2) not null default 0 check (unit_price >= 0),
  total_price numeric(14, 2) not null default 0 check (total_price >= 0),
  unique (order_id, item_id)
);

-- 5. Bảng đơn mua hàng (Purchase Orders) nếu dùng
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

-- 6. Chỉ mục (Indexes)
create index if not exists sales_orders_customer_idx on public.sales_orders (customer_id, order_date desc);
create index if not exists sales_order_items_order_idx on public.sales_order_items (order_id);
create index if not exists purchase_orders_supplier_idx on public.purchase_orders (supplier_id, order_date desc);
create index if not exists purchase_order_items_order_idx on public.purchase_order_items (order_id);

-- 7. Kích hoạt Row Level Security (RLS) & Thiết lập Policies
alter table public.customers enable row level security;
alter table public.sales_orders enable row level security;
alter table public.sales_order_items enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;

-- Policies cho customers
drop policy if exists "customers_select" on public.customers;
create policy "customers_select" on public.customers for select to authenticated using (true);
drop policy if exists "customers_write" on public.customers;
create policy "customers_write" on public.customers for all to authenticated using (true) with check (true);

-- Policies cho sales_orders
drop policy if exists "sales_orders_select" on public.sales_orders;
create policy "sales_orders_select" on public.sales_orders for select to authenticated using (true);
drop policy if exists "sales_orders_write" on public.sales_orders;
create policy "sales_orders_write" on public.sales_orders for all to authenticated using (true) with check (true);

-- Policies cho sales_order_items
drop policy if exists "sales_order_items_select" on public.sales_order_items;
create policy "sales_order_items_select" on public.sales_order_items for select to authenticated using (true);
drop policy if exists "sales_order_items_write" on public.sales_order_items;
create policy "sales_order_items_write" on public.sales_order_items for all to authenticated using (true) with check (true);

-- Policies cho purchase_orders
drop policy if exists "purchase_orders_select" on public.purchase_orders;
create policy "purchase_orders_select" on public.purchase_orders for select to authenticated using (true);
drop policy if exists "purchase_orders_write" on public.purchase_orders;
create policy "purchase_orders_write" on public.purchase_orders for all to authenticated using (true) with check (true);

-- Policies cho purchase_order_items
drop policy if exists "purchase_order_items_select" on public.purchase_order_items;
create policy "purchase_order_items_select" on public.purchase_order_items for select to authenticated using (true);
drop policy if exists "purchase_order_items_write" on public.purchase_order_items;
create policy "purchase_order_items_write" on public.purchase_order_items for all to authenticated using (true) with check (true);

-- 8. Hàm xác nhận xuất kho đơn bán (RPC confirm_sales_order)
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

-- 9. Hàm ghi nhận thanh toán đơn bán (RPC pay_sales_order)
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

-- 10. Chèn sẵn khách hàng mẫu và khách hàng bác vừa nhập để có dữ liệu ngay lập tức
insert into public.customers (code, name, phone, address, note)
values
  ('KH3669', 'CÔNG TY CỔ PHẦN BAO BÌ DẦU KHÍ VIỆT NAM', null, 'Lô A1-3,KCN Trà Kha, Phường Bạc Liêu, Tỉnh Cà Mau', null),
  ('KH001', 'Chuỗi Cửa Hàng Bánh ABC', '0938 111 222', '150 Nguyễn Trãi, Quận 1, TP.HCM', 'Đại lý phân phối bánh mì bơ'),
  ('KH002', 'Tiệm Trà & Cafe Hướng Dương', '0909 333 555', '24 Lê Duẩn, Quận 1, TP.HCM', 'Đơn đặt bánh kem sự kiện'),
  ('KH003', 'Siêu thị Mini Sài Gòn Mart', '0918 777 999', '88 Võ Thị Sáu, Quận 3, TP.HCM', 'Giao hàng vào sáng sớm')
on conflict (code) do nothing;
