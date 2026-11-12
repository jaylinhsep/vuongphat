"use client";

import { useEffect, useState } from "react";
import { Edit3Icon, PlusIcon, PrinterIcon, RotateCcwIcon, Trash2Icon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, formatNumber } from "@/lib/format";
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

function parsePackInfo(item: {
  quantity: number;
  pack_size?: number | null;
  pack_unit?: string | null;
  packing_spec?: string | null;
  item_unit?: string;
}) {
  let packSize = item.pack_size && item.pack_size > 0 ? item.pack_size : 0;
  let packUnit = item.pack_unit || "";
  let spec = (item.packing_spec || "").toUpperCase().trim();

  // Trích xuất số kg từ packing_spec nếu chưa có packSize
  if (!packSize && spec) {
    const match = spec.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|k|g)?/i);
    if (match) {
      const val = parseFloat(match[1].replace(",", "."));
      if (Number.isFinite(val) && val > 0) packSize = val;
    }
  }

  // Nhận diện đơn vị đóng gói (P = Phuy/Phi, T = Thùng, C = Can)
  if (!packUnit && spec) {
    if (spec.includes("/P") || spec.toLowerCase().includes("phuy") || spec.toLowerCase().includes("phi")) {
      packUnit = "P";
    } else if (spec.includes("/T") || spec.toLowerCase().includes("thùng") || spec.toLowerCase().includes("thung")) {
      packUnit = "T";
    } else if (spec.includes("/C") || spec.toLowerCase().includes("can")) {
      packUnit = "C";
    }
  }

  const unit = (item.item_unit || "kg").toLowerCase();
  let soLuong = 0;
  let trongLuong = 0;

  if (unit === "kg") {
    trongLuong = item.quantity;
    if (packSize > 0) {
      soLuong = Math.round((item.quantity / packSize) * 100) / 100;
      if (!spec) {
        const u = packUnit ? packUnit.toUpperCase()[0] : "T";
        spec = `${packSize}KG/${u}`;
      }
    } else {
      soLuong = item.quantity;
      if (!spec) spec = "LẺ";
    }
  } else {
    // Đơn vị bán là thùng, phuy, can
    soLuong = item.quantity;
    if (packSize > 0) {
      trongLuong = item.quantity * packSize;
      if (!spec) {
        const u = item.item_unit ? item.item_unit.toUpperCase()[0] : "T";
        spec = `${packSize}KG/${u}`;
      }
    } else {
      trongLuong = item.quantity;
      if (!spec) spec = item.item_unit ? item.item_unit.toUpperCase() : "—";
    }
  }

  return {
    spec: spec || "—",
    soLuong,
    trongLuong,
  };
}

