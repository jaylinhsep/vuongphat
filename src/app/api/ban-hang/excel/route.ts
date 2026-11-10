import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getCurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import {
  CAN_ACCESS,
  PAYMENT_STATUS_LABELS,
  SALES_ORDER_STATUS_LABELS,
} from "@/lib/labels";
import { getSalesOrders } from "@/lib/queries";
import type { SalesOrderStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !CAN_ACCESS.banHang(user.role)) {
    return new NextResponse("Bạn không có quyền xuất báo cáo bán hàng.", {
      status: 403,
    });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const status: SalesOrderStatus | "all" =
    statusParam === "cho_xac_nhan" ||
    statusParam === "da_giao" ||
    statusParam === "huy"
      ? statusParam
      : "all";

  const orders = await getSalesOrders(status);

  const totalAmount = orders.reduce((sum, o) => sum + o.total_amount, 0);
  const totalPaid = orders.reduce((sum, o) => sum + o.paid_amount, 0);
  const totalDebt = totalAmount - totalPaid;

  const stamp = new Date().toISOString().slice(0, 10);

  const body: (string | number)[][] = [
    ["BÁO CÁO ĐƠN HÀNG BÁN — VƯƠNG PHÁT ERP"],
    [`Ngày xuất báo cáo: ${stamp}`],
    [],
    [
      "STT",
      "Mã đơn hàng",
      "Ngày đặt",
      "Khách hàng",
      "Số điện thoại",
      "Trạng thái giao",
      "Tổng tiền (VNĐ)",
      "Đã thanh toán (VNĐ)",
      "Còn nợ (VNĐ)",
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
        o.customer_name,
        o.customer_phone || "",
        SALES_ORDER_STATUS_LABELS[o.status] ?? o.status,
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
    { wch: 28 }, // Khách hàng
    { wch: 16 }, // SĐT
    { wch: 16 }, // Trạng thái giao
    { wch: 18 }, // Tổng tiền
    { wch: 18 }, // Đã thanh toán
    { wch: 18 }, // Còn nợ
    { wch: 20 }, // Trạng thái thanh toán
    { wch: 45 }, // Chi tiết
  ];

  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Don ban hang");

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  }) as Buffer;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="don-ban-hang-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
