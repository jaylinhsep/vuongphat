export type PackingSpecOption = {
  pack_size: number;
  pack_unit: string;
  spec: string;
};

/**
 * Tự động tạo mô tả quy cách chuẩn (VD: "170KG/phuy", "15KG/thùng")
 */
export function buildSpecDescription(
  size: number | string,
  packUnit: string,
  itemUnit: string = "kg",
): string {
  const num = typeof size === "number" ? size : parseFloat(String(size).replace(",", "."));
  const cleanUnit = (packUnit || "").trim().toLowerCase();
  const cleanItemUnit = (itemUnit || "kg").trim().toUpperCase();

  if (Number.isFinite(num) && num > 0) {
    return cleanUnit ? `${num}${cleanItemUnit}/${cleanUnit}` : `${num}${cleanItemUnit}`;
  }
  return cleanUnit;
}

/**
 * Trích xuất kích thước và đơn vị từ 1 chuỗi quy cách đơn lẻ
 * VD: "170KG/phuy" -> { size: 170, unit: "phuy" }
 * VD: "15kg/thùng" -> { size: 15, unit: "thùng" }
 */
export function extractSpecParts(
  text: string,
  fallbackUnit = "thùng",
): { size: number; unit: string } {
  if (!text) return { size: 0, unit: fallbackUnit };
  const trimmed = text.trim();

  // Tìm số ở đầu hoặc trước kg/lít
  const matchSize = trimmed.match(/^(\d+(?:[.,]\d+)?)/) || trimmed.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|k|g|l|lit|lít)/i);
  let size = 0;
  if (matchSize) {
    const parsed = parseFloat(matchSize[1].replace(",", "."));
    if (Number.isFinite(parsed)) size = parsed;
  }

  // Tìm đơn vị bao bì sau dấu gạch chéo / hoặc ở cuối
  let unit = fallbackUnit;
  if (trimmed.includes("/")) {
    const afterSlash = trimmed.split("/").pop()?.trim() || "";
    if (afterSlash) unit = afterSlash;
  } else {
    const lower = trimmed.toLowerCase();
    if (lower.includes("phuy") || lower.includes("phi")) unit = "phuy";
    else if (lower.includes("thùng") || lower.includes("thung")) unit = "thùng";
    else if (lower.includes("can")) unit = "can";
    else if (lower.includes("bao")) unit = "bao";
    else if (lower.includes("chai")) unit = "chai";
  }

  return { size, unit };
}

/**
 * Phân tích trường packing_spec (có thể là JSON array, chuỗi phân cách dấu phẩy, hoặc text đơn)
 * thành mảng danh sách từ 1 đến nhiều quy cách lựa chọn.
 */
