export const ROLES = ["admin", "kho", "san_xuat", "ke_toan"] as const;
export type Role = (typeof ROLES)[number];

export type ItemType = "nguyen_lieu" | "thanh_pham";

export type MovementType =
  | "nhap"
  | "xuat"
  | "dieu_chinh"
  | "san_xuat_tieu_hao"
  | "san_xuat_nhap";

export type ProductionStatus = "cho_xac_nhan" | "hoan_thanh" | "huy";

export type CashType = "thu" | "chi";

export type PaymentMethod = "tien_mat" | "ngan_hang";

export type Item = {
  id: string;
  code: string;
  name: string;
  unit: string;
  type: ItemType;
  unit_price: number;
  min_stock: number;
  created_at: string;
};

export type InventoryItem = Item & {
  on_hand: number;
};

export type Supplier = {
  id: string;
  name: string;
  phone: string | null;
  note: string | null;
  created_at: string;
};

export type StockMovement = {
  id: string;
  item_id: string;
  type: MovementType;
  quantity: number;
  unit_price: number;
  supplier_id: string | null;
  note: string | null;
  reference_type: string | null;
  reference_id: string | null;
  created_by: string | null;
  created_at: string;
};

export type MovementRow = StockMovement & {
  item_name: string;
  item_code: string;
  item_unit: string;
  supplier_name: string | null;
  created_by_name: string | null;
};

export type Bom = {
  id: string;
  product_id: string;
  output_quantity: number;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type BomItem = {
  id: string;
  bom_id: string;
  material_id: string;
  quantity: number;
};

export type BomLine = BomItem & {
  material_name: string;
  material_code: string;
  material_unit: string;
  material_unit_price: number;
};

export type BomRow = Bom & {
  product_name: string;
  product_code: string;
  product_unit: string;
  items: BomLine[];
};

export type ProductionOrder = {
  id: string;
  code: string;
  product_id: string;
  quantity: number;
  status: ProductionStatus;
  planned_date: string;
  completed_at: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

export type ProductionRow = ProductionOrder & {
  product_name: string;
  product_code: string;
  product_unit: string;
};

export type CashTransaction = {
  id: string;
  type: CashType;
  amount: number;
  method: PaymentMethod;
  category: string;
  description: string | null;
  transaction_date: string;
  reference_type: string | null;
  reference_id: string | null;
  created_by: string | null;
  created_at: string;
};

export type CashRow = CashTransaction & {
  created_by_name: string | null;
};

export type CashFilter = {
  from?: string;
  to?: string;
  type?: CashType | "all";
};

export type DashboardData = {
  totalStockValue: number;
  cashBalance: number;
  pendingOrdersToday: number;
  lowStockCount: number;
  monthly: {
    key: string;
    label: string;
    thu: number;
    chi: number;
  }[];
};

export type AppUser = {
  id: string;
  name: string;
  email: string | null;
  role: Role;
  isDemo: boolean;
};

export type TaskStatus = "can_lam" | "hoan_thanh";

export type Employee = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  job_title: string | null;
  date_of_birth: string | null;
  start_date: string | null;
  daily_wage: number;
  active: boolean;
  role: Role;
  created_at: string;
};

export type Task = {
  id: string;
  employee_id: string;
  title: string;
  description: string | null;
  due_date: string;
  status: TaskStatus;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
};

export type TaskRow = Task & {
  employee_name: string;
  created_by_name: string | null;
};

export type Attendance = {
  id: string;
  employee_id: string;
  work_date: string;
  days: number;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

export type AttendanceRow = Attendance & {
  employee_name: string;
};

export type AttendanceSummary = {
  employee_id: string;
  full_name: string;
  job_title: string | null;
  total_days: number;
};

export type PayrollAdjustment = {
  id: string;
  employee_id: string;
  period: string;
  amount: number;
  description: string | null;
  created_by: string | null;
  created_at: string;
};

export type PayrollAdjustmentRow = PayrollAdjustment & {
  employee_name: string;
};

export type PayrollRow = {
  employee_id: string;
  full_name: string;
  job_title: string | null;
  role: Role;
  total_days: number;
  daily_wage: number;
  base_salary: number;
  adjustments: number;
  net_salary: number;
};
