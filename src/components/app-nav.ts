import {
  ArrowLeftRight,
  Boxes,
  Factory,
  FlaskConical,
  LayoutDashboard,
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
    ],
  },
];
