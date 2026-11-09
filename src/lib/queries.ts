import { isSupabaseConfigured } from "@/lib/config";
import {
  demoBoms,
  demoCash,
  demoDashboard,
  demoInventory,
  demoItems,
  demoMovements,
  demoOrders,
  demoSuppliers,
} from "@/lib/demo/store";
import { lastMonths, monthKey, periodBounds, startOfMonthISO, todayISO } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  AttendanceRow,
  AttendanceSummary,
  BomLine,
  BomRow,
  CashFilter,
  CashRow,
  DashboardData,
  Employee,
  InventoryItem,
  Item,
  ItemType,
  MovementRow,
  PayrollAdjustmentRow,
  PayrollRow,
  ProductionRow,
  StockMovement,
  Supplier,
  TaskRow,
} from "@/lib/types";

const num = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

function safeSearch(value?: string): string | null {
  const cleaned = value?.replace(/[,()*%]/g, " ").trim();
  return cleaned ? cleaned : null;
}

type DbInventory = {
  id: string;
  code: string;
  name: string;
  unit: string;
  type: ItemType;
  unit_price: number | string;
  min_stock: number | string;
  created_at: string;
  on_hand: number | string;
};

export async function getInventory(search?: string): Promise<InventoryItem[]> {
  if (!isSupabaseConfigured()) return demoInventory(search);

  const supabase = await createSupabaseServerClient();
  let query = supabase.from("item_stock").select("*").order("name");
  const keyword = safeSearch(search);
  if (keyword) {
    query = query.or(`name.ilike.%${keyword}%,code.ilike.%${keyword}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as DbInventory[]).map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    unit: row.unit,
    type: row.type,
    unit_price: num(row.unit_price),
    min_stock: num(row.min_stock),
    created_at: row.created_at,
    on_hand: num(row.on_hand),
  }));
}

export async function getItems(type?: ItemType): Promise<Item[]> {
  if (!isSupabaseConfigured()) return demoItems(type);

  const supabase = await createSupabaseServerClient();
  let query = supabase.from("items").select("*").order("name");
  if (type) query = query.eq("type", type);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return ((data ?? []) as Item[]).map((item) => ({
    ...item,
    unit_price: num(item.unit_price),
    min_stock: num(item.min_stock),
  }));
}

export async function getSuppliers(): Promise<Supplier[]> {
  if (!isSupabaseConfigured()) return demoSuppliers();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .order("name");

  if (error) throw new Error(error.message);
  return (data ?? []) as Supplier[];
}

type DbMovement = StockMovement & {
  items: { name: string; code: string; unit: string } | null;
  suppliers: { name: string } | null;
  profiles: { full_name: string } | null;
};

export async function getMovements(limit = 150): Promise<MovementRow[]> {
  if (!isSupabaseConfigured()) return demoMovements(limit);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("stock_movements")
    .select(
      "*, items(name, code, unit), suppliers(name), profiles(full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as DbMovement[]).map((row) => ({
    ...row,
    quantity: num(row.quantity),
    unit_price: num(row.unit_price),
    item_name: row.items?.name ?? "—",
    item_code: row.items?.code ?? "—",
    item_unit: row.items?.unit ?? "",
    supplier_name: row.suppliers?.name ?? null,
    created_by_name: row.profiles?.full_name ?? null,
  }));
}

type DbBom = {
  id: string;
  product_id: string;
  output_quantity: number | string;
  note: string | null;
  created_at: string;
  updated_at: string;
  items: { name: string; code: string; unit: string } | null;
  bom_items: Array<{
    id: string;
    bom_id: string;
    material_id: string;
    quantity: number | string;
    items: {
      name: string;
      code: string;
      unit: string;
      unit_price: number | string;
    } | null;
  }>;
};

export async function getBoms(): Promise<BomRow[]> {
  if (!isSupabaseConfigured()) return demoBoms();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("boms")
    .select(
      "*, items(name, code, unit), bom_items(*, items(name, code, unit, unit_price))",
    )
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as DbBom[]).map((bom) => {
    const items: BomLine[] = (bom.bom_items ?? []).map((line) => ({
      id: line.id,
      bom_id: line.bom_id,
      material_id: line.material_id,
      quantity: num(line.quantity),
      material_name: line.items?.name ?? "—",
      material_code: line.items?.code ?? "—",
      material_unit: line.items?.unit ?? "",
      material_unit_price: num(line.items?.unit_price),
    }));

    return {
      id: bom.id,
      product_id: bom.product_id,
      output_quantity: num(bom.output_quantity),
      note: bom.note,
      created_at: bom.created_at,
      updated_at: bom.updated_at,
      product_name: bom.items?.name ?? "—",
      product_code: bom.items?.code ?? "—",
      product_unit: bom.items?.unit ?? "",
      items,
    };
  });
}

type DbOrder = {
  id: string;
  code: string;
  product_id: string;
  quantity: number | string;
  status: ProductionRow["status"];
  planned_date: string;
  completed_at: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
  items: { name: string; code: string; unit: string } | null;
};

export async function getProductionOrders(): Promise<ProductionRow[]> {
  if (!isSupabaseConfigured()) return demoOrders();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("production_orders")
    .select("*, items(name, code, unit)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as DbOrder[]).map((order) => ({
    ...order,
    quantity: num(order.quantity),
    product_name: order.items?.name ?? "—",
    product_code: order.items?.code ?? "—",
    product_unit: order.items?.unit ?? "",
  }));
}

type DbCash = Omit<CashRow, "created_by_name"> & {
  profiles: { full_name: string } | null;
};

export async function getCashTransactions(filter: CashFilter = {}): Promise<CashRow[]> {
  if (!isSupabaseConfigured()) return demoCash(filter);

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("cash_transactions")
    .select("*, profiles(full_name)")
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (filter.from) query = query.gte("transaction_date", filter.from);
  if (filter.to) query = query.lte("transaction_date", filter.to);
  if (filter.type && filter.type !== "all") query = query.eq("type", filter.type);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as DbCash[]).map((row) => ({
    ...row,
    amount: num(row.amount),
    created_by_name: row.profiles?.full_name ?? null,
  }));
}

export async function getDashboardData(): Promise<DashboardData> {
  if (!isSupabaseConfigured()) return demoDashboard();

  const supabase = await createSupabaseServerClient();
  const start = startOfMonthISO(5);
  const today = todayISO();

  const [stockResult, balanceResult, ordersResult, cashResult] =
    await Promise.all([
      supabase.from("item_stock").select("on_hand, unit_price, min_stock"),
      supabase.from("cash_balance").select("balance").maybeSingle(),
      supabase
        .from("production_orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "cho_xac_nhan")
        .lte("planned_date", today),
      supabase
        .from("cash_transactions")
        .select("type, amount, transaction_date")
        .gte("transaction_date", start),
    ]);

  if (stockResult.error) throw new Error(stockResult.error.message);
  if (balanceResult.error) throw new Error(balanceResult.error.message);
  if (ordersResult.error) throw new Error(ordersResult.error.message);
  if (cashResult.error) throw new Error(cashResult.error.message);

  const stock = (stockResult.data ?? []) as Array<{
    on_hand: number | string;
    unit_price: number | string;
    min_stock: number | string;
  }>;

  const totalStockValue = stock.reduce(
    (total, row) =>
      total + Math.max(num(row.on_hand), 0) * num(row.unit_price),
    0,
  );

  const lowStockCount = stock.filter(
    (row) => num(row.min_stock) > 0 && num(row.on_hand) < num(row.min_stock),
  ).length;

  const monthlyMap = new Map(
    lastMonths(6).map((month) => [month.key, { ...month, thu: 0, chi: 0 }]),
  );

  for (const row of (cashResult.data ?? []) as Array<{
    type: "thu" | "chi";
    amount: number | string;
    transaction_date: string;
  }>) {
    const bucket = monthlyMap.get(monthKey(`${row.transaction_date}T00:00:00`));
    if (!bucket) continue;
    if (row.type === "thu") bucket.thu += num(row.amount);
    else bucket.chi += num(row.amount);
  }

  return {
    totalStockValue,
    cashBalance: num(
      (balanceResult.data as { balance?: number | string } | null)?.balance,
    ),
    pendingOrdersToday: ordersResult.count ?? 0,
    lowStockCount,
    monthly: Array.from(monthlyMap.values()),
  };
}

// --- Nhân sự ---------------------------------------------------------------
// Phân hệ nhân sự cần Supabase thật (Admin API cho tài khoản). Ở chế độ demo
// (chưa cấu hình Supabase) các truy vấn trả về danh sách rỗng để trang hiển thị
// trạng thái trống.

type DbEmployee = Omit<Employee, "daily_wage"> & {
  daily_wage: number | string;
};

export async function getEmployees(): Promise<Employee[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name");

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as DbEmployee[]).map((row) => ({
    ...row,
    daily_wage: num(row.daily_wage),
  }));
}

type DbTask = TaskRow & {
  employee: { full_name: string } | null;
  creator: { full_name: string } | null;
};

export async function getTasks(employeeId?: string): Promise<TaskRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("tasks")
    .select(
      "*, employee:profiles!tasks_employee_id_fkey(full_name), creator:profiles!tasks_created_by_fkey(full_name)",
    )
    .order("due_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (employeeId) query = query.eq("employee_id", employeeId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as DbTask[]).map((row) => ({
    ...row,
    employee_name: row.employee?.full_name ?? "—",
    created_by_name: row.creator?.full_name ?? null,
  }));
}

type DbAttendance = AttendanceRow & {
  employee: { full_name: string } | null;
};

export async function getAttendance(period?: string): Promise<AttendanceRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("attendance")
    .select("*, employee:profiles!attendance_employee_id_fkey(full_name)")
    .order("work_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (period) {
    const { from, to } = periodBounds(period);
    query = query.gte("work_date", from).lte("work_date", to);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as DbAttendance[]).map((row) => ({
    ...row,
    days: num(row.days),
    employee_name: row.employee?.full_name ?? "—",
  }));
}

export async function getAttendanceSummary(
  period: string,
): Promise<AttendanceSummary[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createSupabaseServerClient();
  const { from, to } = periodBounds(period);
  const { data, error } = await supabase
    .from("attendance")
    .select(
      "employee_id, days, employee:profiles!attendance_employee_id_fkey(full_name, job_title)",
    )
    .gte("work_date", from)
    .lte("work_date", to);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as Array<{
    employee_id: string;
    days: number | string;
    employee: { full_name: string; job_title: string | null } | null;
  }>;

  const map = new Map<string, AttendanceSummary>();
  for (const row of rows) {
    const existing = map.get(row.employee_id);
    if (existing) {
      existing.total_days += num(row.days);
    } else {
      map.set(row.employee_id, {
        employee_id: row.employee_id,
        full_name: row.employee?.full_name ?? "—",
        job_title: row.employee?.job_title ?? null,
        total_days: num(row.days),
      });
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.full_name.localeCompare(b.full_name, "vi"),
  );
}

type DbPayroll = Omit<
  PayrollRow,
  "total_days" | "daily_wage" | "base_salary" | "adjustments" | "net_salary"
> & {
  total_days: number | string;
  daily_wage: number | string;
  base_salary: number | string;
  adjustments: number | string;
  net_salary: number | string;
};

export async function getPayroll(period: string): Promise<PayrollRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("calculate_payroll", {
    p_period: period,
  });
  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as DbPayroll[]).map((row) => ({
    ...row,
    total_days: num(row.total_days),
    daily_wage: num(row.daily_wage),
    base_salary: num(row.base_salary),
    adjustments: num(row.adjustments),
    net_salary: num(row.net_salary),
  }));
}

type DbAdjustment = PayrollAdjustmentRow & {
  employee: { full_name: string } | null;
};

export async function getPayrollAdjustments(
  period?: string,
): Promise<PayrollAdjustmentRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("payroll_adjustments")
    .select(
      "*, employee:profiles!payroll_adjustments_employee_id_fkey(full_name)",
    )
    .order("created_at", { ascending: false });
  if (period) query = query.eq("period", period);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as DbAdjustment[]).map((row) => ({
    ...row,
    amount: num(row.amount),
    employee_name: row.employee?.full_name ?? "—",
  }));
}
