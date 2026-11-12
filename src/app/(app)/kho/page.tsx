import Link from "next/link";
import {
  AlertTriangleIcon,
  ArrowLeftRightIcon,
  BoxesIcon,
  CoinsIcon,
  DownloadIcon,
  SearchIcon,
  Settings2Icon,
} from "lucide-react";
import { ItemTypeBadge } from "@/components/status-badges";
import { PackingSpecBadges } from "@/components/packing-spec-badges";
import { DeleteItemDialog } from "@/components/forms/delete-item-dialog";
import { ItemFormDialog } from "@/components/forms/master-data-forms";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { formatCurrency, formatNumber, formatQuantity } from "@/lib/format";
import { CAN_ACCESS } from "@/lib/labels";
import { getInventory } from "@/lib/queries";

export default async function KhoPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const user = await requireRole(CAN_ACCESS.kho);
  const { q, type } = await searchParams;
  const inventory = await getInventory(q);

  const selectedType =
    type === "nguyen_lieu" || type === "thanh_pham" || type === "ban_thanh_pham"
      ? type
      : "all";

  const displayedInventory =
    selectedType === "all"
      ? inventory
      : inventory.filter((item) => item.type === selectedType);

  const nlValue = inventory
    .filter((item) => item.type === "nguyen_lieu")
    .reduce(
      (total, item) => total + Math.max(item.on_hand, 0) * item.unit_price,
      0,
    );
  const btpValue = inventory
    .filter((item) => item.type === "ban_thanh_pham")
    .reduce(
      (total, item) => total + Math.max(item.on_hand, 0) * item.unit_price,
      0,
    );
  const tpValue = inventory
    .filter((item) => item.type === "thanh_pham")
    .reduce(
      (total, item) => total + Math.max(item.on_hand, 0) * item.unit_price,
      0,
    );

  const lowStock = inventory.filter(
    (item) => item.min_stock > 0 && item.on_hand < item.min_stock,
  ).length;
  const canWrite = CAN_ACCESS.khoWrite(user.role);

  const exportUrlParams = new URLSearchParams();
  if (q) exportUrlParams.set("q", q);
  if (selectedType !== "all") exportUrlParams.set("type", selectedType);
  const exportHref = `/api/kho/excel?${exportUrlParams.toString()}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tồn kho"
        description="Quản lý đa kho theo thời gian thực: Kho Nguyên vật liệu, Bán thành phẩm và Kho Thành phẩm, tính từ toàn bộ phiếu kho."
      >
        <Button asChild variant="outline" size="sm">
          <a href={exportHref}>
            <DownloadIcon /> Xuất Excel
          </a>
        </Button>
        {canWrite && (
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/kho/danh-muc">
                <Settings2Icon /> Danh mục
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/kho/nhap-xuat">
                <ArrowLeftRightIcon /> Nhập / xuất kho
              </Link>
            </Button>
          </>
        )}
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Mặt hàng đang quản lý"
          value={formatNumber(inventory.length)}
          icon={BoxesIcon}
        />
        <StatCard
          label="Kho Nguyên liệu"
          value={formatCurrency(nlValue)}
          hint="Giá trị tồn NVL hiện hành"
          icon={CoinsIcon}
          tone="primary"
        />
        <StatCard
          label="Kho Bán thành phẩm"
          value={formatCurrency(btpValue)}
          hint="Giá trị tồn BTP hiện hành"
          icon={CoinsIcon}
          tone="purple"
        />
        <StatCard
          label="Kho Thành phẩm"
          value={formatCurrency(tpValue)}
          hint="Giá trị tồn thành phẩm"
          icon={CoinsIcon}
          tone="emerald"
        />
        <StatCard
          label="Dưới định mức"
          value={formatNumber(lowStock)}
          hint="Cần bổ sung sớm"
          icon={AlertTriangleIcon}
          tone={lowStock > 0 ? "rose" : "primary"}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          asChild
          variant={selectedType === "all" ? "default" : "outline"}
          size="sm"
        >
          <Link href={`/kho${q ? `?q=${encodeURIComponent(q)}` : ""}`}>
            Tất cả các kho ({inventory.length})
          </Link>
        </Button>
        <Button
          asChild
          variant={selectedType === "nguyen_lieu" ? "default" : "outline"}
          size="sm"
        >
          <Link
            href={`/kho?type=nguyen_lieu${q ? `&q=${encodeURIComponent(q)}` : ""}`}
          >
            Kho Nguyên liệu (
            {inventory.filter((i) => i.type === "nguyen_lieu").length})
          </Link>
        </Button>
        <Button
          asChild
          variant={selectedType === "ban_thanh_pham" ? "default" : "outline"}
          size="sm"
        >
          <Link
            href={`/kho?type=ban_thanh_pham${q ? `&q=${encodeURIComponent(q)}` : ""}`}
          >
            Kho Bán thành phẩm (
            {inventory.filter((i) => i.type === "ban_thanh_pham").length})
          </Link>
        </Button>
        <Button
          asChild
          variant={selectedType === "thanh_pham" ? "default" : "outline"}
          size="sm"
        >
          <Link
            href={`/kho?type=thanh_pham${q ? `&q=${encodeURIComponent(q)}` : ""}`}
          >
            Kho Thành phẩm (
            {inventory.filter((i) => i.type === "thanh_pham").length})
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>
            {selectedType === "nguyen_lieu"
              ? "Kho Nguyên vật liệu"
              : selectedType === "ban_thanh_pham"
                ? "Kho Bán thành phẩm"
                : selectedType === "thanh_pham"
                  ? "Kho Thành phẩm"
                  : "Danh sách toàn bộ hàng hóa"}
          </CardTitle>
          <form action="/kho" className="flex w-full gap-2 sm:w-auto">
            {selectedType !== "all" && (
              <input type="hidden" name="type" value={selectedType} />
            )}
            <Input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Tìm theo mã hoặc tên…"
              className="w-full sm:w-64"
            />
            <Button type="submit" variant="outline" size="icon" aria-label="Tìm">
              <SearchIcon />
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã</TableHead>
                  <TableHead className="whitespace-normal">Tên hàng hóa</TableHead>
                  <TableHead>Loại kho</TableHead>
                  <TableHead>Quy cách đóng gói</TableHead>
                  <TableHead className="text-right">Tồn kho</TableHead>
                  <TableHead className="text-right">Đơn giá</TableHead>
                  <TableHead className="text-right">Giá trị tồn</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  {canWrite && <TableHead className="w-20 text-center">Thao tác</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedInventory.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={canWrite ? 9 : 8}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Không tìm thấy hàng hóa phù hợp.
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedInventory.map((item) => {
                    const isLow =
                      item.min_stock > 0 && item.on_hand < item.min_stock;
                    const packQty =
                      item.pack_size && item.pack_size > 0
                        ? Math.floor(item.on_hand / item.pack_size)
                        : null;
                    const remainder =
                      item.pack_size && item.pack_size > 0
                        ? Math.round((item.on_hand % item.pack_size) * 1000) / 1000
                        : null;

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">
                          {item.code}
                        </TableCell>
                        <TableCell className="whitespace-normal font-medium">
                          {item.name}
                        </TableCell>
                        <TableCell>
                          <ItemTypeBadge type={item.type} />
                        </TableCell>
                        <TableCell className="text-xs">
                          <PackingSpecBadges
                            packingSpec={item.packing_spec}
                            packSize={item.pack_size}
                            packUnit={item.pack_unit}
                            unit={item.unit}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div>
                            <span
                              className={
                                isLow
                                  ? "font-semibold text-rose-600"
                                  : "font-semibold"
                              }
                            >
                              {formatQuantity(item.on_hand)}
                            </span>{" "}
                            <span className="text-xs text-muted-foreground">
                              {item.unit}
                            </span>
                          </div>
                          {packQty !== null && item.on_hand > 0 && (
                            <div className="text-[11px] text-emerald-700 font-medium">
                              ~ {packQty} {item.pack_unit || "thùng"}
                              {remainder !== null && remainder > 0
                                ? ` + ${formatQuantity(remainder)} ${item.unit}`
                                : ""}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(item.unit_price)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(
                            Math.max(item.on_hand, 0) * item.unit_price,
                          )}
                        </TableCell>
                        <TableCell>
                          {isLow ? (
                            <Badge
                              variant="outline"
                              className="border-rose-200 bg-rose-50 text-rose-700"
                            >
                              Dưới định mức
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-emerald-200 bg-emerald-50 text-emerald-700"
                            >
                              Đủ hàng
                            </Badge>
                          )}
                        </TableCell>
                        {canWrite && (
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <ItemFormDialog item={item} />
                              <DeleteItemDialog item={item} />
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
