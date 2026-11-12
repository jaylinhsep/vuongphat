import Link from "next/link";
import {
  AlertTriangleIcon,
  ChevronLeftIcon,
  CoinsIcon,
  DownloadIcon,
  FactoryIcon,
  FilterIcon,
  TrendingUpIcon,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatQuantity,
} from "@/lib/format";
import { CAN_ACCESS } from "@/lib/labels";
import { getItems, getProductionCostReport } from "@/lib/queries";

export default async function GiaThanhPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; productId?: string }>;
}) {
  await requireRole(CAN_ACCESS.sanXuatGiaThanh);
  const params = await searchParams;

  const from = params.from || "";
  const to = params.to || "";
  const productId = params.productId || "all";

  const [products, rows] = await Promise.all([
    getItems("thanh_pham"),
    getProductionCostReport({ from, to, productId }),
  ]);

  const totalCost = rows.reduce((acc, row) => acc + row.total_cost, 0);
  const totalActualQty = rows.reduce((acc, row) => acc + row.actual_quantity, 0);
  const totalWasteQty = rows.reduce((acc, row) => acc + row.waste_quantity, 0);
  const totalOutput = totalActualQty + totalWasteQty;
  const avgWasteRate =
    totalOutput > 0 ? Math.round((totalWasteQty / totalOutput) * 1000) / 10 : 0;

  const profitableRows = rows.filter((r) => r.product_sale_price > 0);
  const avgGrossMargin =
    profitableRows.length > 0
      ? Math.round(
          (profitableRows.reduce((acc, r) => acc + r.gross_margin_rate, 0) /
            profitableRows.length) *
            10,
        ) / 10
      : 0;

  const exportParams = new URLSearchParams();
  if (from) exportParams.set("from", from);
  if (to) exportParams.set("to", to);
  if (productId && productId !== "all") exportParams.set("productId", productId);
  const exportHref = `/api/san-xuat/gia-thanh/excel?${exportParams.toString()}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Giá thành & Hao hụt sản xuất"
        description="Tập hợp chi phí NVL tiêu hao, chi phí nhân công và chi phí chung để tính giá thành đơn vị và phân tích hao hụt."
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/san-xuat">
            <ChevronLeftIcon /> Lệnh sản xuất
          </Link>
        </Button>
        <Button asChild size="sm">
          <a href={exportHref}>
            <DownloadIcon /> Xuất Excel
          </a>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard
          label="Tổng chi phí sản xuất"
          value={formatCurrency(totalCost)}
          hint={`${formatNumber(rows.length)} lệnh hoàn thành`}
          icon={CoinsIcon}
          tone="primary"
        />
        <StatCard
          label="Sản lượng đạt chuẩn"
          value={formatQuantity(totalActualQty)}
          hint="Thành phẩm nhập kho"
          icon={FactoryIcon}
          tone="emerald"
        />
        <StatCard
          label="Hao hụt bình quân"
          value={`${avgWasteRate}%`}
          hint={`Phế phẩm: ${formatQuantity(totalWasteQty)}`}
          icon={AlertTriangleIcon}
          tone={avgWasteRate > 5 ? "rose" : avgWasteRate > 0 ? "amber" : "emerald"}
        />
        <StatCard
          label="Biên lợi nhuận gộp ước tính"
          value={`${avgGrossMargin}%`}
          hint="Dựa trên giá bán niêm yết"
          icon={TrendingUpIcon}
          tone={avgGrossMargin >= 30 ? "emerald" : "amber"}
        />
      </div>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Bộ lọc báo cáo</CardTitle>
            <CardDescription>
              Xem chi tiết giá thành theo khoảng thời gian và sản phẩm thành phẩm
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form method="get" className="grid gap-4 sm:grid-cols-4 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="from">Từ ngày hoàn thành</Label>
              <Input id="from" name="from" type="date" defaultValue={from} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="to">Đến ngày</Label>
              <Input id="to" name="to" type="date" defaultValue={to} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="productId">Thành phẩm</Label>
              <Select name="productId" defaultValue={productId}>
                <SelectTrigger id="productId">
                  <SelectValue placeholder="Tất cả thành phẩm" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả thành phẩm</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="default" className="w-full sm:w-auto">
                <FilterIcon /> Lọc dữ liệu
              </Button>
              {(from || to || (productId && productId !== "all")) && (
                <Button asChild variant="outline">
                  <Link href="/san-xuat/gia-thanh">Đặt lại</Link>
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bảng phân tích giá thành chi tiết</CardTitle>
          <CardDescription>
            Bảng bóc tách cơ cấu chi phí sản xuất từng lô: Nguyên vật liệu, Nhân công, Chi phí chung và % Lãi gộp
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã lệnh</TableHead>
                  <TableHead>Thành phẩm</TableHead>
                  <TableHead className="text-right">Sản lượng (Đạt / Phế phẩm)</TableHead>
                  <TableHead className="text-center">Hao hụt</TableHead>
                  <TableHead className="text-right">Chi phí NVL</TableHead>
                  <TableHead className="text-right">Nhân công</TableHead>
                  <TableHead className="text-right">Chi phí chung</TableHead>
                  <TableHead className="text-right">Tổng chi phí</TableHead>
                  <TableHead className="text-right font-bold text-foreground">
                    Giá thành / ĐV
                  </TableHead>
                  <TableHead className="text-right">Giá bán</TableHead>
                  <TableHead className="text-center">Biên lãi</TableHead>
                  <TableHead>Ghi chú</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={12}
                      className="py-12 text-center text-sm text-muted-foreground"
                    >
                      Chưa có lệnh sản xuất nào hoàn thành trong kỳ được chọn.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => {
                    const isHighWaste = row.waste_rate > 5;
                    return (
                      <TableRow key={row.order_id}>
                        <TableCell className="font-mono text-xs font-medium">
                          {row.order_code}
                          <span className="block text-[11px] font-normal text-muted-foreground">
                            {formatDate(row.completed_at)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{row.product_name}</p>
                          <p className="font-mono text-[11px] text-muted-foreground">
                            {row.product_code}
                          </p>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <div>
                            {formatQuantity(row.actual_quantity)}{" "}
                            <span className="text-xs font-normal text-muted-foreground">
                              {row.product_unit}
                            </span>
                          </div>
                          {row.waste_quantity > 0 && (
                            <span className="block text-[11px] font-normal text-rose-600">
                              Lỗi: {formatQuantity(row.waste_quantity)} {row.product_unit}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              isHighWaste
                                ? "destructive"
                                : row.waste_rate > 0
                                  ? "outline"
                                  : "secondary"
                            }
                          >
                            {row.waste_rate}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(row.material_cost)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(row.labor_cost)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(row.other_cost)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(row.total_cost)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-foreground">
                          {formatCurrency(row.unit_cost)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {row.product_sale_price > 0
                            ? formatCurrency(row.product_sale_price)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {row.product_sale_price > 0 ? (
                            <span
                              className={
                                row.gross_margin_rate >= 30
                                  ? "text-emerald-600 font-semibold"
                                  : row.gross_margin_rate > 0
                                    ? "text-amber-600"
                                    : "text-rose-600"
                              }
                            >
                              {row.gross_margin_rate}%
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground">
                          {row.note ?? "—"}
                        </TableCell>
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
