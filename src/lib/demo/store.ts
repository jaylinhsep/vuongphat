import type {
  Attendance,
  AttendanceRow,
  AttendanceSummary,
  Bom,
  BomItem,
  BomLine,
  BomRow,
  CashFilter,
  CashRow,
  CashTransaction,
  Customer,
  CustomerDebtRow,
  DashboardData,
  Employee,
  InventoryItem,
  Item,
  ItemType,
  MovementRow,
  MovementType,
  PaymentMethod,
  PaymentStatus,
  PayrollAdjustment,
  PayrollAdjustmentRow,
  PayrollRow,
  ProductionOrder,
  ProductionRow,
  ProductionCostReportRow,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderItemRow,
  PurchaseOrderRow,
  PurchaseOrderStatus,
  Role,
  SalesOrder,
  SalesOrderItem,
  SalesOrderItemRow,
  SalesOrderRow,
  SalesOrderStatus,
  StockMovement,
  Supplier,
  SupplierDebtRow,
  Task,
  TaskRow,
  TaskStatus,
} from "@/lib/types";
import { currentPeriod, lastMonths, monthKey, periodBounds, todayISO } from "@/lib/format";

type DemoState = {
  items: Item[];
  suppliers: Supplier[];
  movements: StockMovement[];
  boms: (Bom & { items: BomItem[] })[];
  orders: ProductionOrder[];
  cash: CashTransaction[];
  employees: Employee[];
  tasks: Task[];
  attendance: Attendance[];
  adjustments: PayrollAdjustment[];
  customers: Customer[];
  salesOrders: SalesOrder[];
  salesOrderItems: SalesOrderItem[];
  purchaseOrders: PurchaseOrder[];
  purchaseOrderItems: PurchaseOrderItem[];
};

const DAY = 86_400_000;

