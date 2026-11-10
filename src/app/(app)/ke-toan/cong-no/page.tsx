import Link from "next/link";
import {
  ArrowDownLeftIcon,
  ArrowLeftIcon,
  ArrowUpRightIcon,
  DownloadIcon,
  ScaleIcon,
  ShoppingCartIcon,
  TruckIcon,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireRole } from "@/lib/auth";
import { formatCurrency, formatNumber } from "@/lib/format";
import { CAN_ACCESS } from "@/lib/labels";
import { getCustomerDebts, getSupplierDebts } from "@/lib/queries";

export default async function CongNoPage() {
  await requireRole(CAN_ACCESS.keToan);

  const [customerDebts, supplierDebts] = await Promise.all([
    getCustomerDebts(),
    getSupplierDebts(),
  ]);

  const totalReceivable = customerDebts.reduce(
    (sum, c) => sum + c.debt_amount,
    0,
  );
  const totalPayable = supplierDebts.reduce(
    (sum, s) => sum + s.debt_amount,
    0,
  );
  const netDebt = totalReceivable - totalPayable;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Công nợ"
        description="Theo dõi chi tiết công nợ phải thu từ khách hàng và công nợ phải trả cho nhà cung cấp."
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/ke-toan">
            <ArrowLeftIcon /> Sổ quỹ thu chi
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href="/api/ke-toan/cong-no/excel">
            <DownloadIcon /> Xuất Excel công nợ
          </a>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Công nợ phải thu (Khách hàng)"
          value={formatCurrency(totalReceivable)}
          hint={`${customerDebts.filter((c) => c.debt_amount > 0).length} khách hàng còn nợ`}
          icon={ArrowDownLeftIcon}
          tone="emerald"
        />
        <StatCard
          label="Công nợ phải trả (Nhà cung cấp)"
          value={formatCurrency(totalPayable)}
          hint={`${supplierDebts.filter((s) => s.debt_amount > 0).length} nhà cung cấp còn nợ`}
          icon={ArrowUpRightIcon}
          tone="rose"
        />
        <StatCard
          label="Chênh lệch công nợ thuần"
          value={formatCurrency(netDebt)}
          hint="Phải thu trừ đi phải trả"
          icon={ScaleIcon}
          tone={netDebt >= 0 ? "primary" : "amber"}
        />
      </div>

      <Tabs defaultValue="receivable" className="space-y-4">
        <TabsList>
          <TabsTrigger value="receivable" className="gap-2">
            <ShoppingCartIcon className="size-4" /> Phải thu khách hàng (
            {customerDebts.length})
          </TabsTrigger>
          <TabsTrigger value="payable" className="gap-2">
            <TruckIcon className="size-4" /> Phải trả nhà cung cấp (
            {supplierDebts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="receivable">
          <Card>
            <CardHeader>
              <CardTitle>Công nợ Khách hàng</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">STT</TableHead>
                      <TableHead className="w-28 font-mono">Mã KH</TableHead>
                      <TableHead>Khách hàng</TableHead>
                      <TableHead className="w-36">Điện thoại</TableHead>
                      <TableHead className="text-right">Tổng mua</TableHead>
                      <TableHead className="text-right">Đã thanh toán</TableHead>
                      <TableHead className="text-right">Còn nợ (Phải thu)</TableHead>
                      <TableHead className="w-28 text-center">Chi tiết</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerDebts.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="h-24 text-center text-neutral-500"
                        >
                          Chưa có phát sinh công nợ khách hàng.
                        </TableCell>
                      </TableRow>
                    ) : (
                      customerDebts.map((c, idx) => (
                        <TableRow key={c.customer_id}>
                          <TableCell className="text-center font-mono text-xs text-neutral-500">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-semibold">
                            {c.customer_code}
                          </TableCell>
                          <TableCell className="font-medium">
                            {c.customer_name}
                          </TableCell>
                          <TableCell>{c.customer_phone || "—"}</TableCell>
                          <TableCell className="text-right text-sm">
                            {formatCurrency(c.total_sales)}
                          </TableCell>
                          <TableCell className="text-right text-xs text-neutral-600">
                            {formatCurrency(c.total_paid)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-sm">
                            <span
                              className={
                                c.debt_amount > 0
                                  ? "text-rose-600 font-bold"
                                  : "text-emerald-700"
                              }
                            >
                              {formatCurrency(c.debt_amount)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button asChild variant="ghost" size="sm">
                              <Link href="/ban-hang">Xem đơn</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payable">
          <Card>
            <CardHeader>
              <CardTitle>Công nợ Nhà cung cấp</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">STT</TableHead>
                      <TableHead>Nhà cung cấp</TableHead>
                      <TableHead className="w-36">Điện thoại</TableHead>
                      <TableHead className="text-right">Tổng đặt mua</TableHead>
                      <TableHead className="text-right">Đã trả</TableHead>
                      <TableHead className="text-right">Còn nợ (Phải trả)</TableHead>
                      <TableHead className="w-28 text-center">Chi tiết</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierDebts.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="h-24 text-center text-neutral-500"
                        >
                          Chưa có phát sinh công nợ nhà cung cấp.
                        </TableCell>
                      </TableRow>
                    ) : (
                      supplierDebts.map((s, idx) => (
                        <TableRow key={s.supplier_id}>
                          <TableCell className="text-center font-mono text-xs text-neutral-500">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="font-medium">
                            {s.supplier_name}
                          </TableCell>
                          <TableCell>{s.supplier_phone || "—"}</TableCell>
                          <TableCell className="text-right text-sm">
                            {formatCurrency(s.total_purchases)}
                          </TableCell>
                          <TableCell className="text-right text-xs text-neutral-600">
                            {formatCurrency(s.total_paid)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-sm">
                            <span
                              className={
                                s.debt_amount > 0
                                  ? "text-rose-600 font-bold"
                                  : "text-emerald-700"
                              }
                            >
                              {formatCurrency(s.debt_amount)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button asChild variant="ghost" size="sm">
                              <Link href="/mua-hang">Xem đơn</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
