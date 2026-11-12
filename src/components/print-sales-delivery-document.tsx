"use client";

import { useEffect, useState } from "react";
import { PrinterIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, formatQuantity } from "@/lib/format";
import type { SalesOrderRow } from "@/lib/types";

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

export function PrintSalesDeliveryDocument({
  order,
  printerName,
  title = "PHIẾU GIAO HÀNG",
}: {
  order: SalesOrderRow;
  printerName: string;
  title?: string;
}) {
  const [printedAt, setPrintedAt] = useState("");

  useEffect(() => {
    setPrintedAt(formatPrintTime(new Date()));
    const timer = setTimeout(() => window.print(), 400);
    return () => clearTimeout(timer);
  }, []);

  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex min-h-screen flex-col items-center bg-muted/40 py-6 print:min-h-0 print:bg-white print:py-0">
      <div className="print-hide mb-4 flex w-[210mm] max-w-full items-center justify-between gap-2 px-1">
        <p className="text-sm text-muted-foreground">
          Phiếu xuất kho kiêm giao hàng (khổ A4 — không hiện giá tiền).
        </p>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => window.print()}>
            <PrinterIcon /> In phiếu
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
            <p className="text-lg font-bold uppercase tracking-wider">CÔNG TY TNHH VƯƠNG PHÁT</p>
            <p className="text-xs text-neutral-600">
              Hệ thống Quản lý Bán hàng &amp; Kho vận
            </p>
          </div>
          <div className="text-right">
            <h1 className="text-xl font-bold uppercase tracking-wide">
              {title}
            </h1>
            <p className="font-mono text-sm font-semibold text-neutral-800">
              Mã đơn: {order.code}
            </p>
          </div>
        </div>

        <p className="mt-2 text-right text-xs text-neutral-600">
          Ngày giờ in: <span className="font-semibold">{printedAt || "…"}</span>
        </p>

        {/* Thông tin đơn hàng & Khách hàng */}
        <div className="mt-4 rounded-lg border border-neutral-300 p-3 text-sm">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <div className="flex gap-2">
              <span className="w-28 shrink-0 text-neutral-600">Khách hàng:</span>
              <span className="font-bold text-neutral-900">{order.customer_name}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-28 shrink-0 text-neutral-600">Ngày đặt hàng:</span>
              <span className="font-semibold">{formatDate(order.order_date)}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-28 shrink-0 text-neutral-600">Điện thoại:</span>
              <span>{order.customer_phone || "—"}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-28 shrink-0 text-neutral-600">Ngày giao dự kiến:</span>
              <span>{order.delivery_date ? formatDate(order.delivery_date) : "Giao ngay"}</span>
            </div>
            <div className="col-span-2 flex gap-2">
              <span className="w-28 shrink-0 text-neutral-600">Địa chỉ giao:</span>
              <span className="font-medium text-neutral-800">{order.customer_address || "Giao tại xưởng / theo đơn"}</span>
            </div>
            {order.note && (
              <div className="col-span-2 flex gap-2">
                <span className="w-28 shrink-0 text-neutral-600">Ghi chú giao:</span>
                <span className="italic text-neutral-700">{order.note}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bảng danh sách hàng hóa (KHÔNG HIỆN CỘT GIÁ) */}
        <h2 className="mt-5 text-sm font-bold uppercase tracking-wide">
          DANH SÁCH MẶT HÀNG XUẤT GIAO
        </h2>

        <div className="mt-2 overflow-x-auto">
          <table className="print-table w-full border-collapse border border-black text-sm">
            <thead>
              <tr className="bg-neutral-100 print:bg-neutral-100">
                <th className="border border-black px-2 py-1.5 text-center font-bold w-12">
                  STT
                </th>
                <th className="border border-black px-3 py-1.5 text-left font-bold w-28">
                  Mã hàng
                </th>
                <th className="border border-black px-3 py-1.5 text-left font-bold">
                  Tên mặt hàng
                </th>
                <th className="border border-black px-3 py-1.5 text-center font-bold w-20">
                  ĐVT
                </th>
                <th className="border border-black px-3 py-1.5 text-right font-bold w-32">
                  Số lượng xuất
                </th>
                <th className="border border-black px-3 py-1.5 text-left font-bold w-40">
                  Ghi chú
                </th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={item.id}>
                  <td className="border border-black px-2 py-2 text-center font-mono">
                    {idx + 1}
                  </td>
                  <td className="border border-black px-3 py-2 font-mono text-xs">
                    {item.item_code}
                  </td>
                  <td className="border border-black px-3 py-2 font-semibold">
                    {item.item_name}
                  </td>
                  <td className="border border-black px-3 py-2 text-center text-neutral-800">
                    {item.item_unit}
                  </td>
                  <td className="border border-black px-3 py-2 text-right font-bold text-base">
                    {formatQuantity(item.quantity)}
                  </td>
                  <td className="border border-black px-3 py-2 text-xs text-neutral-600">
                    Hàng mới 100%, đủ quy cách
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-neutral-50 font-bold">
                <td
                  colSpan={4}
                  className="border border-black px-3 py-2 text-right uppercase tracking-wider"
                >
                  Tổng cộng số lượng xuất giao:
                </td>
                <td className="border border-black px-3 py-2 text-right text-base text-black">
                  {formatQuantity(totalQuantity)}
                </td>
                <td className="border border-black px-3 py-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Chữ ký 4 bên */}
        <div className="mt-auto pt-10">
          <div className="grid grid-cols-4 gap-4 text-center text-xs">
            <div>
              <p className="font-bold uppercase">Người lập phiếu</p>
              <p className="text-[11px] text-neutral-500 italic">(Ký, họ tên)</p>
              <div className="h-16" />
              <p className="font-medium">{printerName}</p>
            </div>
            <div>
              <p className="font-bold uppercase">Thủ kho xuất</p>
              <p className="text-[11px] text-neutral-500 italic">(Ký, họ tên)</p>
              <div className="h-16" />
              <p className="text-neutral-400">............................</p>
            </div>
            <div>
              <p className="font-bold uppercase">Người giao hàng</p>
              <p className="text-[11px] text-neutral-500 italic">(Ký, họ tên)</p>
              <div className="h-16" />
              <p className="text-neutral-400">............................</p>
            </div>
            <div>
              <p className="font-bold uppercase">Người nhận hàng</p>
              <p className="text-[11px] text-neutral-500 italic">(Ký, ghi rõ họ tên)</p>
              <div className="h-16" />
              <p className="text-neutral-400">............................</p>
            </div>
          </div>
          <p className="mt-8 text-center text-[11px] italic text-neutral-500">
            * Vui lòng kiểm tra kỹ số lượng và tình trạng hàng hóa trước khi ký nhận.
          </p>
        </div>
      </div>
    </div>
  );
}
