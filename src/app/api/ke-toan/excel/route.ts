import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getCurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { CAN_ACCESS, PAYMENT_METHOD_LABELS, CASH_TYPE_LABELS } from "@/lib/labels";
import { getCashTransactions } from "@/lib/queries";
import type { CashType } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !CAN_ACCESS.keToan(user.role)) {
    return new NextResponse("Bạn không có quyền xuất báo cáo.", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const typeParam = searchParams.get("type");
  const type =
    typeParam === "thu" || typeParam === "chi"
      ? (typeParam as CashType)
      : "all";

  const rows = await getCashTransactions({ from, to, type });

  const totalThu = rows
    .filter((row) => row.type === "thu")
    .reduce((total, row) => total + row.amount, 0);
  const totalChi = rows
    .filter((row) => row.type === "chi")
    .reduce((total, row) => total + row.amount, 0);

  const body: (string | number)[][] = [
    ["SỔ QUỸ THU CHI — VƯỢNG PHÁT INK"],
    [
      `Kỳ báo cáo: ${from ? formatDate(from) : "từ đầu"} — ${
        to ? formatDate(to) : "hiện tại"
      }`,
    ],
    [],
    [
      "Ngày",
      "Loại",
      "Danh mục",
      "Diễn giải",
      "Hình thức",
      "Số tiền (VNĐ)",
      "Người tạo",
    ],
    ...rows.map((row) => [
      formatDate(row.transaction_date),
      CASH_TYPE_LABELS[row.type],
      row.category,
      row.description ?? "",
      PAYMENT_METHOD_LABELS[row.method],
      row.type === "thu" ? row.amount : -row.amount,
      row.created_by_name ?? "",
    ]),
    [],
    ["", "", "", "", "Tổng thu", totalThu],
    ["", "", "", "", "Tổng chi", totalChi],
    ["", "", "", "", "Số dư", totalThu - totalChi],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(body);
  worksheet["!cols"] = [
    { wch: 12 },
    { wch: 8 },
    { wch: 20 },
    { wch: 40 },
    { wch: 14 },
    { wch: 18 },
    { wch: 20 },
  ];
  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "So quy");

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  }) as Buffer;

  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="so-quy-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
