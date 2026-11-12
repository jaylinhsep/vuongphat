import Link from "next/link";
import {
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  FactoryIcon,
  FileTextIcon,
  MapPinIcon,
  PhoneIcon,
  PrinterIcon,
  TruckIcon,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { SalesOrderStatusBadge } from "@/components/status-badges";
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
import { requireRole } from "@/lib/auth";
import { formatDate, formatNumber } from "@/lib/format";
import { CAN_ACCESS } from "@/lib/labels";
import { getSalesOrders } from "@/lib/queries";
import type { SalesOrderStatus } from "@/lib/types";

export default async function SanXuatDonHangPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireRole(CAN_ACCESS.sanXuat);
  const params = await searchParams;
  const statusFilter = (params.status ?? "all") as SalesOrderStatus | "all";

  const orders = await getSalesOrders(statusFilter);

  // Stats calculation
  const allOrders = statusFilter === "all" ? orders : await getSalesOrders("all");
  const pendingOrders = allOrders.filter((o) => o.status === "cho_xac_nhan").length;
  const deliveredOrders = allOrders.filter((o) => o.status === "da_giao").length;

  return (
    <div className="space-y-5 sm:space-y-6 max-w-full overflow-hidden">
      <PageHeader
        title="Thông tin đơn hàng"
        description="Theo dõi danh sách đơn hàng cần sản xuất & đóng gói giao khách. In phiếu giao hàng (không hiện giá)."
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/san-xuat">
            <FactoryIcon className="h-4 w-4" />
            <span>Lệnh sản xuất</span>
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3">
        <StatCard
          label="Tổng đơn hàng"
          value={formatNumber(allOrders.length)}
          hint="Toàn bộ đơn khách đặt"
          icon={FileTextIcon}
        />
        <StatCard
          label="Chờ xuất giao"
          value={formatNumber(pendingOrders)}
          hint="Cần chuẩn bị hàng"
          icon={ClockIcon}
          tone={pendingOrders > 0 ? "amber" : undefined}
        />
        <StatCard
          label="Đã giao hàng"
          value={formatNumber(deliveredOrders)}
          hint="Đã hoàn tất giao khách"
          icon={CheckCircle2Icon}
          tone="emerald"
        />
      </div>

      <div className="flex gap-2 border-b pb-3 overflow-x-auto no-scrollbar">
        {[
          { key: "all", label: "Tất cả đơn" },
          { key: "cho_xac_nhan", label: "Chờ xuất giao" },
          { key: "da_giao", label: "Đã giao hàng" },
        ].map((tab) => {
          const isActive = statusFilter === tab.key;
          return (
            <Button
              key={tab.key}
              asChild
              variant={isActive ? "default" : "outline"}
              size="sm"
              className="shrink-0"
            >
              <Link
                href={
                  tab.key === "all"
                    ? "/san-xuat/don-hang"
                    : `/san-xuat/don-hang?status=${tab.key}`
                }
              >
                {tab.label}
              </Link>
            </Button>
          );
        })}
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">
            Danh sách đơn hàng xuất giao ({orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {orders.length === 0 ? (
            <div className="h-28 flex items-center justify-center text-center text-sm text-neutral-500">
              Không có đơn hàng nào.
            </div>
          ) : (
            <>
              {/* MOBILE VIEW: Cards */}
              <div className="divide-y divide-neutral-200 border-t sm:hidden">
                {orders.map((order) => (
                  <div key={order.id} className="p-4 space-y-3 bg-white">
                    {/* Header: Code + Date + Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-sm text-neutral-900">
                          {order.code}
                        </span>
                        <div className="text-xs text-neutral-500 mt-0.5">
                          Ngày đặt: {formatDate(order.order_date)}
                        </div>
                      </div>
                      <SalesOrderStatusBadge status={order.status} />
                    </div>

                    {/* Customer info */}
                    <div className="text-xs space-y-1 bg-neutral-50 rounded p-2.5">
                      <div className="font-semibold text-neutral-900 text-sm">
                        {order.customer_name}
                      </div>
                      {order.customer_phone && (
                        <div className="flex items-center gap-1 text-neutral-600">
                          <PhoneIcon className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                          <span>{order.customer_phone}</span>
                        </div>
                      )}
                      {order.customer_address && (
                        <div className="flex items-center gap-1 text-neutral-600">
                          <MapPinIcon className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                          <span className="line-clamp-2">{order.customer_address}</span>
                        </div>
                      )}
                      {order.delivery_date && (
                        <div className="flex items-center gap-1 text-amber-700 font-medium pt-0.5">
                          <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                          <span>Hẹn giao: {formatDate(order.delivery_date)}</span>
                        </div>
                      )}
                    </div>

                    {/* Items (No Price) */}
                    <div className="text-xs space-y-1">
                      <span className="text-neutral-500 font-medium">Mặt hàng giao:</span>
                      <div className="space-y-1 pl-1">
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between items-center text-neutral-800 bg-neutral-100/60 rounded px-2 py-1"
                          >
                            <span className="font-medium">• {item.item_name}</span>
                            <span className="font-bold text-neutral-900">
                              {item.quantity} {item.item_unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {order.note && (
                      <div className="text-xs text-neutral-600 italic">
                        Ghi chú: {order.note}
                      </div>
                    )}

                    {/* Action: In phiếu giao hàng */}
                    <div className="flex items-center justify-end pt-2 border-t">
                      <Button asChild size="sm" variant="default" className="h-8 text-xs">
                        <a
                          href={`/san-xuat/in-phieu-giao/${order.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <PrinterIcon className="h-3.5 w-3.5 mr-1" />
                          In phiếu giao hàng
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* DESKTOP VIEW: Table */}
              <div className="hidden sm:block overflow-x-auto border-t sm:border-y sm:rounded-md sm:border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">STT</TableHead>
                      <TableHead className="w-32 font-mono">Mã đơn</TableHead>
                      <TableHead className="w-28">Ngày đặt</TableHead>
                      <TableHead className="w-32">Hẹn giao</TableHead>
                      <TableHead>Khách hàng &amp; Địa chỉ</TableHead>
                      <TableHead>Mặt hàng cần giao (Số lượng)</TableHead>
                      <TableHead className="w-32 text-center">Trạng thái</TableHead>
                      <TableHead className="max-w-[180px]">Ghi chú</TableHead>
                      <TableHead className="w-36 text-center">Phiếu giao</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order, idx) => (
                      <TableRow key={order.id}>
                        <TableCell className="text-center font-mono text-xs text-neutral-500">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold">
                          {order.code}
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatDate(order.order_date)}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-amber-800">
                          {order.delivery_date ? formatDate(order.delivery_date) : "—"}
                        </TableCell>
                        <TableCell>
                          <p className="font-semibold text-sm">
                            {order.customer_name}
                          </p>
                          {order.customer_phone && (
                            <p className="text-xs text-neutral-500">
                              {order.customer_phone}
                            </p>
                          )}
                          {order.customer_address && (
                            <p className="text-xs text-neutral-600 line-clamp-1">
                              {order.customer_address}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {order.items.map((item) => (
                            <div key={item.id} className="leading-tight py-0.5">
                              • <span className="font-medium">{item.item_name}</span>:{" "}
                              <span className="font-bold text-neutral-900">
                                {item.quantity} {item.item_unit}
                              </span>
                            </div>
                          ))}
                        </TableCell>
                        <TableCell className="text-center">
                          <SalesOrderStatusBadge status={order.status} />
                        </TableCell>
                        <TableCell className="text-xs text-neutral-600 max-w-[180px] truncate">
                          {order.note ?? "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button asChild size="sm" variant="outline" className="h-8 px-2 text-xs">
                            <a
                              href={`/san-xuat/in-phieu-giao/${order.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="In phiếu giao hàng (không hiện giá)"
                            >
                              <PrinterIcon className="h-3.5 w-3.5 mr-1" />
                              In phiếu giao
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