export function parsePackingSpecs(
  rawSpec?: string | null,
  defaultPackSize?: number | null,
  defaultPackUnit?: string | null,
  itemUnit: string = "kg",
): PackingSpecOption[] {
  const primaryUnit = (defaultPackUnit || "thùng").trim() || "thùng";
  const primarySize = Number.isFinite(defaultPackSize) && (defaultPackSize ?? 0) > 0 ? (defaultPackSize as number) : 0;

  if (!rawSpec || !rawSpec.trim()) {
    if (primarySize > 0) {
      return [
        {
          pack_size: primarySize,
          pack_unit: primaryUnit,
          spec: buildSpecDescription(primarySize, primaryUnit, itemUnit),
        },
      ];
    }
    return [];
  }

  const str = rawSpec.trim();

  // Trường hợp 1: Dạng JSON array lưu nhiều quy cách
  if (str.startsWith("[") && str.endsWith("]")) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const result: PackingSpecOption[] = [];
        for (const item of parsed) {
          if (!item) continue;
          const size = parseFloat(String(item.pack_size ?? item.size ?? 0)) || 0;
          const unit = String(item.pack_unit ?? item.unit ?? primaryUnit).trim();
          const spec = String(item.spec ?? item.packing_spec ?? "").trim() || buildSpecDescription(size, unit, itemUnit);
          if (size > 0 || spec.length > 0) {
            result.push({
              pack_size: size,
              pack_unit: unit || primaryUnit,
              spec: spec || buildSpecDescription(size, unit, itemUnit),
            });
          }
        }
        if (result.length > 0) return result;
      }
    } catch {
      // Bỏ qua lỗi parse JSON và thử tiếp
    }
  }

  // Trường hợp 2: Phân cách bằng dấu phẩy hoặc chấm phẩy hoặc dấu gạch đứng (VD: "170kg/phuy, 15kg/thùng")
  if (str.includes(",") || str.includes(";") || str.includes(" | ")) {
    const parts = str.split(/[,;|]/).map((p) => p.trim()).filter(Boolean);
    const result: PackingSpecOption[] = [];
    for (const part of parts) {
      const { size, unit } = extractSpecParts(part, primaryUnit);
      result.push({
        pack_size: size,
        pack_unit: unit,
        spec: part,
      });
    }
    if (result.length > 0) return result;
  }

  // Trường hợp 3: Chuỗi đơn (VD: "170KG/phuy")
  const extracted = extractSpecParts(str, primaryUnit);
  const finalSize = extracted.size > 0 ? extracted.size : primarySize;
  const finalUnit = extracted.unit || primaryUnit;

  return [
    {
      pack_size: finalSize,
      pack_unit: finalUnit,
      spec: str,
    },
  ];
}

/**
 * Đóng gói danh sách quy cách đóng gói để lưu vào database
 */
export function formatPackingSpecsForSave(
  options: { pack_size?: number | string | null; pack_unit?: string | null; spec?: string | null }[],
  itemUnit: string = "kg",
): {
  packing_spec: string | null;
  pack_size: number | null;
  pack_unit: string | null;
} {
  const cleanOptions: PackingSpecOption[] = [];

  for (const opt of options) {
    const size = typeof opt.pack_size === "number" ? opt.pack_size : parseFloat(String(opt.pack_size ?? "0").replace(",", "."));
    const unit = String(opt.pack_unit ?? "thùng").trim() || "thùng";
    let spec = String(opt.spec ?? "").trim();

    if (!spec && Number.isFinite(size) && size > 0) {
      spec = buildSpecDescription(size, unit, itemUnit);
    }

    if ((Number.isFinite(size) && size > 0) || spec.length > 0) {
      cleanOptions.push({
        pack_size: Number.isFinite(size) && size > 0 ? size : 0,
        pack_unit: unit,
        spec: spec || buildSpecDescription(size, unit, itemUnit),
      });
    }
  }

  if (cleanOptions.length === 0) {
    return { packing_spec: null, pack_size: null, pack_unit: null };
  }

  const first = cleanOptions[0];
  const primaryPackSize = first.pack_size > 0 ? first.pack_size : null;
  const primaryPackUnit = first.pack_unit || null;

  if (cleanOptions.length === 1) {
    return {
      packing_spec: first.spec,
      pack_size: primaryPackSize,
      pack_unit: primaryPackUnit,
    };
  }

  // Nếu có từ 2 quy cách trở lên: Lưu JSON array
  return {
    packing_spec: JSON.stringify(cleanOptions),
    pack_size: primaryPackSize,
    pack_unit: primaryPackUnit,
  };
}

/**
 * Trả về chuỗi tóm tắt các quy cách đóng gói (VD: "170KG/phuy, 25KG/can")
 * Thay vì chuỗi JSON thô như "[{...}]"
 */
export function formatPackingSpecSummary(
  rawSpec?: string | null,
  defaultPackSize?: number | null,
  defaultPackUnit?: string | null,
  itemUnit: string = "kg",
): string {
  const specs = parsePackingSpecs(rawSpec, defaultPackSize, defaultPackUnit, itemUnit);
  if (specs.length === 0) return "";
  return specs.map((s) => s.spec).join(", ");
}

