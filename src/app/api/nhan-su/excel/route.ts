import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getCurrentUser } from "@/lib/auth";
import { currentPeriod, periodLabel } from "@/lib/format";
import { CAN_ACCESS, ROLE_LABELS } from "@/lib/labels";
import { getPayroll } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !CAN_ACCESS.nhanSu(user.role)) {
    return new NextResponse("Bạn không có quyền xuất bảng lương.", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const periodParam = searchParams.get("period");
  const period =
    periodParam && /^\d{4}-\d{2}$/.test(periodParam)
      ? periodParam
      : currentPeriod();

  const payroll = await getPayroll(period);

  const totalDays = payroll.reduce((sum, r) => sum + r.total_days, 0);
  const totalBase = payroll.reduce((sum, r) => sum + r.base_salary, 0);
  const totalAdj = payroll.reduce((sum, r) => sum + r.adjustments, 0);
  const totalNet = payroll.reduce((sum, r) => sum + r.net_salary, 0);

  const body: (string | number)[][] = [
    ["BẢNG LƯƠNG NHÂN VIÊN — VƯỢNG PHÁT INK"],
    [`Kỳ tính lương: ${periodLabel(period)} (${period})`],
    [],
    [
      "STT",
      "Họ và tên",
      "Chức vụ / Vị trí",
      "Vai trò hệ thống",
      "Tổng ngày công",
      "Lương theo ngày (VNĐ)",
      "Lương ngày công (VNĐ)",
      "Thưởng / Khấu trừ (VNĐ)",
      "Thực lĩnh (VNĐ)",
    ],
    ...payroll.map((row, idx) => [
      idx + 1,
      row.full_name,
      row.job_title ?? "—",
      ROLE_LABELS[row.role] ?? row.role,
      row.total_days,
      row.daily_wage,
      row.base_salary,
      row.adjustments,
      row.net_salary,
    ]),
    [],
    ["", "", "", "Tổng cộng", totalDays, "", totalBase, totalAdj, totalNet],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(body);
  worksheet["!cols"] = [
    { wch: 6 },  // STT
    { wch: 25 }, // Họ và tên
    { wch: 20 }, // Chức vụ
    { wch: 18 }, // Vai trò
    { wch: 16 }, // Ngày công
    { wch: 22 }, // Lương ngày
    { wch: 22 }, // Lương cơ bản
    { wch: 24 }, // Thưởng/khấu trừ
    { wch: 22 }, // Thực lĩnh
  ];

  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Luong ${period}`);

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  }) as Buffer;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="bang-luong-${period}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
