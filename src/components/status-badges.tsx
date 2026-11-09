import { Badge } from "@/components/ui/badge";
import {
  CASH_TYPE_LABELS,
  ITEM_TYPE_LABELS,
  MOVEMENT_TYPE_LABELS,
  PRODUCTION_STATUS_LABELS,
} from "@/lib/labels";
import type {
  CashType,
  ItemType,
  MovementType,
  ProductionStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const MOVEMENT_TONE: Record<MovementType, string> = {
  nhap: "bg-emerald-100 text-emerald-700 border-emerald-200",
  xuat: "bg-rose-100 text-rose-700 border-rose-200",
  dieu_chinh: "bg-slate-100 text-slate-700 border-slate-200",
  san_xuat_tieu_hao: "bg-amber-100 text-amber-700 border-amber-200",
  san_xuat_nhap: "bg-blue-100 text-blue-700 border-blue-200",
};

export function MovementTypeBadge({ type }: { type: MovementType }) {
  return (
    <Badge variant="outline" className={cn("font-normal", MOVEMENT_TONE[type])}>
      {MOVEMENT_TYPE_LABELS[type]}
    </Badge>
  );
}

const STATUS_TONE: Record<ProductionStatus, string> = {
  cho_xac_nhan: "bg-amber-100 text-amber-700 border-amber-200",
  hoan_thanh: "bg-emerald-100 text-emerald-700 border-emerald-200",
  huy: "bg-slate-100 text-slate-600 border-slate-200",
};

export function ProductionStatusBadge({
  status,
}: {
  status: ProductionStatus;
}) {
  return (
    <Badge variant="outline" className={cn("font-normal", STATUS_TONE[status])}>
      {PRODUCTION_STATUS_LABELS[status]}
    </Badge>
  );
}

export function ItemTypeBadge({ type }: { type: ItemType }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-normal",
        type === "thanh_pham"
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-slate-200 bg-slate-50 text-slate-600",
      )}
    >
      {ITEM_TYPE_LABELS[type]}
    </Badge>
  );
}

export function CashTypeBadge({ type }: { type: CashType }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-normal",
        type === "thu"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-rose-200 bg-rose-50 text-rose-700",
      )}
    >
      {CASH_TYPE_LABELS[type]}
    </Badge>
  );
}
