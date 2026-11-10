import {
  ArrowLeftRight,
  Banknote,
  Boxes,
  CalendarCheck,
  ClipboardList,
  Factory,
  FlaskConical,
  LayoutDashboard,
  ListTodo,
  Scale,
  ShoppingCart,
  Truck,
  Users,
  UsersRound,
  Wallet,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { CAN_ACCESS } from "@/lib/labels";
import type { Role } from "@/lib/types";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  allowed: (role: Role) => boolean;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Tổng quan",
    items: [
      {
        href: "/",
        label: "Bảng điều khiển",
        icon: LayoutDashboard,
        allowed: CAN_ACCESS.dashboard,
      },
      {
        href: "/cong-viec",
        label: "Việc của tôi",
        icon: ListTodo,
        allowed: CAN_ACCESS.myTasks,
      },
    ],
  },
  {
    title: "Bán hàng",
    items: [
      {
        href: "/ban-hang",
        label: "Đơn bán hàng",
        icon: ShoppingCart,
        allowed: CAN_ACCESS.banHang,
      },
      {
        href: "/ban-hang/khach-hang",
        label: "Khách hàng",
        icon: UsersRound,
        allowed: CAN_ACCESS.banHang,
      },
    ],
  },
  {
    title: "Kho",
    items: [
      {
        href: "/kho",
        label: "Tồn kho",
        icon: Warehouse,
        allowed: CAN_ACCESS.kho,
      },
      {
        href: "/kho/nhap-xuat",
        label: "Nhập / xuất kho",
        icon: ArrowLeftRight,
        allowed: CAN_ACCESS.kho,
      },
      {
        href: "/kho/danh-muc",
        label: "Danh mục hàng hóa",
        icon: Boxes,
        allowed: CAN_ACCESS.kho,
      },
    ],
  },
  {
    title: "Mua hàng",
    items: [
      {
        href: "/mua-hang",
        label: "Đơn mua hàng",
        icon: Truck,
        allowed: CAN_ACCESS.muaHang,
      },
    ],
  },
  {
    title: "Sản xuất",
    items: [
      {
        href: "/san-xuat",
        label: "Lệnh sản xuất",
        icon: Factory,
        allowed: CAN_ACCESS.sanXuat,
      },
      {
        href: "/san-xuat/cong-thuc",
        label: "Công thức (BOM)",
        icon: FlaskConical,
        allowed: CAN_ACCESS.sanXuat,
      },
    ],
  },
  {
    title: "Kế toán",
    items: [
      {
        href: "/ke-toan",
        label: "Sổ quỹ thu chi",
        icon: Wallet,
        allowed: CAN_ACCESS.keToan,
      },
      {
        href: "/ke-toan/cong-no",
        label: "Quản lý công nợ",
        icon: Scale,
        allowed: CAN_ACCESS.keToan,
      },
    ],
  },
  {
    title: "Nhân sự",
    items: [
      {
        href: "/nhan-su",
        label: "Nhân viên",
        icon: Users,
        allowed: CAN_ACCESS.nhanSu,
      },
      {
        href: "/nhan-su/cong-viec",
        label: "Giao việc",
        icon: ClipboardList,
        allowed: CAN_ACCESS.nhanSu,
      },
      {
        href: "/nhan-su/cham-cong",
        label: "Chấm công",
        icon: CalendarCheck,
        allowed: CAN_ACCESS.nhanSu,
      },
      {
        href: "/nhan-su/bang-luong",
        label: "Bảng lương",
        icon: Banknote,
        allowed: CAN_ACCESS.nhanSu,
      },
    ],
  },
];
