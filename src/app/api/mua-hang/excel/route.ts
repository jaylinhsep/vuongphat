import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getCurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import {
  CAN_ACCESS,
  PAYMENT_STATUS_LABELS,
  PURCHASE_ORDER_STATUS_LABELS,
} from "@/lib/labels";
import { getPurchaseOrders } from "@/lib/queries";
import type { PurchaseOrderStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !CAN_ACCESS.muaHang(user.role)) {
    return new NextResponse("Bạn không có quyền xuất báo cáo mua hàng.", {
      status: 403,
    });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const status: PurchaseOrderStatus | "all" =
    statusParam === "cho_nhap_kho" ||
    statusParam === "da_nhap_kho" ||
    statusParam === "huy"
      ? statusParam
      : "all";

  const orders = await getPurchaseOrders(status);

  const totalAmount = orders.reduce((sum, o) => sum + o.total_amount, 0);
  const totalPaid = orders.reduce((sum, o) => sum + o.paid_amount, 0);
  const totalDebt = totalAmount - totalPaid;

  const stamp = new Date().toISOString().slice(0, 10);

  const body: (string | number)[][] = [
    ["BÁO CÁO ĐƠN HÀNG MUA — VƯƠNG PHÁT ERP"],
    [`Ngày xuất báo cáo: ${stamp}`],
    [],
    [
      "STT",
      "Mã đơn mua",
      "Ngày đặt",
      "Nhà cung cấp",
      "Số điện thoại",
      "Trạng thái nhập kho",
      "Tổng tiền (VNĐ)",
      "Đã thanh toán (VNĐ)",
      "Còn nợ NCC (VNĐ)",
      "Trạng thái thanh toán",
      "Chi tiết mặt hàng",
    ],
    ...orders.map((o, idx) => {
      const debt = Math.max(o.total_amount - o.paid_amount, 0);
      const itemsDetail = o.items
        .map((i) => `${i.item_name} (${i.quantity} ${i.item_unit})`)
        .join("; ");

      return [
        idx + 1,
        o.code,
        formatDate(o.order_date),
        o.supplier_name,
        o.supplier_phone || "",
        PURCHASE_ORDER_STATUS_LABELS[o.status] ?? o.status,
        o.total_amount,
        o.paid_amount,
        debt,
        PAYMENT_STATUS_LABELS[o.payment_status] ?? o.payment_status,
        itemsDetail,
      ];
    }),
    [],
    [
      "",
      "",
      "",
      "",
      "",
      "Tổng cộng",
      totalAmount,
      totalPaid,
      totalDebt,
      "",
      "",
    ],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(body);
  worksheet["!cols"] = [
    { wch: 6 },  // STT
    { wch: 18 }, // Mã
    { wch: 14 }, // Ngày
    { wch: 28 }, // NCC
    { wch: 16 }, // SĐT
    { wch: 20 }, // Trạng thái nhập kho
    { wch: 18 }, // Tổng tiền
    { wch: 18 }, // Đã trả
    { wch: 18 }, // Còn nợ
    { wch: 20 }, // TT thanh toán
    { wch: 45 }, // Chi tiết
  ];

  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Don mua hang");

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  }) as Buffer;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="don-mua-hang-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
