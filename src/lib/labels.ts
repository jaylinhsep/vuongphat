import type { CashType, ItemType, MovementType, PaymentMethod, ProductionStatus, Role, TaskStatus } from "@/lib/types";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Quản trị",
  kho: "Kho",
  san_xuat: "Sản xuất",
  ke_toan: "Kế toán",
};

export const HOME_PATH: Record<Role, string> = {
  admin: "/",
  kho: "/kho",
  san_xuat: "/san-xuat",
  ke_toan: "/ke-toan",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  admin: "Toàn quyền hệ thống",
  kho: "Quản lý hàng hóa và phiếu kho",
  san_xuat: "Công thức và lệnh sản xuất",
  ke_toan: "Sổ quỹ thu chi",
};

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  nguyen_lieu: "Nguyên liệu",
  thanh_pham: "Thành phẩm",
};

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  nhap: "Nhập kho",
  xuat: "Xuất kho",
  dieu_chinh: "Điều chỉnh",
  san_xuat_tieu_hao: "Xuất sản xuất",
  san_xuat_nhap: "Nhập thành phẩm",
};

export const PRODUCTION_STATUS_LABELS: Record<ProductionStatus, string> = {
  cho_xac_nhan: "Chờ xác nhận",
  hoan_thanh: "Hoàn thành",
  huy: "Đã huỷ",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  can_lam: "Cần làm",
  hoan_thanh: "Hoàn thành",
};

export const CASH_TYPE_LABELS: Record<CashType, string> = {
  thu: "Thu",
  chi: "Chi",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  tien_mat: "Tiền mặt",
  ngan_hang: "Ngân hàng",
};

export const CASH_CATEGORIES = [
  "Bán hàng",
  "Mua nguyên liệu",
  "Lương nhân viên",
  "Vận chuyển",
  "Điện nước",
  "Mặt bằng",
  "Khác",
];

export const CAN_ACCESS = {
  dashboard: (role: Role) => role === "admin",
  kho: (role: Role) => role === "admin" || role === "kho" || role === "ke_toan",
  khoWrite: (role: Role) => role === "admin" || role === "kho",
  sanXuat: (role: Role) => role === "admin" || role === "san_xuat",
  keToan: (role: Role) => role === "admin" || role === "ke_toan",
  nhanSu: (role: Role) => role === "admin",
  myTasks: () => true,
} as const;
