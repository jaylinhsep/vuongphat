"use client";

import { useEffect, useState } from "react";
import { PrinterIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime, formatQuantity } from "@/lib/format";
import { PRODUCTION_STATUS_LABELS } from "@/lib/labels";
import type { BomRow, ProductionRow } from "@/lib/types";

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

export function PrintOrderDocument({
  order,
  bom,
  printerName,
}: {
  order: ProductionRow;
  bom: BomRow | null;
  printerName: string;
}) {
  const [printedAt, setPrintedAt] = useState("");

  useEffect(() => {
    setPrintedAt(formatPrintTime(new Date()));
    const timer = setTimeout(() => window.print(), 400);
    return () => clearTimeout(timer);
  }, []);

  const outputQuantity = bom && bom.output_quantity > 0 ? bom.output_quantity : 1;
  const lines = (bom?.items ?? []).map((line) => ({
    ...line,
    needed: (line.quantity * order.quantity) / outputQuantity,
  }));

  return (
    <div className="flex min-h-screen flex-col items-center bg-muted/40 py-6 print:min-h-0 print:bg-white print:py-0">
      <div className="print-hide mb-4 flex w-[210mm] max-w-full items-center justify-between gap-2 px-1">
        <p className="text-sm text-muted-foreground">
          Bản in khổ A4 — đưa xuống xưởng sản xuất.
        </p>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => window.print()}>
            <PrinterIcon /> In lệnh
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.close()}>
            <XIcon /> Đóng
          </Button>
        </div>
      </div>

      <div className="print-sheet flex w-[210mm] min-h-[297mm] max-w-full flex-col bg-white p-[14mm] text-black shadow-lg print:w-full print:max-w-none print:p-0 print:shadow-none">
        <div className="flex items-start justify-between gap-4 border-b-2 border-black pb-3">
          <div>
            <p className="text-lg font-bold uppercase tracking-wider">VƯỢNG PHÁT INK</p>
            <p className="text-xs text-neutral-600">
              Hệ thống quản trị sản xuất
            </p>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold uppercase tracking-wide">
              Lệnh sản xuất
            </h1>
            <p className="font-mono text-sm font-semibold">{order.code}</p>
          </div>
        </div>

        <p className="mt-2 text-right text-xs text-neutral-700">
          Ngày giờ in: <span className="font-semibold">{printedAt || "…"}</span>
        </p>

        <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div className="flex gap-2">
            <span className="w-32 shrink-0 text-neutral-600">Mã lệnh:</span>
            <span className="font-mono font-semibold">{order.code}</span>
          </div>
          <div className="flex gap-2">
            <span className="w-32 shrink-0 text-neutral-600">Ngày kế hoạch:</span>
            <span className="font-semibold">{formatDate(order.planned_date)}</span>
          </div>
          <div className="flex gap-2">
            <span className="w-32 shrink-0 text-neutral-600">Thành phẩm:</span>
            <span className="font-semibold">
              {order.product_name}{" "}
              <span className="font-mono text-xs font-normal text-neutral-600">
                ({order.product_code})
              </span>
            </span>
          </div>
          <div className="flex gap-2">
            <span className="w-32 shrink-0 text-neutral-600">Số lượng:</span>
            <span className="font-semibold">
              {formatQuantity(order.quantity)} {order.product_unit}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="w-32 shrink-0 text-neutral-600">Trạng thái:</span>
            <span className="font-semibold">
              {PRODUCTION_STATUS_LABELS[order.status]}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="w-32 shrink-0 text-neutral-600">Hoàn thành lúc:</span>
            <span>{formatDateTime(order.completed_at)}</span>
          </div>
          <div className="col-span-2 flex gap-2">
            <span className="w-32 shrink-0 text-neutral-600">Ghi chú:</span>
            <span>{order.note || "—"}</span>
          </div>
        </div>

        {bom ? (
          <>
            <div className="print-table-wrap mt-6">
              <table className="print-table w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="w-16 text-center uppercase">STT</th>
                    <th className="text-center uppercase">Mã NVL</th>
                    <th className="w-28 text-center uppercase">ĐVT</th>
                    <th className="w-64 text-right uppercase pr-6">Số lượng cần</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => (
                    <tr key={line.id} className="hover:bg-neutral-50">
                      <td className="text-center font-bold text-2xl">{index + 1}</td>
                      <td className="print-code text-center font-mono font-black text-black">
                        {line.material_code}
                      </td>
                      <td className="text-center text-2xl font-bold text-black uppercase">
                        {line.material_unit}
                      </td>
                      <td className="print-qty text-right pr-6">
                        {formatQuantity(line.needed)}{" "}
                        <span className="text-xl font-bold text-neutral-800">
                          {line.material_unit}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="print-total">
                      TỔNG CỘNG ĐẦU RA CẦN SẢN XUẤT:{" "}
                      <span className="print-total-qty ml-2">
                        {formatQuantity(order.quantity)} {order.product_unit}
                      </span>{" "}
                      — <span className="uppercase">{order.product_name}</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {bom.note && (
              <p className="mt-2 text-xs text-neutral-600">
                Ghi chú công thức: {bom.note}
              </p>
            )}
          </>
        ) : (
          <p className="rounded border border-dashed border-neutral-400 p-3 text-sm text-neutral-700">
            Thành phẩm này chưa có công thức BOM. Vui lòng thiết lập định lượng
            trước khi sản xuất.
          </p>
        )}

        <div className="mt-auto grid grid-cols-3 gap-6 pt-10 text-center text-sm">
          <div>
            <p className="font-semibold">Người lập lệnh</p>
            <p className="text-xs text-neutral-600">(Ký, ghi rõ họ tên)</p>
            <p className="mt-12 font-medium">{printerName}</p>
          </div>
          <div>
            <p className="font-semibold">Người nhận sản xuất</p>
            <p className="text-xs text-neutral-600">(Ký, ghi rõ họ tên)</p>
            <p className="mt-12">&nbsp;</p>
          </div>
          <div>
            <p className="font-semibold">Thủ kho</p>
            <p className="text-xs text-neutral-600">(Ký, ghi rõ họ tên)</p>
            <p className="mt-12">&nbsp;</p>
          </div>
        </div>
      </div>
    </div>
  );
}