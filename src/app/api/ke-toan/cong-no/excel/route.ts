import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getCurrentUser } from "@/lib/auth";
import { CAN_ACCESS } from "@/lib/labels";
import { getCustomerDebts, getSupplierDebts } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !CAN_ACCESS.keToan(user.role)) {
    return new NextResponse("Bạn không có quyền xuất báo cáo công nợ.", {
      status: 403,
    });
  }

  const [customerDebts, supplierDebts] = await Promise.all([
    getCustomerDebts(),
    getSupplierDebts(),
  ]);

  const stamp = new Date().toISOString().slice(0, 10);
  const workbook = XLSX.utils.book_new();

  // 1. Sheet Khách hàng
  const totalCustSales = customerDebts.reduce((s, c) => s + c.total_sales, 0);
  const totalCustPaid = customerDebts.reduce((s, c) => s + c.total_paid, 0);
  const totalCustDebt = customerDebts.reduce((s, c) => s + c.debt_amount, 0);

  const custBody: (string | number)[][] = [
    ["BÁO CÁO CÔNG NỢ PHẢI THU (KHÁCH HÀNG) — VƯỢNG PHÁT INK"],
    [`Ngày xuất báo cáo: ${stamp}`],
    [],
    [
      "STT",
      "Mã KH",
      "Tên khách hàng",
      "Số điện thoại",
      "Tổng doanh số mua (VNĐ)",
      "Đã thanh toán (VNĐ)",
      "Còn nợ (Phải thu VNĐ)",
    ],
    ...customerDebts.map((c, idx) => [
      idx + 1,
      c.customer_code,
      c.customer_name,
      c.customer_phone || "",
      c.total_sales,
      c.total_paid,
      c.debt_amount,
    ]),
    [],
    ["", "", "", "Tổng cộng", totalCustSales, totalCustPaid, totalCustDebt],
  ];

  const custSheet = XLSX.utils.aoa_to_sheet(custBody);
  custSheet["!cols"] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 32 },
    { wch: 16 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
  ];
  custSheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
  ];
  XLSX.utils.book_append_sheet(workbook, custSheet, "Cong no Phai thu");

  // 2. Sheet Nhà cung cấp
  const totalSuppPurchases = supplierDebts.reduce(
    (s, c) => s + c.total_purchases,
    0,
  );
  const totalSuppPaid = supplierDebts.reduce((s, c) => s + c.total_paid, 0);
  const totalSuppDebt = supplierDebts.reduce((s, c) => s + c.debt_amount, 0);

  const suppBody: (string | number)[][] = [
    ["BÁO CÁO CÔNG NỢ PHẢI TRẢ (NHÀ CUNG CẤP) — VƯỢNG PHÁT INK"],
    [`Ngày xuất báo cáo: ${stamp}`],
    [],
    [
      "STT",
      "Tên nhà cung cấp",
      "Số điện thoại",
      "Tổng tiền đặt mua (VNĐ)",
      "Đã thanh toán (VNĐ)",
      "Còn nợ (Phải trả VNĐ)",
    ],
    ...supplierDebts.map((s, idx) => [
      idx + 1,
      s.supplier_name,
      s.supplier_phone || "",
      s.total_purchases,
      s.total_paid,
      s.debt_amount,
    ]),
    [],
    ["", "", "Tổng cộng", totalSuppPurchases, totalSuppPaid, totalSuppDebt],
  ];

  const suppSheet = XLSX.utils.aoa_to_sheet(suppBody);
  suppSheet["!cols"] = [
    { wch: 6 },
    { wch: 32 },
    { wch: 16 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
  ];
  suppSheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
  ];
  XLSX.utils.book_append_sheet(workbook, suppSheet, "Cong no Phai tra");

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  }) as Buffer;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="bao-cao-cong-no-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
