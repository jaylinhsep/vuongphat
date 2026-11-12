"use client";

import { useEffect, useState } from "react";
import { PrinterIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, formatQuantity } from "@/lib/format";
import type { ProductionRow } from "@/lib/types";

function formatPrintTime(value: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}

export function PrintDeliveryDocument({
  order,
  printerName,
}: {
  order: ProductionRow;
  printerName: string;
}) {
  const [printedAt, setPrintedAt] = useState("");

  useEffect(() => {
    setPrintedAt(formatPrintTime(new Date()));
    const timer = setTimeout(() => window.print(), 400);
    return () => clearTimeout(timer);
  }, []);

  const deliveredQty = order.actual_quantity ?? order.quantity;

  return (
    <div className="flex min-h-screen flex-col items-center bg-muted/40 py-6 print:min-h-0 print:bg-white print:py-0">
      <div className="print-hide mb-4 flex w-[210mm] max-w-full items-center justify-between gap-2 px-1">
        <p className="text-sm text-muted-foreground">
          Phiếu bàn giao / giao hàng thành phẩm (khổ A4 — không hiện giá tiền).
        </p>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => window.print()}>
            <PrinterIcon /> In phiếu giao hàng
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.close()}>
            <XIcon /> Đóng
          </Button>
        </div>
      </div>

      <div className="print-sheet flex w-[210mm] min-h-[297mm] max-w-full flex-col bg-white p-[14mm] text-black shadow-lg print:w-full print:max-w-none print:p-0 print:shadow-none">
        {/* Tiêu đề */}
        <div className="flex items-start justify-between gap-4 border-b-2 border-black pb-3">
          <div>
            <p className="text-lg font-bold uppercase tracking-wider">CÔNG TY TNHH VƯỢNG PHÁT INK</p>
            <p className="text-xs text-neutral-600">
              Phân xưởng Sản xuất &amp; Kiểm soát Chất lượng
            </p>
          </div>
          <div className="text-right">
            <h1 className="text-xl font-bold uppercase tracking-wide">
              PHIẾU GIAO HÀNG THÀNH PHẨM
            </h1>
            <p className="font-mono text-sm font-semibold text-neutral-800">
              Theo lệnh: {order.code}
            </p>
          </div>
        </div>

        <p className="mt-2 text-right text-xs text-neutral-600">
          Ngày giờ in: <span className="font-semibold">{printedAt || "…"}</span>
        </p>

        {/* Thông tin lệnh sản xuất & bàn giao */}
        <div className="mt-4 rounded-lg border border-neutral-300 p-3 text-sm">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <div className="flex gap-2">
              <span className="w-32 shrink-0 text-neutral-600">Mã lệnh SX:</span>
              <span className="font-mono font-bold text-neutral-900">{order.code}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-32 shrink-0 text-neutral-600">Ngày kế hoạch:</span>
              <span className="font-semibold">{formatDate(order.planned_date)}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-32 shrink-0 text-neutral-600">Tên mặt hàng:</span>
              <span className="font-bold text-neutral-900">{order.product_name}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-32 shrink-0 text-neutral-600">Mã mặt hàng:</span>
              <span className="font-mono font-medium text-neutral-800">{order.product_code}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-32 shrink-0 text-neutral-600">Đơn vị tính:</span>
              <span className="font-medium">{order.product_unit}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-32 shrink-0 text-neutral-600">Trạng thái:</span>
              <span className="font-semibold">
                {order.status === "hoan_thanh" ? "Đã nghiệm thu hoàn thành" : "Đang sản xuất / Chờ nghiệm thu"}
              </span>
            </div>
            {order.note && (
              <div className="col-span-2 flex gap-2">
                <span className="w-32 shrink-0 text-neutral-600">Ghi chú sản xuất:</span>
                <span className="italic text-neutral-700">{order.note}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bảng chi tiết bàn giao (KHÔNG HIỆN GIÁ) */}
        <h2 className="mt-5 text-sm font-bold uppercase tracking-wide">
          CHI TIẾT BÀN GIAO SẢN PHẨM
        </h2>

        <div className="mt-2 overflow-x-auto">
          <table className="print-table w-full border-collapse border border-black text-sm">
            <thead>
              <tr className="bg-neutral-100 print:bg-neutral-100">
                <th className="border border-black px-2 py-2 text-center font-bold w-12">
                  STT
                </th>
                <th className="border border-black px-3 py-2 text-left font-bold w-28">
                  Mã hàng
                </th>
                <th className="border border-black px-3 py-2 text-left font-bold">
                  Tên mặt hàng bàn giao
                </th>
                <th className="border border-black px-3 py-2 text-center font-bold w-20">
                  ĐVT
                </th>
                <th className="border border-black px-3 py-2 text-right font-bold w-32">
                  SL kế hoạch
                </th>
                <th className="border border-black px-3 py-2 text-right font-bold w-32">
                  SL thực giao
                </th>
                <th className="border border-black px-3 py-2 text-left font-bold w-36">
                  Đánh giá KCS
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black px-2 py-3 text-center font-mono">
                  1
                </td>
                <td className="border border-black px-3 py-3 font-mono text-xs">
                  {order.product_code}
                </td>
                <td className="border border-black px-3 py-3 font-bold text-base">
                  {order.product_name}
                </td>
                <td className="border border-black px-3 py-3 text-center text-neutral-800">
                  {order.product_unit}
                </td>
                <td className="border border-black px-3 py-3 text-right text-neutral-600 font-medium">
                  {formatQuantity(order.quantity)}
                </td>
                <td className="border border-black px-3 py-3 text-right font-bold text-lg text-black">
                  {formatQuantity(deliveredQty)}
                </td>
                <td className="border border-black px-3 py-3 text-xs text-emerald-700 font-semibold">
                  Đạt tiêu chuẩn chất lượng
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-neutral-50 font-bold">
                <td
                  colSpan={5}
                  className="border border-black px-3 py-2.5 text-right uppercase tracking-wider"
                >
                  Tổng sản lượng thành phẩm thực giao:
                </td>
                <td className="border border-black px-3 py-2.5 text-right text-lg text-black">
                  {formatQuantity(deliveredQty)} {order.product_unit}
                </td>
                <td className="border border-black px-3 py-2.5"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Chữ ký */}
        <div className="mt-auto pt-10">
          <div className="grid grid-cols-4 gap-4 text-center text-xs">
            <div>
              <p className="font-bold uppercase">Người lập phiếu</p>
              <p className="text-[11px] text-neutral-500 italic">(Ký, họ tên)</p>
              <div className="h-16" />
              <p className="font-medium">{printerName}</p>
            </div>
            <div>
              <p className="font-bold uppercase">Tổ trưởng sản xuất</p>
              <p className="text-[11px] text-neutral-500 italic">(Ký, họ tên)</p>
              <div className="h-16" />
              <p className="text-neutral-400">............................</p>
            </div>
            <div>
              <p className="font-bold uppercase">Kiểm định KCS</p>
              <p className="text-[11px] text-neutral-500 italic">(Ký, họ tên)</p>
              <div className="h-16" />
              <p className="text-neutral-400">............................</p>
            </div>
            <div>
              <p className="font-bold uppercase">Thủ kho tiếp nhận</p>
              <p className="text-[11px] text-neutral-500 italic">(Ký, ghi rõ họ tên)</p>
              <div className="h-16" />
              <p className="text-neutral-400">............................</p>
            </div>
          </div>
          <p className="mt-8 text-center text-[11px] italic text-neutral-500">
            * Bàn giao thành phẩm nhập kho hoặc trực tiếp giao vận theo lệnh sản xuất.
          </p>
        </div>
      </div>
    </div>
  );
}
