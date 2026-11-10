import type {
  Bom,
  BomItem,
  BomLine,
  BomRow,
  CashFilter,
  CashRow,
  CashTransaction,
  DashboardData,
  InventoryItem,
  Item,
  ItemType,
  MovementRow,
  MovementType,
  ProductionOrder,
  ProductionRow,
  StockMovement,
  Supplier,
} from "@/lib/types";
import { lastMonths, monthKey, todayISO } from "@/lib/format";

type DemoState = {
  items: Item[];
  suppliers: Supplier[];
  movements: StockMovement[];
  boms: (Bom & { items: BomItem[] })[];
  orders: ProductionOrder[];
  cash: CashTransaction[];
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
    { id: "tp-001", code: "TP001", name: "Bánh mì bơ", unit: "cái", type: "thanh_pham", unit_price: 15_000, min_stock: 20, created_at: daysAgo(120) },
    { id: "tp-002", code: "TP002", name: "Bánh kem sữa", unit: "cái", type: "thanh_pham", unit_price: 220_000, min_stock: 5, created_at: daysAgo(120) },
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
  addMovement({ itemId: "tp-001", type: "nhap", quantity: 30, unitPrice: 10_000, note: "Tồn đầu kỳ", createdAt: daysAgo(30) });
  addMovement({ itemId: "tp-002", type: "nhap", quantity: 8, unitPrice: 120_000, note: "Tồn đầu kỳ", createdAt: daysAgo(30) });
  addMovement({ itemId: "nl-001", type: "nhap", quantity: 50, unitPrice: 25_000, supplierId: "ncc-001", note: "Bổ sung bột", createdAt: daysAgo(12) });

  // Lệnh sản xuất đã hoàn thành 3 ngày trước (10 bánh mì bơ).
  const completedOrder: ProductionOrder = {
    id: "lsx-001",
    code: "LSX-2601-001",
    product_id: "tp-001",
    quantity: 10,
    status: "hoan_thanh",
    planned_date: dateDaysAgo(4),
    completed_at: daysAgo(3),
    note: "Lô bánh buổi sáng",
    created_by: null,
    created_at: daysAgo(5),
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
      id: "bom-002",
      product_id: "tp-002",
      output_quantity: 1,
      note: "Bánh kem cỡ 20cm",
      created_at: daysAgo(45),
      updated_at: daysAgo(20),
      items: [
        { id: "bom-item-005", bom_id: "bom-002", material_id: "nl-001", quantity: 0.3 },
        { id: "bom-item-006", bom_id: "bom-002", material_id: "nl-002", quantity: 0.15 },
        { id: "bom-item-007", bom_id: "bom-002", material_id: "nl-003", quantity: 0.1 },
        { id: "bom-item-008", bom_id: "bom-002", material_id: "nl-004", quantity: 2 },
        { id: "bom-item-009", bom_id: "bom-002", material_id: "nl-005", quantity: 0.2 },
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

  return { items, suppliers, movements, boms, orders, cash };
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
  if (input.onHand !== undefined) {
    applyStockTarget(state, item.id, input.onHand, item.unit_price, "Điều chỉnh tồn kho");
  }
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
  const product = state.items.find((item) => item.id === input.productId && item.type === "thanh_pham");
  if (!product) throw new Error("Thành phẩm không hợp lệ");
  if (!Number.isFinite(input.outputQuantity) || input.outputQuantity <= 0) {
    throw new Error("Số lượng đầu ra phải lớn hơn 0");
  }
  if (!input.lines.length) throw new Error("Công thức phải có ít nhất một nguyên liệu");

  const seen = new Set<string>();
  for (const line of input.lines) {
    if (seen.has(line.materialId)) throw new Error("Nguyên liệu bị lặp trong công thức");
    seen.add(line.materialId);
    const material = state.items.find(
      (item) => item.id === line.materialId && item.type === "nguyen_lieu",
    );
    if (!material) throw new Error("Nguyên liệu không hợp lệ");
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
  const product = state.items.find((item) => item.id === input.productId && item.type === "thanh_pham");
  if (!product) throw new Error("Thành phẩm không hợp lệ");
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

export function demoConfirmOrder(orderId: string): void {
  const state = db();
  const order = state.orders.find((entry) => entry.id === orderId);
  if (!order) throw new Error("Không tìm thấy lệnh sản xuất");
  if (order.status !== "cho_xac_nhan") throw new Error("Lệnh sản xuất đã được xử lý");

  const bom = state.boms.find((entry) => entry.product_id === order.product_id);
  if (!bom) throw new Error("Thành phẩm chưa có công thức định lượng (BOM)");
  if (!bom.items.length) throw new Error("Công thức định lượng đang rỗng");

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

  const totalCost = needed.reduce((total, entry) => {
    const material = state.items.find((item) => item.id === entry.line.material_id);
    return total + entry.required * (material?.unit_price ?? 0);
  }, 0);

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
    quantity: order.quantity,
    unit_price: Math.round(totalCost / order.quantity),
    supplier_id: null,
    note: `Nhập thành phẩm từ lệnh ${order.code}`,
    reference_type: "production_order",
    reference_id: order.id,
    created_by: null,
    created_at: nowISO(),
  });

  order.status = "hoan_thanh";
  order.completed_at = nowISO();
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
