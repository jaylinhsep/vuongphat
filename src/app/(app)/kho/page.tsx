import Link from "next/link";
import {
  AlertTriangleIcon,
  ArrowLeftRightIcon,
  BoxesIcon,
  CoinsIcon,
  SearchIcon,
  Settings2Icon,
} from "lucide-react";
import { ItemTypeBadge } from "@/components/status-badges";
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
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireRole(CAN_ACCESS.kho);
  const { q } = await searchParams;
  const inventory = await getInventory(q);

  const totalValue = inventory.reduce(
    (total, item) => total + Math.max(item.on_hand, 0) * item.unit_price,
    0,
  );
  const lowStock = inventory.filter(
    (item) => item.min_stock > 0 && item.on_hand < item.min_stock,
  ).length;
  const canWrite = CAN_ACCESS.khoWrite(user.role);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tồn kho"
        description="Số lượng tồn khả dụng theo thời gian thực, tính từ toàn bộ phiếu kho."
      >
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

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Mặt hàng đang quản lý"
          value={formatNumber(inventory.length)}
          icon={BoxesIcon}
        />
        <StatCard
          label="Giá trị tồn kho"
          value={formatCurrency(totalValue)}
          hint="Theo đơn giá hiện hành"
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

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Danh sách hàng hóa</CardTitle>
          <form action="/kho" className="flex w-full gap-2 sm:w-auto">
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
                  <TableHead>Loại</TableHead>
                  <TableHead className="text-right">Tồn kho</TableHead>
                  <TableHead className="text-right">Đơn giá</TableHead>
                  <TableHead className="text-right">Giá trị tồn</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Không tìm thấy hàng hóa phù hợp.
                    </TableCell>
                  </TableRow>
                ) : (
                  inventory.map((item) => {
                    const isLow =
                      item.min_stock > 0 && item.on_hand < item.min_stock;
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
                        <TableCell className="text-right">
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
