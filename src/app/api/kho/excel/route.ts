import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getCurrentUser } from "@/lib/auth";
import { CAN_ACCESS, ITEM_TYPE_LABELS } from "@/lib/labels";
import { getInventory } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !CAN_ACCESS.kho(user.role)) {
    return new NextResponse("Bạn không có quyền xuất báo cáo kho.", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;

  const inventory = await getInventory(q);

  const totalValue = inventory.reduce(
    (total, item) => total + Math.max(item.on_hand, 0) * item.unit_price,
    0,
  );
  const lowStockCount = inventory.filter(
    (item) => item.min_stock > 0 && item.on_hand < item.min_stock,
  ).length;

  const stamp = new Date().toISOString().slice(0, 10);

  const body: (string | number)[][] = [
    ["BÁO CÁO TỒN KHO — VƯƠNG PHÁT ERP"],
    [`Ngày xuất báo cáo: ${stamp}${q ? ` — Tìm kiếm: "${q}"` : ""}`],
    [],
    [
      "STT",
      "Mã hàng",
      "Tên hàng hóa",
      "Phân loại",
      "ĐVT",
      "Đơn giá (VNĐ)",
      "Định mức tồn",
      "Tồn kho thực tế",
      "Thành tiền (VNĐ)",
      "Trạng thái",
    ],
    ...inventory.map((item, idx) => {
      const isLow = item.min_stock > 0 && item.on_hand < item.min_stock;
      const itemValue = Math.max(item.on_hand, 0) * item.unit_price;
      return [
        idx + 1,
        item.code,
        item.name,
        ITEM_TYPE_LABELS[item.type] ?? item.type,
        item.unit,
        item.unit_price,
        item.min_stock,
        item.on_hand,
        itemValue,
        isLow ? "Dưới định mức" : "Đạt định mức",
      ];
    }),
    [],
    ["", "", "", "", "", "", "Tổng mặt hàng", inventory.length, ""],
    ["", "", "", "", "", "", "Mặt hàng dưới định mức", lowStockCount, ""],
    ["", "", "", "", "", "", "Tổng giá trị tồn kho", totalValue, ""],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(body);
  worksheet["!cols"] = [
    { wch: 6 },  // STT
    { wch: 15 }, // Mã
    { wch: 35 }, // Tên
    { wch: 15 }, // Phân loại
    { wch: 10 }, // ĐVT
    { wch: 16 }, // Đơn giá
    { wch: 14 }, // Định mức
    { wch: 16 }, // Tồn kho
    { wch: 18 }, // Thành tiền
    { wch: 16 }, // Trạng thái
  ];

  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Ton kho");

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  }) as Buffer;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="ton-kho-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