function daysAgo(days: number, hour = 9): string {
  const date = new Date(Date.now() - days * DAY);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

function dateDaysAgo(days: number): string {
  return daysAgo(days).slice(0, 10);
}

function uid(): string {
  return globalThis.crypto?.randomUUID?.() ?? `demo-${Math.random().toString(36).slice(2)}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

function seed(): DemoState {
  const items: Item[] = [
    { id: "nl-001", code: "NL001", name: "Bột mì đa dụng", unit: "kg", type: "nguyen_lieu", unit_price: 25_000, min_stock: 20, created_at: daysAgo(120) },
    { id: "nl-002", code: "NL002", name: "Đường trắng", unit: "kg", type: "nguyen_lieu", unit_price: 22_000, min_stock: 10, created_at: daysAgo(120) },
    { id: "nl-003", code: "NL003", name: "Bơ lạt", unit: "kg", type: "nguyen_lieu", unit_price: 120_000, min_stock: 5, created_at: daysAgo(120) },
    { id: "nl-004", code: "NL004", name: "Trứng gà", unit: "quả", type: "nguyen_lieu", unit_price: 3_500, min_stock: 50, created_at: daysAgo(120) },
    { id: "nl-005", code: "NL005", name: "Sữa tươi", unit: "lít", type: "nguyen_lieu", unit_price: 30_000, min_stock: 10, created_at: daysAgo(120) },
    { id: "btp-001", code: "BTP001", name: "Cốt bánh bông lan 20cm", unit: "cốt", type: "ban_thanh_pham", unit_price: 45_000, min_stock: 10, created_at: daysAgo(100) },
    { id: "tp-001", code: "TP001", name: "Dung môi NC (SV09)", unit: "kg", type: "thanh_pham", unit_price: 32_000, min_stock: 50, packing_spec: "17kg/thùng", pack_size: 17, pack_unit: "thùng", created_at: daysAgo(120) },
    { id: "tp-002", code: "TP002", name: "Dung môi PU (SV11)", unit: "kg", type: "thanh_pham", unit_price: 35_000, min_stock: 50, packing_spec: "15kg/thùng", pack_size: 15, pack_unit: "thùng", created_at: daysAgo(120) },
  ];

  const suppliers: Supplier[] = [
    { id: "ncc-001", name: "Công ty Bột Miền Nam", phone: "0909 111 222", note: "Giao hàng thứ 2 hằng tuần", created_at: daysAgo(120) },
    { id: "ncc-002", name: "Đại lý Nguyên liệu Phú Thọ", phone: "0918 333 444", note: null, created_at: daysAgo(110) },
  ];

  const movements: StockMovement[] = [];
  const addMovement = (input: {
    itemId: string;
    type: MovementType;
    quantity: number;
    unitPrice?: number;
    supplierId?: string | null;
    note?: string | null;
    referenceType?: string | null;
    referenceId?: string | null;
    createdAt: string;
  }) => {
    movements.push({
      id: uid(),
      item_id: input.itemId,
      type: input.type,
      quantity: input.quantity,
      unit_price: input.unitPrice ?? 0,
      supplier_id: input.supplierId ?? null,
      note: input.note ?? null,
      reference_type: input.referenceType ?? null,
      reference_id: input.referenceId ?? null,
      created_by: null,
      created_at: input.createdAt,
    });
  };

  addMovement({ itemId: "nl-001", type: "nhap", quantity: 200, unitPrice: 24_000, supplierId: "ncc-001", note: "Nhập đầu kỳ", createdAt: daysAgo(30) });
  addMovement({ itemId: "nl-002", type: "nhap", quantity: 120, unitPrice: 21_000, supplierId: "ncc-002", note: "Nhập đầu kỳ", createdAt: daysAgo(30) });
  addMovement({ itemId: "nl-003", type: "nhap", quantity: 40, unitPrice: 115_000, supplierId: "ncc-002", note: "Nhập đầu kỳ", createdAt: daysAgo(30) });
  addMovement({ itemId: "nl-004", type: "nhap", quantity: 600, unitPrice: 3_200, supplierId: "ncc-002", note: "Nhập đầu kỳ", createdAt: daysAgo(30) });
  addMovement({ itemId: "nl-005", type: "nhap", quantity: 8, unitPrice: 28_000, supplierId: "ncc-002", note: "Nhập đầu kỳ", createdAt: daysAgo(30) });
  addMovement({ itemId: "btp-001", type: "nhap", quantity: 15, unitPrice: 45_000, note: "Tồn đầu kỳ bán thành phẩm", createdAt: daysAgo(30) });
  addMovement({ itemId: "tp-001", type: "nhap", quantity: 30, unitPrice: 10_000, note: "Tồn đầu kỳ", createdAt: daysAgo(30) });
  addMovement({ itemId: "tp-002", type: "nhap", quantity: 8, unitPrice: 120_000, note: "Tồn đầu kỳ", createdAt: daysAgo(30) });
  addMovement({ itemId: "nl-001", type: "nhap", quantity: 50, unitPrice: 25_000, supplierId: "ncc-001", note: "Bổ sung bột", createdAt: daysAgo(12) });

  // Lệnh sản xuất đã hoàn thành 3 ngày trước (10 bánh mì bơ).
  const completedOrder: ProductionOrder = {
    id: "lsx-001",
    code: "LSX-2601-001",
    product_id: "tp-001",
    quantity: 10,
    actual_quantity: 10,
    waste_quantity: 0,
    material_cost: 128_100,
    labor_cost: 40_000,
    other_cost: 10_000,
    total_cost: 178_100,
    unit_cost: 17_810,
    status: "hoan_thanh",
    planned_date: dateDaysAgo(4),
    completed_at: daysAgo(3),
    note: "Lô bánh buổi sáng, đạt chuẩn chất lượng",
    created_by: null,
    created_at: daysAgo(5),
  };

  const completedOrder2: ProductionOrder = {
    id: "lsx-000",
    code: "LSX-2601-000",
    product_id: "tp-002",
    quantity: 6,
    actual_quantity: 5,
    waste_quantity: 1,
    material_cost: 212_400,
    labor_cost: 120_000,
    other_cost: 25_000,
    total_cost: 357_400,
    unit_cost: 71_480,
    status: "hoan_thanh",
    planned_date: dateDaysAgo(8),
    completed_at: daysAgo(7),
    note: "Bánh kem sự kiện (1 cái lỗi kem trang trí)",
    created_by: null,
    created_at: daysAgo(9),
  };

  const finishedCost = 0.25 * 25_000 + 0.03 * 22_000 + 0.02 * 120_000 + 1 * 3_500;
  addMovement({ itemId: "nl-001", type: "san_xuat_tieu_hao", quantity: -2.5, unitPrice: 25_000, note: `Xuất nguyên liệu cho lệnh ${completedOrder.code}`, referenceType: "production_order", referenceId: completedOrder.id, createdAt: daysAgo(3) });
  addMovement({ itemId: "nl-002", type: "san_xuat_tieu_hao", quantity: -0.3, unitPrice: 22_000, note: `Xuất nguyên liệu cho lệnh ${completedOrder.code}`, referenceType: "production_order", referenceId: completedOrder.id, createdAt: daysAgo(3) });
  addMovement({ itemId: "nl-003", type: "san_xuat_tieu_hao", quantity: -0.2, unitPrice: 120_000, note: `Xuất nguyên liệu cho lệnh ${completedOrder.code}`, referenceType: "production_order", referenceId: completedOrder.id, createdAt: daysAgo(3) });
  addMovement({ itemId: "nl-004", type: "san_xuat_tieu_hao", quantity: -10, unitPrice: 3_500, note: `Xuất nguyên liệu cho lệnh ${completedOrder.code}`, referenceType: "production_order", referenceId: completedOrder.id, createdAt: daysAgo(3) });
  addMovement({ itemId: "tp-001", type: "san_xuat_nhap", quantity: 10, unitPrice: Math.round(finishedCost), note: `Nhập thành phẩm từ lệnh ${completedOrder.code}`, referenceType: "production_order", referenceId: completedOrder.id, createdAt: daysAgo(3) });

  addMovement({ itemId: "tp-001", type: "xuat", quantity: -12, unitPrice: 15_000, note: "Bán cho khách lẻ", createdAt: daysAgo(2) });
  addMovement({ itemId: "tp-002", type: "xuat", quantity: -2, unitPrice: 220_000, note: "Đơn đặt bánh sinh nhật", createdAt: daysAgo(1) });
  addMovement({ itemId: "nl-001", type: "xuat", quantity: -5, unitPrice: 25_000, note: "Chuyển bột cho bếp thử nghiệm", createdAt: daysAgo(1, 14) });

  const boms: (Bom & { items: BomItem[] })[] = [
    {
      id: "bom-001",
      product_id: "tp-001",
      output_quantity: 1,
      note: "Công thức chuẩn cho 1 ổ bánh mì bơ",
      created_at: daysAgo(60),
      updated_at: daysAgo(14),
      items: [
        { id: "bom-item-001", bom_id: "bom-001", material_id: "nl-001", quantity: 0.25 },
        { id: "bom-item-002", bom_id: "bom-001", material_id: "nl-002", quantity: 0.03 },
        { id: "bom-item-003", bom_id: "bom-001", material_id: "nl-003", quantity: 0.02 },
        { id: "bom-item-004", bom_id: "bom-001", material_id: "nl-004", quantity: 1 },
      ],
    },
    {
      id: "bom-003",
      product_id: "btp-001",
      output_quantity: 1,
      note: "Công thức chuẩn cho 1 cốt bánh bông lan 20cm",
      created_at: daysAgo(50),
      updated_at: daysAgo(15),
      items: [
        { id: "bom-item-010", bom_id: "bom-003", material_id: "nl-001", quantity: 0.2 },
        { id: "bom-item-011", bom_id: "bom-003", material_id: "nl-002", quantity: 0.1 },
        { id: "bom-item-012", bom_id: "bom-003", material_id: "nl-004", quantity: 3 },
      ],
    },
    {
      id: "bom-002",
      product_id: "tp-002",
      output_quantity: 1,
      note: "Bánh kem cỡ 20cm (dùng cốt bánh BTP + kem sữa)",
      created_at: daysAgo(45),
      updated_at: daysAgo(20),
      items: [
        { id: "bom-item-005", bom_id: "bom-002", material_id: "btp-001", quantity: 1 },
        { id: "bom-item-006", bom_id: "bom-002", material_id: "nl-003", quantity: 0.1 },
        { id: "bom-item-007", bom_id: "bom-002", material_id: "nl-005", quantity: 0.2 },
        { id: "bom-item-008", bom_id: "bom-002", material_id: "nl-002", quantity: 0.05 },
      ],
    },
  ];

  const orders: ProductionOrder[] = [
    {
      id: "lsx-002",
      code: "LSX-2601-002",
      product_id: "tp-001",
      quantity: 20,
      status: "cho_xac_nhan",
      planned_date: todayISO(),
      completed_at: null,
      note: "Đơn giao buổi chiều",
      created_by: null,
      created_at: daysAgo(1),
    },
    {
      id: "lsx-003",
      code: "LSX-2601-003",
      product_id: "tp-002",
      quantity: 5,
      status: "cho_xac_nhan",
      planned_date: todayISO(),
      completed_at: null,
      note: "Đặt trước cho cuối tuần",
      created_by: null,
      created_at: daysAgo(1, 16),
    },
    completedOrder,
    completedOrder2,
  ];

  const cash: CashTransaction[] = [];
  const addCash = (input: {
    type: CashTransaction["type"];
    amount: number;
    category: string;
    description: string;
    date: string;
    method?: CashTransaction["method"];
  }) => {
    cash.push({
      id: uid(),
      type: input.type,
      amount: input.amount,
      method: input.method ?? "tien_mat",
      category: input.category,
      description: input.description,
      transaction_date: input.date,
      reference_type: null,
      reference_id: null,
      created_by: null,
      created_at: `${input.date}T09:00:00.000Z`,
    });
  };

  const months = lastMonths(6);
  months.forEach((month, index) => {
    const first = `${month.key}-01`;
    const fifth = `${month.key}-05`;
    const eighth = `${month.key}-08`;
    const tenth = `${month.key}-10`;
    const eighteenth = `${month.key}-18`;
    const twentieth = `${month.key}-20`;
    addCash({ type: "thu", amount: 180_000_000 + index * 12_000_000, category: "Bán hàng", description: "Doanh thu bán buổi sáng", date: fifth, method: index % 2 === 0 ? "tien_mat" : "ngan_hang" });
    addCash({ type: "thu", amount: 65_000_000 + index * 5_000_000, category: "Bán hàng", description: "Doanh thu bánh kem đặt trước", date: eighteenth, method: "ngan_hang" });
    addCash({ type: "chi", amount: 78_000_000 + index * 3_000_000, category: "Mua nguyên liệu", description: "Nhập nguyên liệu đầu tháng", date: eighth });
    addCash({ type: "chi", amount: 42_000_000, category: "Lương nhân viên", description: "Lương tháng cho 8 nhân viên", date: tenth, method: "ngan_hang" });
    addCash({ type: "chi", amount: 15_000_000, category: "Mặt bằng", description: "Tiền thuê mặt bằng", date: first, method: "ngan_hang" });
    addCash({ type: "chi", amount: 6_500_000, category: "Điện nước", description: "Hoá đơn điện nước", date: twentieth });
  });

  const employees: Employee[] = [
    {
      id: "demo",
      full_name: "Nguyễn Văn An",
      email: "admin@vuongphat.vn",
      phone: "0901 234 567",
      address: "123 Xa Lộ Hà Nội, TP. Thủ Đức",
      job_title: "Giám đốc điều hành",
      date_of_birth: "1988-05-15",
      start_date: "2023-01-01",
      daily_wage: 650_000,
      active: true,
      role: "admin",
      created_at: daysAgo(120),
    },
    {
      id: "nv-002",
      full_name: "Trần Thị Bình",
      email: "binh.tran@vuongphat.vn",
      phone: "0912 345 678",
      address: "45 Lê Văn Việt, TP. Thủ Đức",
      job_title: "Thủ kho chính",
      date_of_birth: "1992-08-20",
      start_date: "2023-03-15",
      daily_wage: 350_000,
      active: true,
      role: "kho",
      created_at: daysAgo(110),
    },
    {
      id: "nv-003",
      full_name: "Lê Hoàng Nam",
      email: "nam.le@vuongphat.vn",
      phone: "0987 654 321",
      address: "78 Đỗ Xuân Hợp, Quận 9",
      job_title: "Trưởng ca sản xuất",
      date_of_birth: "1990-11-10",
      start_date: "2023-02-01",
      daily_wage: 420_000,
      active: true,
      role: "san_xuat",
      created_at: daysAgo(120),
    },
    {
      id: "nv-004",
      full_name: "Phạm Thu Thảo",
      email: "thao.pham@vuongphat.vn",
      phone: "0933 888 999",
      address: "12 Nguyễn Thị Định, Quận 2",
      job_title: "Kế toán tổng hợp",
      date_of_birth: "1995-03-25",
      start_date: "2023-05-01",
      daily_wage: 380_000,
      active: true,
      role: "ke_toan",
      created_at: daysAgo(100),
    },
    {
      id: "nv-005",
      full_name: "Võ Minh Đức",
      email: "duc.vo@vuongphat.vn",
      phone: "0977 112 233",
      address: "89 Tăng Nhơn Phú, TP. Thủ Đức",
      job_title: "Công nhân đứng máy",
      date_of_birth: "1997-09-05",
      start_date: "2023-06-15",
      daily_wage: 300_000,
      active: true,
      role: "san_xuat",
      created_at: daysAgo(90),
    },
  ];

  const tasks: Task[] = [
    {
      id: "task-001",
      employee_id: "demo",
      title: "Duyệt kế hoạch sản xuất tuần mới",
      description: "Xem xét các lệnh sản xuất còn chờ và lượng tồn kho nguyên liệu.",
      due_date: todayISO(),
      status: "can_lam",
      completed_at: null,
      created_by: "demo",
      created_at: daysAgo(1),
    },
    {
      id: "task-002",
      employee_id: "nv-002",
      title: "Kiểm đếm tồn kho bột mì và bơ lạt",
      description: "Đối chiếu số lượng thực tế với số liệu trên phần mềm Vương Phát ERP.",
      due_date: todayISO(),
      status: "hoan_thanh",
      completed_at: nowISO(),
      created_by: "demo",
      created_at: daysAgo(2),
    },
    {
      id: "task-003",
      employee_id: "nv-003",
      title: "Bảo dưỡng máy trộn bột ca sáng",
      description: "Vệ sinh và kiểm tra dầu bôi trơn máy trộn số 1 và 2.",
      due_date: todayISO(),
      status: "can_lam",
      completed_at: null,
      created_by: "demo",
      created_at: daysAgo(1),
    },
    {
      id: "task-004",
      employee_id: "nv-004",
      title: "Đối chiếu sổ quỹ với sao kê tài khoản ngân hàng",
      description: "Kiểm tra các khoản thu chi ngân hàng tháng hiện tại.",
      due_date: todayISO(),
      status: "can_lam",
      completed_at: null,
      created_by: "demo",
      created_at: daysAgo(1),
    },
  ];

  const attendance: Attendance[] = [];
  const adjustments: PayrollAdjustment[] = [];

  const curPeriod = currentPeriod();
  const prevDate = new Date();
  prevDate.setMonth(prevDate.getMonth() - 1);
  const prevPeriod = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

  for (const emp of employees) {
    for (let day = 1; day <= 22; day++) {
      const dStr = String(day).padStart(2, "0");
      attendance.push({
        id: uid(),
        employee_id: emp.id,
        work_date: `${prevPeriod}-${dStr}`,
        days: 1,
        note: null,
        created_by: "demo",
        created_at: `${prevPeriod}-${dStr}T17:00:00.000Z`,
      });
    }

    const nowDay = Math.min(new Date().getDate(), 20);
    for (let day = 1; day <= nowDay; day++) {
      const dStr = String(day).padStart(2, "0");
      attendance.push({
        id: uid(),
        employee_id: emp.id,
        work_date: `${curPeriod}-${dStr}`,
        days: 1,
        note: null,
        created_by: "demo",
        created_at: `${curPeriod}-${dStr}T17:00:00.000Z`,
      });
    }
  }

  adjustments.push({
    id: uid(),
    employee_id: "nv-003",
    period: curPeriod,
    amount: 500_000,
    description: "Thưởng năng suất hoàn thành vượt kế hoạch",
    created_by: "demo",
    created_at: nowISO(),
  });
  adjustments.push({
    id: uid(),
    employee_id: "nv-002",
    period: curPeriod,
    amount: 300_000,
    description: "Phụ cấp trách nhiệm quản lý kho",
    created_by: "demo",
    created_at: nowISO(),
  });
  adjustments.push({
    id: uid(),
    employee_id: "nv-005",
    period: curPeriod,
    amount: -500_000,
    description: "Tạm ứng tiền mặt giữa kỳ",
    created_by: "demo",
    created_at: nowISO(),
  });

  const customers: Customer[] = [
    {
      id: "kh-001",
      code: "KH001",
      name: "Chuỗi Cửa Hàng Bánh ABC",
      phone: "0938 111 222",
      address: "150 Nguyễn Trãi, Quận 1, TP.HCM",
      note: "Đại lý phân phối bánh mì bơ",
      created_at: daysAgo(60),
    },
    {
      id: "kh-002",
      code: "KH002",
      name: "Tiệm Trà & Cafe Hướng Dương",
      phone: "0909 333 555",
      address: "24 Lê Duẩn, Quận 1, TP.HCM",
      note: "Đơn đặt bánh kem sự kiện",
      created_at: daysAgo(45),
    },
    {
      id: "kh-003",
      code: "KH003",
      name: "Siêu thị Mini Sài Gòn Mart",
      phone: "0918 777 999",
      address: "88 Võ Thị Sáu, Quận 3, TP.HCM",
      note: "Giao hàng vào sáng sớm",
      created_at: daysAgo(30),
    },
  ];

  const salesOrders: SalesOrder[] = [
    {
      id: "so-001",
      code: "DHB-261108-01",
      customer_id: "kh-001",
      order_date: dateDaysAgo(2),
      delivery_date: dateDaysAgo(2),
      status: "da_giao",
      total_amount: 15_000_000,
      paid_amount: 15_000_000,
      payment_status: "da_thanh_toan",
      note: "Giao tại kho chi nhánh Quận 1",
      created_by: "demo",
      created_at: daysAgo(2),
    },
    {
      id: "so-002",
      code: "DHB-261109-02",
      customer_id: "kh-002",
      order_date: dateDaysAgo(1),
      delivery_date: todayISO(),
      status: "cho_xac_nhan",
      total_amount: 4_400_000,
      paid_amount: 0,
      payment_status: "chua_thanh_toan",
      note: "Bánh kem phục vụ tiệc sinh nhật",
      created_by: "demo",
      created_at: daysAgo(1),
    },
    {
      id: "so-003",
      code: "DHB-261110-03",
      customer_id: "kh-003",
      order_date: todayISO(),
      delivery_date: todayISO(),
      status: "cho_xac_nhan",
      total_amount: 7_500_000,
      paid_amount: 3_000_000,
      payment_status: "thanh_toan_mot_phan",
      note: "Đã cọc 3.000.000đ tiền mặt",
      created_by: "demo",
      created_at: nowISO(),
    },
  ];

  const salesOrderItems: SalesOrderItem[] = [
    {
      id: uid(),
      order_id: "so-001",
      item_id: "tp-001",
      quantity: 1000,
      unit_price: 15_000,
      total_price: 15_000_000,
    },
    {
      id: uid(),
      order_id: "so-002",
      item_id: "tp-002",
      quantity: 20,
      unit_price: 220_000,
      total_price: 4_400_000,
    },
    {
      id: uid(),
      order_id: "so-003",
      item_id: "tp-001",
      quantity: 500,
      unit_price: 15_000,
      total_price: 7_500_000,
    },
  ];

  const purchaseOrders: PurchaseOrder[] = [
    {
      id: "po-001",
      code: "DHN-261105-01",
      supplier_id: "ncc-001",
      order_date: dateDaysAgo(5),
      delivery_date: dateDaysAgo(5),
      status: "da_nhap_kho",
      total_amount: 48_000_000,
      paid_amount: 48_000_000,
      payment_status: "da_thanh_toan",
      note: "Nhập bột mì chất lượng cao",
      created_by: "demo",
      created_at: daysAgo(5),
    },
    {
      id: "po-002",
      code: "DHN-261108-02",
      supplier_id: "ncc-002",
      order_date: dateDaysAgo(2),
      delivery_date: todayISO(),
      status: "cho_nhap_kho",
      total_amount: 25_000_000,
      paid_amount: 10_000_000,
      payment_status: "thanh_toan_mot_phan",
      note: "Đã chuyển khoản cọc 10.000.000đ",
      created_by: "demo",
      created_at: daysAgo(2),
    },
  ];

  const purchaseOrderItems: PurchaseOrderItem[] = [
    {
      id: uid(),
      order_id: "po-001",
      item_id: "nl-001",
      quantity: 2000,
      unit_price: 24_000,
      total_price: 48_000_000,
    },
    {
      id: uid(),
      order_id: "po-002",
      item_id: "nl-003",
      quantity: 200,
      unit_price: 125_000,
      total_price: 25_000_000,
    },
  ];

  return {
    items,
    suppliers,
    movements,
    boms,
    orders,
    cash,
    employees,
    tasks,
    attendance,
    adjustments,
    customers,
    salesOrders,
    salesOrderItems,
    purchaseOrders,
    purchaseOrderItems,
  };
}

const store = globalThis as unknown as { __vuongPhatDemo?: DemoState };

function db(): DemoState {
  if (!store.__vuongPhatDemo) {
    store.__vuongPhatDemo = seed();
  }
  return store.__vuongPhatDemo;
}

function onHand(state: DemoState, itemId: string): number {
  return state.movements
    .filter((movement) => movement.item_id === itemId)
    .reduce((total, movement) => total + Number(movement.quantity), 0);
}

export function demoInventory(search?: string): InventoryItem[] {
  const state = db();
  const keyword = search?.trim().toLowerCase();
  return state.items
    .filter((item) => {
      if (!keyword) return true;
      return `${item.code} ${item.name}`.toLowerCase().includes(keyword);
    })
    .map((item) => ({ ...item, on_hand: onHand(state, item.id) }))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));
}

export function demoItems(type?: ItemType): Item[] {
  return db()
    .items.filter((item) => !type || item.type === type)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));
}

export function demoSuppliers(): Supplier[] {
  return db().suppliers.slice().sort((a, b) => a.name.localeCompare(b.name, "vi"));
}

export function demoTouch(): void {
  db();
}

export function demoMovements(limit = 150): MovementRow[] {
  const state = db();
  const itemById = new Map(state.items.map((item) => [item.id, item]));
  const supplierById = new Map(state.suppliers.map((supplier) => [supplier.id, supplier]));
  return state.movements
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit)
    .map((movement) => {
      const item = itemById.get(movement.item_id);
      return {
        ...movement,
        item_name: item?.name ?? "—",
        item_code: item?.code ?? "—",
        item_unit: item?.unit ?? "",
        supplier_name: movement.supplier_id ? supplierById.get(movement.supplier_id)?.name ?? null : null,
        created_by_name: movement.created_by ? "Nhân viên" : null,
      };
    });
}

export function demoCreateMovement(input: {
  itemId: string;
  type: "nhap" | "xuat" | "dieu_chinh";
  quantity: number;
  unitPrice: number;
  supplierId?: string | null;
  note?: string | null;
}): void {
  const state = db();
  const item = state.items.find((entry) => entry.id === input.itemId);
  if (!item) throw new Error("Không tìm thấy hàng hóa");
  if (!Number.isFinite(input.quantity) || input.quantity === 0) {
    throw new Error("Số lượng phải khác 0");
  }

  const signed =
    input.type === "nhap"
      ? Math.abs(input.quantity)
      : input.type === "xuat"
        ? -Math.abs(input.quantity)
        : input.quantity;

  if (signed < 0 && onHand(state, input.itemId) + signed < 0) {
    throw new Error(`Tồn kho không đủ (hiện còn ${onHand(state, input.itemId)})`);
  }

  state.movements.push({
    id: uid(),
    item_id: input.itemId,
    type: input.type,
    quantity: signed,
    unit_price: input.unitPrice || 0,
    supplier_id: input.supplierId || null,
    note: input.note || null,
    reference_type: null,
    reference_id: null,
    created_by: null,
    created_at: nowISO(),
  });
}

function applyStockTarget(
  state: DemoState,
  itemId: string,
  target: number,
  unitPrice: number,
  note: string,
): void {
  const current = onHand(state, itemId);
  const delta = Math.round((target - current) * 1000) / 1000;
  if (delta === 0) return;
  state.movements.push({
    id: uid(),
    item_id: itemId,
    type: "dieu_chinh",
    quantity: delta,
    unit_price: unitPrice,
    supplier_id: null,
    note,
    reference_type: null,
    reference_id: null,
    created_by: null,
    created_at: nowISO(),
  });
}

export function demoCreateItem(input: {
  code: string;
  name: string;
  unit: string;
  type: ItemType;
  unitPrice: number;
  minStock: number;
  packingSpec?: string | null;
  packSize?: number | null;
  packUnit?: string | null;
  onHand?: number;
}): void {
  const state = db();
  const code = input.code.trim().toUpperCase();
  if (state.items.some((item) => item.code.toLowerCase() === code.toLowerCase())) {
    throw new Error(`Mã hàng "${code}" đã tồn tại`);
  }
  const id = uid();
  state.items.push({
    id,
    code,
    name: input.name.trim(),
    unit: input.unit.trim(),
    type: input.type,
    unit_price: input.unitPrice || 0,
    min_stock: input.minStock || 0,
    packing_spec: input.packingSpec || (input.packSize ? `${input.packSize}${input.unit.trim()}/${input.packUnit || "thùng"}` : null),
    pack_size: input.packSize ?? null,
    pack_unit: input.packUnit ?? null,
    created_at: nowISO(),
  });
  applyStockTarget(state, id, input.onHand ?? 0, input.unitPrice || 0, "Nhập tồn kho đầu kỳ");
}

export function demoUpdateItem(input: {
  id: string;
  code: string;
  name: string;
  unit: string;
  type: ItemType;
  unitPrice: number;
  minStock: number;
  packingSpec?: string | null;
  packSize?: number | null;
  packUnit?: string | null;
  onHand?: number;
}): void {
  const state = db();
  const item = state.items.find((entry) => entry.id === input.id);
  if (!item) throw new Error("Không tìm thấy hàng hóa");
  const code = input.code.trim().toUpperCase();
  if (
    state.items.some(
      (entry) => entry.id !== input.id && entry.code.toLowerCase() === code.toLowerCase(),
    )
  ) {
    throw new Error(`Mã hàng "${code}" đã tồn tại`);
  }
  item.code = code;
  item.name = input.name.trim();
  item.unit = input.unit.trim();
  item.type = input.type;
  item.unit_price = input.unitPrice || 0;
  item.min_stock = input.minStock || 0;
  if (input.packingSpec !== undefined) {
    item.packing_spec = input.packingSpec || (input.packSize ? `${input.packSize}${input.unit.trim()}/${input.packUnit || "thùng"}` : null);
  }
  if (input.packSize !== undefined) {
    item.pack_size = input.packSize;
  }
  if (input.packUnit !== undefined) {
    item.pack_unit = input.packUnit;
  }
  if (input.onHand !== undefined) {
    applyStockTarget(state, item.id, input.onHand, item.unit_price, "Điều chỉnh tồn kho");
  }
}

export function demoDeleteItem(id: string): void {
  const state = db();
  const itemIndex = state.items.findIndex((item) => item.id === id);
  if (itemIndex === -1) throw new Error("Không tìm thấy hàng hóa cần xóa");

  // Dọn các bản ghi phụ thuộc trong demo store để người dùng test xóa không bị kẹt
  state.movements = state.movements.filter((m) => m.item_id !== id);
  state.salesOrderItems = state.salesOrderItems.filter((soi) => soi.item_id !== id);
  state.purchaseOrderItems = state.purchaseOrderItems.filter((poi) => poi.item_id !== id);
  state.orders = state.orders.filter((po) => po.product_id !== id);
  state.boms = state.boms.filter((b) => b.product_id !== id);
  for (const bom of state.boms) {
    bom.items = bom.items.filter((bi) => bi.material_id !== id);
  }

  state.items.splice(itemIndex, 1);
}

export function demoCreateSupplier(input: { name: string; phone?: string; note?: string }): void {
  const state = db();
  const name = input.name.trim();
  if (state.suppliers.some((supplier) => supplier.name.toLowerCase() === name.toLowerCase())) {
    throw new Error(`Nhà cung cấp "${name}" đã tồn tại`);
  }
  state.suppliers.push({
    id: uid(),
    name,
    phone: input.phone?.trim() || null,
    note: input.note?.trim() || null,
    created_at: nowISO(),
  });
}

export function demoBoms(): BomRow[] {
  const state = db();
  const itemById = new Map(state.items.map((item) => [item.id, item]));
  return state.boms
    .map((bom) => {
      const product = itemById.get(bom.product_id);
      const lines: BomLine[] = bom.items.map((line) => {
        const material = itemById.get(line.material_id);
        return {
          ...line,
          material_name: material?.name ?? "—",
          material_code: material?.code ?? "—",
          material_unit: material?.unit ?? "",
          material_unit_price: material?.unit_price ?? 0,
        };
      });
      return {
        ...bom,
        product_name: product?.name ?? "—",
        product_code: product?.code ?? "—",
        product_unit: product?.unit ?? "",
        items: lines,
      };
    })
    .sort((a, b) => a.product_name.localeCompare(b.product_name, "vi"));
}

export function demoSaveBom(input: {
  productId: string;
  outputQuantity: number;
  note?: string | null;
  lines: { materialId: string; quantity: number }[];
}): void {
  const state = db();
  const product = state.items.find(
    (item) => item.id === input.productId && (item.type === "thanh_pham" || item.type === "ban_thanh_pham"),
  );
  if (!product) throw new Error("Sản phẩm không hợp lệ");
  if (!Number.isFinite(input.outputQuantity) || input.outputQuantity <= 0) {
    throw new Error("Số lượng đầu ra phải lớn hơn 0");
  }
  if (!input.lines.length) throw new Error("Công thức phải có ít nhất một nguyên liệu");

  const seen = new Set<string>();
  for (const line of input.lines) {
    if (line.materialId === input.productId) {
      throw new Error("Không thể dùng chính sản phẩm làm thành phần");
    }
    if (seen.has(line.materialId)) throw new Error("Thành phần bị lặp trong công thức");
    seen.add(line.materialId);
    const material = state.items.find(
      (item) => item.id === line.materialId && (item.type === "nguyen_lieu" || item.type === "ban_thanh_pham"),
    );
    if (!material) throw new Error("Nguyên liệu hoặc bán thành phẩm không hợp lệ");
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      throw new Error("Định lượng phải lớn hơn 0");
    }
  }

  const existing = state.boms.find((bom) => bom.product_id === input.productId);
  const bomId = existing?.id ?? uid();
  const items: BomItem[] = input.lines.map((line) => ({
    id: uid(),
    bom_id: bomId,
    material_id: line.materialId,
    quantity: line.quantity,
  }));

  if (existing) {
    existing.output_quantity = input.outputQuantity;
    existing.note = input.note || null;
    existing.updated_at = nowISO();
    existing.items = items;
  } else {
    state.boms.push({
      id: bomId,
      product_id: input.productId,
      output_quantity: input.outputQuantity,
      note: input.note || null,
      created_at: nowISO(),
      updated_at: nowISO(),
      items,
    });
  }
}

export function demoDeleteBom(id: string): void {
  const state = db();
  state.boms = state.boms.filter((bom) => bom.id !== id && bom.product_id !== id);
}

export function demoOrders(): ProductionRow[] {
  const state = db();
  return state.orders
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((order) => {
      const product = state.items.find((item) => item.id === order.product_id);
      return {
        ...order,
        product_name: product?.name ?? "—",
        product_code: product?.code ?? "—",
        product_unit: product?.unit ?? "",
      };
    });
}

export function demoCreateOrder(input: {
  productId: string;
  quantity: number;
  plannedDate: string;
  note?: string | null;
}): void {
  const state = db();
  const product = state.items.find(
    (item) => item.id === input.productId && (item.type === "thanh_pham" || item.type === "ban_thanh_pham"),
  );
  if (!product) throw new Error("Sản phẩm không hợp lệ");
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new Error("Số lượng phải lớn hơn 0");
  }
  const today = new Date();
  const dateCode = `${String(today.getFullYear()).slice(2)}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  state.orders.push({
    id: uid(),
    code: `LSX-${dateCode}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    product_id: input.productId,
    quantity: input.quantity,
    status: "cho_xac_nhan",
    planned_date: input.plannedDate || todayISO(),
    completed_at: null,
    note: input.note || null,
    created_by: null,
    created_at: nowISO(),
  });
}

export function demoConfirmOrder(
  arg:
    | string
    | {
        orderId: string;
        actualQuantity?: number;
        wasteQuantity?: number;
        laborCost?: number;
        otherCost?: number;
        note?: string;
      },
): void {
  const state = db();
  const input = typeof arg === "string" ? { orderId: arg } : arg;
  const order = state.orders.find((entry) => entry.id === input.orderId);
  if (!order) throw new Error("Không tìm thấy lệnh sản xuất");
  if (order.status !== "cho_xac_nhan") throw new Error("Lệnh sản xuất đã được xử lý");

  const bom = state.boms.find((entry) => entry.product_id === order.product_id);
  if (!bom) throw new Error("Thành phẩm chưa có công thức định lượng (BOM)");
  if (!bom.items.length) throw new Error("Công thức định lượng đang rỗng");

  const actualQuantity = input.actualQuantity && input.actualQuantity > 0 ? input.actualQuantity : order.quantity;
  const wasteQuantity = Math.max(input.wasteQuantity ?? 0, 0);
  const laborCost = Math.max(input.laborCost ?? 0, 0);
  const otherCost = Math.max(input.otherCost ?? 0, 0);

  const needed = bom.items.map((line) => ({
    line,
    required: (line.quantity * order.quantity) / bom.output_quantity,
  }));

  for (const entry of needed) {
    const material = state.items.find((item) => item.id === entry.line.material_id);
    const available = onHand(state, entry.line.material_id);
    if (available < entry.required) {
      throw new Error(
        `Nguyên liệu "${material?.name ?? ""}" không đủ: cần ${entry.required}, chỉ còn ${available}`,
      );
    }
  }

  const materialCost = needed.reduce((total, entry) => {
    const material = state.items.find((item) => item.id === entry.line.material_id);
    return total + entry.required * (material?.unit_price ?? 0);
  }, 0);

  const totalCost = materialCost + laborCost + otherCost;
  const unitCost = Math.round(totalCost / actualQuantity);

  for (const entry of needed) {
    const material = state.items.find((item) => item.id === entry.line.material_id);
    state.movements.push({
      id: uid(),
      item_id: entry.line.material_id,
      type: "san_xuat_tieu_hao",
      quantity: -entry.required,
      unit_price: material?.unit_price ?? 0,
      supplier_id: null,
      note: `Xuất nguyên liệu cho lệnh ${order.code}`,
      reference_type: "production_order",
      reference_id: order.id,
      created_by: null,
      created_at: nowISO(),
    });
  }

  state.movements.push({
    id: uid(),
    item_id: order.product_id,
    type: "san_xuat_nhap",
    quantity: actualQuantity,
    unit_price: unitCost,
    supplier_id: null,
    note: `Nhập thành phẩm từ lệnh ${order.code} (thực tế: ${actualQuantity}, hao hụt: ${wasteQuantity})`,
    reference_type: "production_order",
    reference_id: order.id,
    created_by: null,
    created_at: nowISO(),
  });

  order.status = "hoan_thanh";
  order.actual_quantity = actualQuantity;
  order.waste_quantity = wasteQuantity;
  order.material_cost = materialCost;
  order.labor_cost = laborCost;
  order.other_cost = otherCost;
  order.total_cost = totalCost;
  order.unit_cost = unitCost;
  if (input.note) {
    order.note = input.note;
  }
  order.completed_at = nowISO();
}

export function demoProductionCostReport(filter?: {
  from?: string;
  to?: string;
  productId?: string;
}): ProductionCostReportRow[] {
  const state = db();
  const completedOrders = state.orders.filter(
    (order) => order.status === "hoan_thanh" && order.completed_at,
  );

  const rows: ProductionCostReportRow[] = [];
  for (const order of completedOrders) {
    const completedDate = order.completed_at ? order.completed_at.slice(0, 10) : "";
    if (filter?.from && completedDate < filter.from) continue;
    if (filter?.to && completedDate > filter.to) continue;
    if (filter?.productId && filter.productId !== "all" && order.product_id !== filter.productId) continue;

    const product = state.items.find((item) => item.id === order.product_id);
    const plannedQty = order.quantity;
    const actualQty = order.actual_quantity ?? plannedQty;
    const wasteQty = order.waste_quantity ?? 0;
    const totalOutput = actualQty + wasteQty;
    const wasteRate = totalOutput > 0 ? Math.round((wasteQty / totalOutput) * 1000) / 10 : 0;

    const materialCost = order.material_cost ?? 0;
    const laborCost = order.labor_cost ?? 0;
    const otherCost = order.other_cost ?? 0;
    const totalCost = order.total_cost ?? (materialCost + laborCost + otherCost);
    const unitCost = order.unit_cost ?? (actualQty > 0 ? Math.round(totalCost / actualQty) : 0);
    const salePrice = product?.unit_price ?? 0;
    const grossProfitPerUnit = salePrice - unitCost;
    const grossMarginRate = salePrice > 0 ? Math.round((grossProfitPerUnit / salePrice) * 1000) / 10 : 0;

    rows.push({
      order_id: order.id,
      order_code: order.code,
      product_id: order.product_id,
      product_name: product?.name ?? "—",
      product_code: product?.code ?? "—",
      product_unit: product?.unit ?? "",
      product_sale_price: salePrice,
      planned_quantity: plannedQty,
      actual_quantity: actualQty,
      waste_quantity: wasteQty,
      waste_rate: wasteRate,
      material_cost: materialCost,
      labor_cost: laborCost,
      other_cost: otherCost,
      total_cost: totalCost,
      unit_cost: unitCost,
      gross_profit_per_unit: grossProfitPerUnit,
      gross_margin_rate: grossMarginRate,
      completed_at: order.completed_at,
      note: order.note,
    });
  }

  return rows.sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
}

export function demoCash(filter: CashFilter = {}): CashRow[] {
  const type = filter.type ?? "all";
  return db()
    .cash.filter((row) => {
      if (filter.from && row.transaction_date < filter.from) return false;
      if (filter.to && row.transaction_date > filter.to) return false;
      if (type !== "all" && row.type !== type) return false;
      return true;
    })
    .slice()
    .sort((a, b) => {
      if (a.transaction_date === b.transaction_date) {
        return b.created_at.localeCompare(a.created_at);
      }
      return b.transaction_date.localeCompare(a.transaction_date);
    })
    .map((row) => ({ ...row, created_by_name: row.created_by ? "Nhân viên" : null }));
}

export function demoCreateCash(input: {
  type: "thu" | "chi";
  amount: number;
  method: "tien_mat" | "ngan_hang";
  category: string;
  description?: string | null;
  transactionDate: string;
}): void {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("Số tiền phải lớn hơn 0");
  }
  db().cash.push({
    id: uid(),
    type: input.type,
    amount: input.amount,
    method: input.method,
    category: input.category || "Khác",
    description: input.description || null,
    transaction_date: input.transactionDate || todayISO(),
    reference_type: null,
    reference_id: null,
    created_by: null,
    created_at: nowISO(),
  });
}

export function demoDashboard(): DashboardData {
  const state = db();
  const inventory = demoInventory();
  const totalStockValue = inventory.reduce(
    (total, item) => total + Math.max(item.on_hand, 0) * item.unit_price,
    0,
  );
  const cashBalance = state.cash.reduce(
    (total, row) => total + (row.type === "thu" ? row.amount : -row.amount),
    0,
  );
  const today = todayISO();
  const pendingOrdersToday = state.orders.filter(
    (order) => order.status === "cho_xac_nhan" && order.planned_date <= today,
  ).length;
  const lowStockCount = inventory.filter(
    (item) => item.min_stock > 0 && item.on_hand < item.min_stock,
  ).length;

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const monthlyMap = new Map(
    lastMonths(6).map((month) => [month.key, { ...month, thu: 0, chi: 0 }]),
  );

  for (const row of state.cash) {
    const date = new Date(row.transaction_date);
    if (date < start) continue;
    const bucket = monthlyMap.get(monthKey(date));
    if (!bucket) continue;
    if (row.type === "thu") bucket.thu += row.amount;
    else bucket.chi += row.amount;
  }

  return {
    totalStockValue,
    cashBalance,
    pendingOrdersToday,
    lowStockCount,
    monthly: Array.from(monthlyMap.values()),
  };
}

// --- Demo Nhân sự -----------------------------------------------------------

export function demoEmployees(): Employee[] {
  return db().employees.slice().sort((a, b) => a.full_name.localeCompare(b.full_name, "vi"));
}

export function demoCreateEmployee(input: {
  fullName: string;
  email: string;
  role: Role;
  phone?: string | null;
  address?: string | null;
  jobTitle?: string | null;
  dob?: string | null;
  startDate?: string | null;
  dailyWage: number;
}): Employee {
  const state = db();
  if (state.employees.some((e) => e.email?.toLowerCase() === input.email.toLowerCase())) {
    throw new Error(`Email "${input.email}" đã được đăng ký.`);
  }

  const emp: Employee = {
    id: uid(),
    full_name: input.fullName,
    email: input.email,
    role: input.role,
    phone: input.phone ?? null,
    address: input.address ?? null,
    job_title: input.jobTitle ?? null,
    date_of_birth: input.dob ?? null,
    start_date: input.startDate ?? null,
    daily_wage: input.dailyWage,
    active: true,
    created_at: nowISO(),
  };
  state.employees.push(emp);
  return emp;
}

export function demoUpdateEmployee(
  id: string,
  input: {
    fullName: string;
    role: Role;
    phone?: string | null;
    address?: string | null;
    jobTitle?: string | null;
    dob?: string | null;
    startDate?: string | null;
    dailyWage: number;
    active: boolean;
  },
): void {
  const state = db();
  const emp = state.employees.find((e) => e.id === id);
  if (!emp) throw new Error("Không tìm thấy nhân viên.");

  emp.full_name = input.fullName;
  emp.role = input.role;
  emp.phone = input.phone ?? null;
  emp.address = input.address ?? null;
  emp.job_title = input.jobTitle ?? null;
  emp.date_of_birth = input.dob ?? null;
  emp.start_date = input.startDate ?? null;
  emp.daily_wage = input.dailyWage;
  emp.active = input.active;
}

export function demoSetEmployeeActive(id: string, active: boolean): void {
  const state = db();
  const emp = state.employees.find((e) => e.id === id);
  if (!emp) throw new Error("Không tìm thấy nhân viên.");
  emp.active = active;
}

export function demoChangeEmployeeEmail(id: string, email: string): void {
  const state = db();
  const emp = state.employees.find((e) => e.id === id);
  if (!emp) throw new Error("Không tìm thấy nhân viên.");
  if (state.employees.some((e) => e.id !== id && e.email?.toLowerCase() === email.toLowerCase())) {
    throw new Error(`Email "${email}" đã được đăng ký.`);
  }
  emp.email = email;
}

export function demoTasks(employeeId?: string): TaskRow[] {
  const state = db();
  const empMap = new Map(state.employees.map((e) => [e.id, e.full_name]));

  return state.tasks
    .filter((task) => !employeeId || task.employee_id === employeeId)
    .sort((a, b) => {
      if (a.due_date === b.due_date) return b.created_at.localeCompare(a.created_at);
      return b.due_date.localeCompare(a.due_date);
    })
    .map((task) => ({
      ...task,
      employee_name: empMap.get(task.employee_id) ?? "—",
      created_by_name: task.created_by ? (empMap.get(task.created_by) ?? "Admin") : null,
    }));
}

export function demoCreateTask(input: {
  employeeId: string;
  title: string;
  description?: string | null;
  dueDate: string;
}): Task {
  const state = db();
  const task: Task = {
    id: uid(),
    employee_id: input.employeeId,
    title: input.title,
    description: input.description ?? null,
    due_date: input.dueDate,
    status: "can_lam",
    completed_at: null,
    created_by: "demo",
    created_at: nowISO(),
  };
  state.tasks.push(task);
  return task;
}

export function demoDeleteTask(id: string): void {
  const state = db();
  state.tasks = state.tasks.filter((t) => t.id !== id);
}

export function demoUpdateTaskStatus(
  taskId: string,
  status: TaskStatus,
  employeeId?: string,
): void {
  const state = db();
  const task = state.tasks.find(
    (t) => t.id === taskId && (!employeeId || t.employee_id === employeeId),
  );
  if (!task) throw new Error("Không tìm thấy nhiệm vụ của bạn.");

  task.status = status;
  task.completed_at = status === "hoan_thanh" ? nowISO() : null;
}

export function demoAttendance(period?: string): AttendanceRow[] {
  const state = db();
  const empMap = new Map(state.employees.map((e) => [e.id, e.full_name]));

  return state.attendance
    .filter((att) => !period || att.work_date.startsWith(period))
    .sort((a, b) => {
      if (a.work_date === b.work_date) return b.created_at.localeCompare(a.created_at);
      return b.work_date.localeCompare(a.work_date);
    })
    .map((att) => ({
      ...att,
      employee_name: empMap.get(att.employee_id) ?? "—",
    }));
}

export function demoRecordAttendance(input: {
  employeeId: string;
  workDate: string;
  days: number;
  note?: string | null;
}): void {
  const state = db();
  const existing = state.attendance.find(
    (a) => a.employee_id === input.employeeId && a.work_date === input.workDate,
  );
  if (existing) {
    existing.days = input.days;
    existing.note = input.note ?? null;
  } else {
    state.attendance.push({
      id: uid(),
      employee_id: input.employeeId,
      work_date: input.workDate,
      days: input.days,
      note: input.note ?? null,
      created_by: "demo",
      created_at: nowISO(),
    });
  }
}

export function demoDeleteAttendance(id: string): void {
  const state = db();
  state.attendance = state.attendance.filter((a) => a.id !== id);
}

export function demoAttendanceSummary(period: string): AttendanceSummary[] {
  const state = db();
  const map = new Map<string, number>();

  for (const att of state.attendance) {
    if (att.work_date.startsWith(period)) {
      map.set(att.employee_id, (map.get(att.employee_id) ?? 0) + att.days);
    }
  }

  return state.employees
    .filter((e) => e.active)
    .map((e) => ({
      employee_id: e.id,
      full_name: e.full_name,
      job_title: e.job_title,
      total_days: map.get(e.id) ?? 0,
    }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "vi"));
}

export function demoPayroll(period: string): PayrollRow[] {
  const state = db();
  const attMap = new Map<string, number>();
  for (const att of state.attendance) {
    if (att.work_date.startsWith(period)) {
      attMap.set(att.employee_id, (attMap.get(att.employee_id) ?? 0) + att.days);
    }
  }

  const adjMap = new Map<string, number>();
  for (const adj of state.adjustments) {
    if (adj.period === period) {
      adjMap.set(adj.employee_id, (adjMap.get(adj.employee_id) ?? 0) + adj.amount);
    }
  }

  return state.employees
    .filter((e) => e.active)
    .map((e) => {
      const total_days = attMap.get(e.id) ?? 0;
      const base_salary = Math.round(total_days * e.daily_wage);
      const adjustments = adjMap.get(e.id) ?? 0;
      const net_salary = base_salary + adjustments;

      return {
        employee_id: e.id,
        full_name: e.full_name,
        job_title: e.job_title,
        role: e.role,
        total_days,
        daily_wage: e.daily_wage,
        base_salary,
        adjustments,
        net_salary,
      };
    })
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "vi"));
}

export function demoPayrollAdjustments(period?: string): PayrollAdjustmentRow[] {
  const state = db();
  const empMap = new Map(state.employees.map((e) => [e.id, e.full_name]));

  return state.adjustments
    .filter((adj) => !period || adj.period === period)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((adj) => ({
      ...adj,
      employee_name: empMap.get(adj.employee_id) ?? "—",
    }));
}

export function demoAddPayrollAdjustment(input: {
  employeeId: string;
  period: string;
  amount: number;
  description?: string | null;
}): void {
  const state = db();
  state.adjustments.push({
    id: uid(),
    employee_id: input.employeeId,
    period: input.period,
    amount: input.amount,
    description: input.description ?? null,
    created_by: "demo",
    created_at: nowISO(),
  });
}

export function demoDeletePayrollAdjustment(id: string): void {
  const state = db();
  state.adjustments = state.adjustments.filter((adj) => adj.id !== id);
}

// --- Demo Bán hàng & Khách hàng --------------------------------------------

export function demoCustomers(search?: string): Customer[] {
  const state = db();
  const keyword = search?.trim().toLowerCase();
  return state.customers
    .filter((c) => {
      if (!keyword) return true;
      return (
        c.name.toLowerCase().includes(keyword) ||
        c.code.toLowerCase().includes(keyword) ||
        (c.phone && c.phone.includes(keyword))
      );
    })
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));
}

export function demoCreateCustomer(input: {
  code?: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  note?: string | null;
}): Customer {
  const state = db();
  const code =
    input.code?.trim().toUpperCase() ||
    `KH${Math.floor(1000 + Math.random() * 9000)}`;

  if (state.customers.some((c) => c.code.toLowerCase() === code.toLowerCase())) {
    throw new Error(`Mã khách hàng "${code}" đã tồn tại.`);
  }

  const customer: Customer = {
    id: uid(),
    code,
    name: input.name.trim(),
    phone: input.phone?.trim() || null,
    address: input.address?.trim() || null,
    note: input.note?.trim() || null,
    created_at: nowISO(),
  };

  state.customers.push(customer);
  return customer;
}

export function demoUpdateCustomer(
  id: string,
  input: {
    name: string;
    phone?: string | null;
    address?: string | null;
    note?: string | null;
  },
): void {
  const state = db();
  const customer = state.customers.find((c) => c.id === id);
  if (!customer) throw new Error("Không tìm thấy khách hàng.");

  customer.name = input.name.trim();
  customer.phone = input.phone?.trim() || null;
  customer.address = input.address?.trim() || null;
  customer.note = input.note?.trim() || null;
}

export function demoDeleteCustomer(id: string): void {
  const state = db();
  if (state.salesOrders.some((o) => o.customer_id === id)) {
    throw new Error("Không thể xóa khách hàng đã có đơn bán hàng.");
  }
  state.customers = state.customers.filter((c) => c.id !== id);
}

export function demoSalesOrders(status?: SalesOrderStatus | "all"): SalesOrderRow[] {
  const state = db();
  const custMap = new Map(state.customers.map((c) => [c.id, c]));
  const itemMap = new Map(state.items.map((i) => [i.id, i]));

  return state.salesOrders
    .filter((o) => !status || status === "all" || o.status === status)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((order) => {
      const cust = custMap.get(order.customer_id);
      const items: SalesOrderItemRow[] = state.salesOrderItems
        .filter((soi) => soi.order_id === order.id)
        .map((soi) => {
          const item = itemMap.get(soi.item_id);
          return {
            ...soi,
            item_name: item?.name ?? "—",
            item_code: item?.code ?? "—",
            item_unit: item?.unit ?? "—",
            packing_spec: item?.packing_spec ?? null,
            pack_size: item?.pack_size ?? null,
            pack_unit: item?.pack_unit ?? null,
          };
        });

      return {
        ...order,
        customer_name: cust?.name ?? "—",
        customer_phone: cust?.phone ?? null,
        customer_address: cust?.address ?? null,
        items,
      };
    });
}

export function demoSalesOrder(id: string): SalesOrderRow | null {
  const orders = demoSalesOrders("all");
  return orders.find((o) => o.id === id) ?? null;
}

export function demoCreateSalesOrder(input: {
  customerId: string;
  orderDate?: string;
  deliveryDate?: string | null;
  note?: string | null;
  items: { itemId: string; quantity: number; unitPrice: number }[];
}): SalesOrder {
  const state = db();
  const cust = state.customers.find((c) => c.id === input.customerId);
  if (!cust) throw new Error("Khách hàng không tồn tại.");
  if (!input.items || input.items.length === 0) {
    throw new Error("Đơn hàng phải có ít nhất một mặt hàng.");
  }

  const orderId = uid();
  const totalAmount = input.items.reduce(
    (sum, line) => sum + line.quantity * line.unitPrice,
    0,
  );

  const orderCode = `DHB-${todayISO().replace(/-/g, "").slice(2)}-${Math.floor(
    100 + Math.random() * 900,
  )}`;

  const order: SalesOrder = {
    id: orderId,
    code: orderCode,
    customer_id: input.customerId,
    order_date: input.orderDate || todayISO(),
    delivery_date: input.deliveryDate || null,
    status: "cho_xac_nhan",
    total_amount: totalAmount,
    paid_amount: 0,
    payment_status: "chua_thanh_toan",
    note: input.note || null,
    created_by: "demo",
    created_at: nowISO(),
  };

  state.salesOrders.push(order);

  for (const line of input.items) {
    state.salesOrderItems.push({
      id: uid(),
      order_id: orderId,
      item_id: line.itemId,
      quantity: line.quantity,
      unit_price: line.unitPrice,
      total_price: line.quantity * line.unitPrice,
    });
  }

  return order;
}

export function demoUpdateSalesOrder(input: {
  id: string;
  customerId: string;
  orderDate?: string;
  deliveryDate?: string | null;
  note?: string | null;
  items: { itemId: string; quantity: number; unitPrice: number }[];
}): void {
  const state = db();
  const order = state.salesOrders.find((o) => o.id === input.id);
  if (!order) throw new Error("Không tìm thấy đơn bán hàng.");
  if (order.status !== "cho_xac_nhan") {
    throw new Error("Chỉ có thể sửa đơn hàng đang ở trạng thái chờ xuất kho.");
  }
  const cust = state.customers.find((c) => c.id === input.customerId);
  if (!cust) throw new Error("Khách hàng không tồn tại.");
  if (!input.items || input.items.length === 0) {
    throw new Error("Đơn hàng phải có ít nhất một mặt hàng.");
  }

  const totalAmount = input.items.reduce(
    (sum, line) => sum + line.quantity * line.unitPrice,
    0,
  );

  order.customer_id = input.customerId;
  if (input.orderDate) order.order_date = input.orderDate;
  order.delivery_date = input.deliveryDate || null;
  order.note = input.note || null;
  order.total_amount = totalAmount;

  state.salesOrderItems = state.salesOrderItems.filter((soi) => soi.order_id !== input.id);
  for (const line of input.items) {
    state.salesOrderItems.push({
      id: uid(),
      order_id: input.id,
      item_id: line.itemId,
      quantity: line.quantity,
      unit_price: line.unitPrice,
      total_price: line.quantity * line.unitPrice,
    });
  }
}

export function demoConfirmSalesOrder(orderId: string): void {
  const state = db();
  const order = state.salesOrders.find((o) => o.id === orderId);
  if (!order) throw new Error("Không tìm thấy đơn hàng.");
  if (order.status !== "cho_xac_nhan") {
    throw new Error("Đơn hàng này không ở trạng thái chờ xác nhận.");
  }

  const items = state.salesOrderItems.filter((i) => i.order_id === orderId);

  // Check on-hand stock
  for (const line of items) {
    const currentStock = onHand(state, line.item_id);
    if (currentStock < line.quantity) {
      const item = state.items.find((i) => i.id === line.item_id);
      throw new Error(
        `Mặt hàng "${item?.name ?? line.item_id}" không đủ tồn kho để xuất bán: cần ${line.quantity}, chỉ còn ${currentStock}.`,
      );
    }
  }

  // Deduct inventory
  for (const line of items) {
    state.movements.push({
      id: uid(),
      item_id: line.item_id,
      type: "xuat",
      quantity: -line.quantity,
      unit_price: line.unit_price,
      supplier_id: null,
      note: `Xuất bán theo đơn ${order.code}`,
      reference_type: "sales_order",
      reference_id: order.id,
      created_by: "demo",
      created_at: nowISO(),
    });
  }

  order.status = "da_giao";
}

export function demoPaySalesOrder(
  orderId: string,
  amount: number,
  method: PaymentMethod = "tien_mat",
  note?: string,
): void {
  const state = db();
  const order = state.salesOrders.find((o) => o.id === orderId);
  if (!order) throw new Error("Không tìm thấy đơn hàng.");
  if (amount <= 0) throw new Error("Số tiền thanh toán phải lớn hơn 0.");

  const newPaid = order.paid_amount + amount;
  if (newPaid > order.total_amount) {
    throw new Error("Số tiền thanh toán vượt quá tổng giá trị đơn hàng.");
  }

  order.paid_amount = newPaid;
  order.payment_status =
    newPaid >= order.total_amount ? "da_thanh_toan" : "thanh_toan_mot_phan";

  // Create cash transaction
  demoCreateCash({
    type: "thu",
    amount,
    method,
    category: "Bán hàng",
    description: note || `Thu tiền đơn bán ${order.code}`,
    transactionDate: todayISO(),
  });
}

export function demoCancelSalesOrder(orderId: string): void {
  const state = db();
  const order = state.salesOrders.find((o) => o.id === orderId);
  if (!order) throw new Error("Không tìm thấy đơn hàng.");
  if (order.status === "da_giao") {
    throw new Error("Không thể hủy đơn hàng đã xuất kho giao hàng.");
  }
  order.status = "huy";
}

// --- Demo Mua hàng ---------------------------------------------------------

export function demoPurchaseOrders(
  status?: PurchaseOrderStatus | "all",
): PurchaseOrderRow[] {
  const state = db();
  const suppMap = new Map(state.suppliers.map((s) => [s.id, s]));
  const itemMap = new Map(state.items.map((i) => [i.id, i]));

  return state.purchaseOrders
    .filter((o) => !status || status === "all" || o.status === status)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((order) => {
      const supp = suppMap.get(order.supplier_id);
      const items: PurchaseOrderItemRow[] = state.purchaseOrderItems
        .filter((poi) => poi.order_id === order.id)
        .map((poi) => {
          const item = itemMap.get(poi.item_id);
          return {
            ...poi,
            item_name: item?.name ?? "—",
            item_code: item?.code ?? "—",
            item_unit: item?.unit ?? "—",
          };
        });

      return {
        ...order,
        supplier_name: supp?.name ?? "—",
        supplier_phone: supp?.phone ?? null,
        items,
      };
    });
}

export function demoPurchaseOrder(id: string): PurchaseOrderRow | null {
  const orders = demoPurchaseOrders("all");
  return orders.find((o) => o.id === id) ?? null;
}

export function demoCreatePurchaseOrder(input: {
  supplierId: string;
  orderDate?: string;
  deliveryDate?: string | null;
  note?: string | null;
  items: { itemId: string; quantity: number; unitPrice: number }[];
}): PurchaseOrder {
  const state = db();
  const supp = state.suppliers.find((s) => s.id === input.supplierId);
  if (!supp) throw new Error("Nhà cung cấp không tồn tại.");
  if (!input.items || input.items.length === 0) {
    throw new Error("Đơn hàng phải có ít nhất một mặt hàng.");
  }

  const orderId = uid();
  const totalAmount = input.items.reduce(
    (sum, line) => sum + line.quantity * line.unitPrice,
    0,
  );

  const orderCode = `DHN-${todayISO().replace(/-/g, "").slice(2)}-${Math.floor(
    100 + Math.random() * 900,
  )}`;

  const order: PurchaseOrder = {
    id: orderId,
    code: orderCode,
    supplier_id: input.supplierId,
    order_date: input.orderDate || todayISO(),
    delivery_date: input.deliveryDate || null,
    status: "cho_nhap_kho",
    total_amount: totalAmount,
    paid_amount: 0,
    payment_status: "chua_thanh_toan",
    note: input.note || null,
    created_by: "demo",
    created_at: nowISO(),
  };

  state.purchaseOrders.push(order);

  for (const line of input.items) {
    state.purchaseOrderItems.push({
      id: uid(),
      order_id: orderId,
      item_id: line.itemId,
      quantity: line.quantity,
      unit_price: line.unitPrice,
      total_price: line.quantity * line.unitPrice,
    });
  }

  return order;
}

export function demoConfirmPurchaseOrder(orderId: string): void {
  const state = db();
  const order = state.purchaseOrders.find((o) => o.id === orderId);
  if (!order) throw new Error("Không tìm thấy đơn mua hàng.");
  if (order.status !== "cho_nhap_kho") {
    throw new Error("Đơn hàng này không ở trạng thái chờ nhập kho.");
  }

  const items = state.purchaseOrderItems.filter((i) => i.order_id === orderId);

  // Add stock movements (nhap)
  for (const line of items) {
    state.movements.push({
      id: uid(),
      item_id: line.item_id,
      type: "nhap",
      quantity: line.quantity,
      unit_price: line.unit_price,
      supplier_id: order.supplier_id,
      note: `Nhập kho theo đơn mua ${order.code}`,
      reference_type: "purchase_order",
      reference_id: order.id,
      created_by: "demo",
      created_at: nowISO(),
    });
  }

  order.status = "da_nhap_kho";
}

export function demoPayPurchaseOrder(
  orderId: string,
  amount: number,
  method: PaymentMethod = "tien_mat",
  note?: string,
): void {
  const state = db();
  const order = state.purchaseOrders.find((o) => o.id === orderId);
  if (!order) throw new Error("Không tìm thấy đơn mua hàng.");
  if (amount <= 0) throw new Error("Số tiền thanh toán phải lớn hơn 0.");

  const newPaid = order.paid_amount + amount;
  if (newPaid > order.total_amount) {
    throw new Error("Số tiền thanh toán vượt quá giá trị đơn mua hàng.");
  }

  order.paid_amount = newPaid;
  order.payment_status =
    newPaid >= order.total_amount ? "da_thanh_toan" : "thanh_toan_mot_phan";

  // Create cash transaction (chi)
  demoCreateCash({
    type: "chi",
    amount,
    method,
    category: "Mua nguyên liệu",
    description: note || `Chi thanh toán đơn mua ${order.code}`,
    transactionDate: todayISO(),
  });
}

export function demoCancelPurchaseOrder(orderId: string): void {
  const state = db();
  const order = state.purchaseOrders.find((o) => o.id === orderId);
  if (!order) throw new Error("Không tìm thấy đơn mua hàng.");
  if (order.status === "da_nhap_kho") {
    throw new Error("Không thể hủy đơn hàng đã nhập kho.");
  }
  order.status = "huy";
}

// --- Demo Báo cáo Công nợ ---------------------------------------------------

export function demoCustomerDebts(): CustomerDebtRow[] {
  const state = db();
  const map = new Map<
    string,
    { totalSales: number; totalPaid: number }
  >();

  for (const order of state.salesOrders) {
    if (order.status === "huy") continue;
    const current = map.get(order.customer_id) ?? { totalSales: 0, totalPaid: 0 };
    current.totalSales += order.total_amount;
    current.totalPaid += order.paid_amount;
    map.set(order.customer_id, current);
  }

  return state.customers
    .map((c) => {
      const stats = map.get(c.id) ?? { totalSales: 0, totalPaid: 0 };
      const debtAmount = Math.max(stats.totalSales - stats.totalPaid, 0);
      return {
        customer_id: c.id,
        customer_code: c.code,
        customer_name: c.name,
        customer_phone: c.phone,
        total_sales: stats.totalSales,
        total_paid: stats.totalPaid,
        debt_amount: debtAmount,
      };
    })
    .filter((r) => r.total_sales > 0)
    .sort((a, b) => b.debt_amount - a.debt_amount);
}

export function demoSupplierDebts(): SupplierDebtRow[] {
  const state = db();
  const map = new Map<
    string,
    { totalPurchases: number; totalPaid: number }
  >();

  for (const order of state.purchaseOrders) {
    if (order.status === "huy") continue;
    const current = map.get(order.supplier_id) ?? { totalPurchases: 0, totalPaid: 0 };
    current.totalPurchases += order.total_amount;
    current.totalPaid += order.paid_amount;
    map.set(order.supplier_id, current);
  }

  return state.suppliers
    .map((s) => {
      const stats = map.get(s.id) ?? { totalPurchases: 0, totalPaid: 0 };
      const debtAmount = Math.max(stats.totalPurchases - stats.totalPaid, 0);
      return {
        supplier_id: s.id,
        supplier_name: s.name,
        supplier_phone: s.phone,
        total_purchases: stats.totalPurchases,
        total_paid: stats.totalPaid,
        debt_amount: debtAmount,
      };
    })
    .filter((r) => r.total_purchases > 0)
    .sort((a, b) => b.debt_amount - a.debt_amount);
}
