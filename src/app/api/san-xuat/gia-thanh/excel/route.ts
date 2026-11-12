import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getCurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { CAN_ACCESS } from "@/lib/labels";
import { getProductionCostReport } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !CAN_ACCESS.sanXuatGiaThanh(user.role)) {
    return new NextResponse("Bạn không có quyền xuất báo cáo giá thành sản xuất.", {
      status: 403,
    });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const productId = searchParams.get("productId") || "all";

  const rows = await getProductionCostReport({ from, to, productId });

  const totalPlanned = rows.reduce((acc, r) => acc + r.planned_quantity, 0);
  const totalActual = rows.reduce((acc, r) => acc + r.actual_quantity, 0);
  const totalWaste = rows.reduce((acc, r) => acc + r.waste_quantity, 0);
  const totalMaterial = rows.reduce((acc, r) => acc + r.material_cost, 0);
  const totalLabor = rows.reduce((acc, r) => acc + r.labor_cost, 0);
  const totalOther = rows.reduce((acc, r) => acc + r.other_cost, 0);
  const totalCost = rows.reduce((acc, r) => acc + r.total_cost, 0);

  const stamp = new Date().toISOString().slice(0, 10);

  const body: (string | number)[][] = [
    ["BÁO CÁO GIÁ THÀNH VÀ PHÂN TÍCH HAO HỤT SẢN XUẤT — VƯỢNG PHÁT INK"],
    [`Ngày xuất báo cáo: ${stamp}${from ? ` | Từ ngày: ${from}` : ""}${to ? ` | Đến ngày: ${to}` : ""}`],
    [],
    [
      "STT",
      "Mã lệnh",
      "Ngày hoàn thành",
      "Mã TP",
      "Tên thành phẩm",
      "ĐVT",
      "SL Kế hoạch",
      "SL Đạt chuẩn",
      "Phế phẩm (lỗi)",
      "Tỷ lệ hao hụt (%)",
      "Chi phí NVL (VNĐ)",
      "Chi phí Nhân công (VNĐ)",
      "Chi phí Chung (VNĐ)",
      "Tổng chi phí lệnh (VNĐ)",
      "Giá thành / ĐV (VNĐ)",
      "Giá bán niêm yết (VNĐ)",
      "Biên lãi gộp (%)",
      "Ghi chú",
    ],
    ...rows.map((r, idx) => [
      idx + 1,
      r.order_code,
      formatDate(r.completed_at),
      r.product_code,
      r.product_name,
      r.product_unit,
      r.planned_quantity,
      r.actual_quantity,
      r.waste_quantity,
      `${r.waste_rate}%`,
      r.material_cost,
      r.labor_cost,
      r.other_cost,
      r.total_cost,
      r.unit_cost,
      r.product_sale_price > 0 ? r.product_sale_price : "",
      r.product_sale_price > 0 ? `${r.gross_margin_rate}%` : "",
      r.note || "",
    ]),
    [],
    [
      "",
      "",
      "",
      "",
      "Tổng cộng",
      "",
      totalPlanned,
      totalActual,
      totalWaste,
      "",
      totalMaterial,
      totalLabor,
      totalOther,
      totalCost,
      "",
      "",
      "",
      "",
    ],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(body);
  worksheet["!cols"] = [
    { wch: 6 },  // STT
    { wch: 18 }, // Mã lệnh
    { wch: 14 }, // Ngày
    { wch: 12 }, // Mã TP
    { wch: 28 }, // Tên TP
    { wch: 8 },  // ĐVT
    { wch: 14 }, // SL Kế hoạch
    { wch: 14 }, // SL Đạt
    { wch: 14 }, // Phế phẩm
    { wch: 16 }, // Hao hụt %
    { wch: 18 }, // Chi phí NVL
    { wch: 20 }, // Chi phí Nhân công
    { wch: 18 }, // Chi phí Chung
    { wch: 22 }, // Tổng chi phí
    { wch: 18 }, // Giá thành/đv
    { wch: 18 }, // Giá bán
    { wch: 14 }, // Biên lãi
    { wch: 30 }, // Ghi chú
  ];

  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 17 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 17 } },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Gia thanh san xuat");

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  }) as Buffer;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="gia-thanh-san-xuat-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