export type DeliveryPrintLine = {
  id: string;
  itemCode: string;
  itemName: string;
  spec: string;
  quantity: number | string;
  weight: number | string;
  note: string;
};

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
  const [isEditing, setIsEditing] = useState(false);

  const buildDefaultLines = (): DeliveryPrintLine[] => {
    return order.items.map((item) => {
      const info = parsePackInfo(item);
      return {
        id: item.id,
        itemCode: item.item_code,
        itemName: item.item_name,
        spec: info.spec,
        quantity: info.soLuong,
        weight: info.trongLuong,
        note: "",
      };
    });
  };

  const [lines, setLines] = useState<DeliveryPrintLine[]>(buildDefaultLines);

  useEffect(() => {
    setPrintedAt(formatPrintTime(new Date()));
    const timer = setTimeout(() => window.print(), 500);
    return () => clearTimeout(timer);
  }, []);

  const totalQuantity = lines.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const totalWeight = lines.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);

  const updateLine = (idx: number, field: keyof DeliveryPrintLine, val: string | number) => {
    setLines((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        itemCode: "",
        itemName: "",
        spec: "",
        quantity: "",
        weight: "",
        note: "",
      },
    ]);
  };

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-muted/40 py-6 print:min-h-0 print:bg-white print:py-0">
      {/* Thanh điều khiển trên màn hình (ẩn khi in) */}
      <div className="print-hide mb-4 flex w-[210mm] max-w-full flex-col gap-2 rounded-lg border bg-card p-3 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-foreground">
              {title} — VƯỢNG PHÁT INK (Khổ A4)
            </p>
            <p className="text-xs text-muted-foreground">
              Biểu mẫu chuẩn: STT · MÃ HÀNG · QUY CÁCH · SỐ LƯỢNG · TRỌNG LƯỢNG · GHI CHÚ.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={isEditing ? "default" : "outline"}
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs h-8"
            >
              <Edit3Icon className="size-3.5 mr-1" />
              {isEditing ? "Xong chỉnh sửa" : "Sửa bảng in"}
            </Button>
            <Button size="sm" onClick={() => window.print()} className="h-8 text-xs font-semibold">
              <PrinterIcon className="size-3.5 mr-1" /> In phiếu
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.close()} className="h-8 text-xs">
              <XIcon className="size-3.5 mr-1" /> Đóng
            </Button>
          </div>
        </div>

        {isEditing && (
          <div className="flex items-center justify-between pt-2 border-t text-xs">
            <span className="text-muted-foreground">
              Bạn có thể sửa trực tiếp thông tin vào từng ô bên dưới trước khi bấm in:
            </span>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="outline" onClick={addLine} className="h-7 text-xs">
                <PlusIcon className="size-3 mr-1" /> Thêm dòng
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setLines(buildDefaultLines())}
                className="h-7 text-xs text-muted-foreground"
              >
                <RotateCcwIcon className="size-3 mr-1" /> Đặt lại mặc định
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Trang in A4 */}
      <div className="print-sheet flex w-[210mm] min-h-[297mm] max-w-full flex-col bg-white p-[14mm] text-black shadow-lg print:w-full print:max-w-none print:p-0 print:shadow-none">
        {/* Header công ty & Tiêu đề phiếu */}
        <div className="flex items-start justify-between gap-4 border-b-2 border-black pb-3">
          <div>
            <p className="text-lg font-bold uppercase tracking-wider text-black">
              CÔNG TY TNHH VƯỢNG PHÁT INK
            </p>
            <p className="text-xs text-neutral-700">
              Hệ thống Quản lý Bán hàng &amp; Kho vận — Hóa chất &amp; Dung môi
            </p>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-black uppercase tracking-wide text-black">
              {title}
            </h1>
            <p className="font-mono text-sm font-bold text-neutral-900">
              Mã đơn: {order.code}
            </p>
          </div>
        </div>

        <p className="mt-2 text-right text-xs text-neutral-600">
          Ngày giờ in: <span className="font-semibold">{printedAt || "…"}</span>
        </p>

        {/* Thông tin đơn hàng & Khách hàng */}
        <div className="mt-4 rounded border border-neutral-300 p-3 text-sm bg-neutral-50/40">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <div className="flex gap-2">
              <span className="w-28 shrink-0 text-neutral-600 font-medium">Khách hàng:</span>
              <span className="font-bold text-neutral-900">{order.customer_name}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-28 shrink-0 text-neutral-600 font-medium">Ngày đặt hàng:</span>
              <span className="font-semibold">{formatDate(order.order_date)}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-28 shrink-0 text-neutral-600 font-medium">Điện thoại:</span>
              <span>{order.customer_phone || "—"}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-28 shrink-0 text-neutral-600 font-medium">Ngày hẹn giao:</span>
              <span className="font-semibold">
                {order.delivery_date ? formatDate(order.delivery_date) : "Giao ngay"}
              </span>
            </div>
            <div className="col-span-2 flex gap-2">
              <span className="w-28 shrink-0 text-neutral-600 font-medium">Địa chỉ giao:</span>
              <span className="font-medium text-neutral-800">
                {order.customer_address || "Giao tại xưởng / theo thỏa thuận"}
              </span>
            </div>
            {order.note && (
              <div className="col-span-2 flex gap-2">
                <span className="w-28 shrink-0 text-neutral-600 font-medium">Ghi chú đơn:</span>
                <span className="italic text-neutral-700">{order.note}</span>
              </div>
            )}
          </div>
        </div>

        {/* BẢNG DANH SÁCH HÀNG HÓA CHUẨN MẪU MỚI */}
        <div className="mt-5 overflow-x-auto">
          <table className="delivery-table">
            <thead>
              <tr>
                <th className="w-14">STT</th>
                <th className="w-44">MÃ HÀNG</th>
                <th className="w-36">QUY CÁCH</th>
                <th className="w-28">SỐ LƯỢNG</th>
                <th className="w-36">TRỌNG LƯỢNG</th>
                <th>GHI CHÚ</th>
                {isEditing && <th className="print-hide w-12 text-center">Xóa</th>}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={line.id}>
                  {/* STT */}
                  <td className="text-center font-mono font-medium text-sm">
                    {idx + 1}
                  </td>

                  {/* MÃ HÀNG */}
                  <td className="text-center">
                    {isEditing ? (
                      <input
                        type="text"
                        value={line.itemCode}
                        onChange={(e) => updateLine(idx, "itemCode", e.target.value)}
                        placeholder="Mã hàng..."
                        className="w-full text-center font-mono font-bold text-sm uppercase rounded border px-1.5 py-0.5 bg-white"
                      />
                    ) : (
                      <>
                        <span className="font-mono font-bold text-base tracking-wide block uppercase text-black">
                          {line.itemCode}
                        </span>
                        {line.itemName && line.itemName !== line.itemCode && (
                          <span className="text-[11px] text-neutral-600 block mt-0.5 font-normal leading-tight">
                            {line.itemName}
                          </span>
                        )}
                      </>
                    )}
                  </td>

                  {/* QUY CÁCH */}
                  <td className="text-center">
                    {isEditing ? (
                      <input
                        type="text"
                        value={line.spec}
                        onChange={(e) => updateLine(idx, "spec", e.target.value)}
                        placeholder="VD: 170KG/P"
                        className="w-full text-center font-bold text-sm uppercase rounded border px-1.5 py-0.5 bg-white"
                      />
                    ) : (
                      <span className="font-bold text-sm tracking-wide uppercase text-black">
                        {line.spec}
                      </span>
                    )}
                  </td>

                  {/* SỐ LƯỢNG */}
                  <td className="text-center">
                    {isEditing ? (
                      <input
                        type="number"
                        value={line.quantity}
                        onChange={(e) => updateLine(idx, "quantity", e.target.value)}
                        placeholder="SL"
                        className="w-full text-center font-mono font-bold text-base rounded border px-1.5 py-0.5 bg-white"
                      />
                    ) : (
                      <span className="font-mono font-bold text-base text-black">
                        {line.quantity !== "" ? formatNumber(Number(line.quantity) || 0) : "—"}
                      </span>
                    )}
                  </td>

                  {/* TRỌNG LƯỢNG */}
                  <td className="text-center">
                    {isEditing ? (
                      <input
                        type="number"
                        value={line.weight}
                        onChange={(e) => updateLine(idx, "weight", e.target.value)}
                        placeholder="TL"
                        className="w-full text-center font-mono font-bold text-base rounded border px-1.5 py-0.5 bg-white"
                      />
                    ) : (
                      <span className="font-mono font-bold text-base text-black">
                        {line.weight !== "" ? formatNumber(Number(line.weight) || 0) : "—"}
                      </span>
                    )}
                  </td>

                  {/* GHI CHÚ */}
                  <td className="text-left">
                    {isEditing ? (
                      <input
                        type="text"
                        value={line.note}
                        onChange={(e) => updateLine(idx, "note", e.target.value)}
                        placeholder="Ghi chú..."
                        className="w-full text-left text-xs rounded border px-1.5 py-0.5 bg-white"
                      />
                    ) : (
                      <span className="text-xs text-neutral-800">
                        {line.note || ""}
                      </span>
                    )}
                  </td>

                  {/* Nút xóa dòng khi đang sửa */}
                  {isEditing && (
                    <td className="print-hide text-center">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeLine(idx)}
                        className="size-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                        title="Xóa dòng"
                      >
                        <Trash2Icon className="size-3.5" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="text-center font-black text-base uppercase tracking-wider text-black">
                  TỔNG CỘNG
                </td>
                <td className="text-center font-mono font-black text-base text-black">
                  {formatNumber(totalQuantity)}
                </td>
                <td className="text-center font-mono font-black text-base text-black">
                  {formatNumber(totalWeight)}
                </td>
                <td></td>
                {isEditing && <td className="print-hide"></td>}
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Chữ ký 4 bên */}
        <div className="mt-auto pt-10">
          <div className="grid grid-cols-4 gap-4 text-center text-xs">
            <div>
              <p className="font-bold uppercase text-neutral-900">Người lập phiếu</p>
              <p className="text-[11px] text-neutral-500 italic">(Ký, họ tên)</p>
              <div className="h-16" />
              <p className="font-medium">{printerName}</p>
            </div>
            <div>
              <p className="font-bold uppercase text-neutral-900">Thủ kho xuất</p>
              <p className="text-[11px] text-neutral-500 italic">(Ký, họ tên)</p>
              <div className="h-16" />
              <p className="text-neutral-400">............................</p>
            </div>
            <div>
              <p className="font-bold uppercase text-neutral-900">Người giao hàng</p>
              <p className="text-[11px] text-neutral-500 italic">(Ký, họ tên)</p>
              <div className="h-16" />
              <p className="text-neutral-400">............................</p>
            </div>
            <div>
              <p className="font-bold uppercase text-neutral-900">Người nhận hàng</p>
              <p className="text-[11px] text-neutral-500 italic">(Ký, ghi rõ họ tên)</p>
              <div className="h-16" />
              <p className="text-neutral-400">............................</p>
            </div>
          </div>
          <p className="mt-8 text-center text-[11px] italic text-neutral-500">
            * Vui lòng kiểm tra kỹ mã hàng, quy cách đóng gói, số lượng và tình trạng nguyên vẹn trước khi ký nhận.
          </p>
        </div>
      </div>
    </div>
  );
}
