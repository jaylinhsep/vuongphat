import Link from "next/link";
import {
  CalculatorIcon,
  CheckCircle2Icon,
  ClockIcon,
  FactoryIcon,
  FlaskConicalIcon,
  PrinterIcon,
} from "lucide-react";
import { ConfirmOrderButton } from "@/components/forms/confirm-order-button";
import { ProductionOrderDialog } from "@/components/forms/production-order-form";
import { PageHeader } from "@/components/page-header";
import { ProductionStatusBadge } from "@/components/status-badges";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  formatDate,
  formatDateTime,
  formatNumber,
  formatQuantity,
} from "@/lib/format";
import { CAN_ACCESS } from "@/lib/labels";
import { getBoms, getItems, getProductionOrders } from "@/lib/queries";

export default async function SanXuatPage() {
  const user = await requireRole(CAN_ACCESS.sanXuat);

  const [orders, allItems, boms] = await Promise.all([
    getProductionOrders(),
    getItems(),
    getBoms(),
  ]);

  const products = allItems.filter(
    (i) => i.type === "thanh_pham" || i.type === "ban_thanh_pham",
  );

  const bomProductIds = new Set(boms.map((bom) => bom.product_id));
  const pending = orders.filter((order) => order.status === "cho_xac_nhan");
  const completed = orders.filter((order) => order.status === "hoan_thanh");

  return (
    <div className="space-y-5 sm:space-y-6 max-w-full overflow-hidden">
      <PageHeader
        title="Lệnh sản xuất"
        description="Tạo lệnh và xác nhận hoàn thành để hệ thống tự động trừ nguyên liệu, nhập thành phẩm."
      >
        <div className="flex flex-wrap items-center gap-2">
          {CAN_ACCESS.sanXuatBom(user.role) && (
            <Button asChild variant="outline" size="sm">
              <Link href="/san-xuat/cong-thuc">
                <FlaskConicalIcon className="h-4 w-4" />
                <span className="hidden xs:inline">Công thức BOM</span>
              </Link>
            </Button>
          )}
          {CAN_ACCESS.sanXuatGiaThanh(user.role) && (
            <Button asChild variant="outline" size="sm">
              <Link href="/san-xuat/gia-thanh">
                <CalculatorIcon className="h-4 w-4" />
                <span className="hidden xs:inline">Báo cáo giá thành</span>
              </Link>
            </Button>
          )}
          <ProductionOrderDialog products={products} />
        </div>
      </PageHeader>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3">
        <StatCard
          label="Tổng lệnh sản xuất"
          value={formatNumber(orders.length)}
          icon={FactoryIcon}
        />
        <StatCard
          label="Chờ xác nhận"
          value={formatNumber(pending.length)}
          hint="Chưa trừ nguyên liệu"
          icon={ClockIcon}
          tone="amber"
        />
        <StatCard
          label="Đã hoàn thành"
          value={formatNumber(completed.length)}
          icon={CheckCircle2Icon}
          tone="emerald"
        />
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Danh sách lệnh sản xuất ({orders.length})</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Bấm “Xác nhận” trên lệnh đang chờ để trừ kho theo định lượng BOM.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {orders.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Chưa có lệnh sản xuất nào.
            </div>
          ) : (
            <>
              {/* MOBILE VIEW: Cards */}
              <div className="divide-y divide-neutral-200 border-t sm:hidden">
                {orders.map((order) => {
                  const missingBom =
                    order.status === "cho_xac_nhan" &&
                    !bomProductIds.has(order.product_id);
                  return (
                    <div key={order.id} className="p-4 space-y-3 bg-white">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono font-bold text-sm text-neutral-900">
                            {order.code}
                          </span>
                          <span className="text-xs text-neutral-500 ml-2">
                            {formatDate(order.planned_date)}
                          </span>
                        </div>
                        <ProductionStatusBadge status={order.status} />
                      </div>

                      <div className="bg-neutral-50 rounded p-2.5 space-y-1">
                        <div className="font-semibold text-neutral-900 text-sm">
                          {order.product_name}
                        </div>
                        <div className="flex justify-between text-xs text-neutral-600">
                          <span>Mã: {order.product_code}</span>
                          <span className="font-semibold text-neutral-900">
                            {order.status === "hoan_thanh" && order.actual_quantity != null
                              ? `${formatQuantity(order.actual_quantity)} ${order.product_unit}`
                              : `${formatQuantity(order.quantity)} ${order.product_unit}`}
                          </span>
                        </div>
                        {missingBom && (
                          <p className="text-[11px] text-rose-600 font-medium">
                            Thiếu công thức BOM
                          </p>
                        )}
                        {order.waste_quantity ? (
                          <p className="text-[11px] text-rose-600">
                            Hao hụt: {formatQuantity(order.waste_quantity)} {order.product_unit}
                          </p>
                        ) : null}
                      </div>

                      {order.completed_at && (
                        <div className="text-xs text-neutral-500">
                          Hoàn thành lúc: {formatDateTime(order.completed_at)}
                        </div>
                      )}

                      {order.note && (
                        <div className="text-xs text-neutral-600 italic">
                          Ghi chú: {order.note}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-end gap-1.5 pt-2 border-t">
                        <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                          <a
                            href={`/san-xuat/in-lenh/${order.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <PrinterIcon className="h-3.5 w-3.5 mr-1" />
                            In lệnh
                          </a>
                        </Button>
                        {order.status === "cho_xac_nhan" && (
                          <ConfirmOrderButton
                            orderId={order.id}
                            orderCode={order.code}
                            productName={order.product_name}
                            plannedQuantity={order.quantity}
                            productUnit={order.product_unit}
                            canInputCost={CAN_ACCESS.sanXuatGiaThanh(user.role)}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP VIEW: Table */}
              <div className="hidden sm:block overflow-x-auto border-t sm:border-y sm:rounded-md sm:border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã lệnh</TableHead>
                      <TableHead>Thành phẩm</TableHead>
                      <TableHead className="text-right">Số lượng</TableHead>
                      <TableHead>Ngày kế hoạch</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Hoàn thành lúc</TableHead>
                      <TableHead>Ghi chú</TableHead>
                      <TableHead className="text-center">In lệnh</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => {
                      const missingBom =
                        order.status === "cho_xac_nhan" &&
                        !bomProductIds.has(order.product_id);
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-xs">
                            {order.code}
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{order.product_name}</p>
                            <p className="font-mono text-[11px] text-muted-foreground">
                              {order.product_code}
                            </p>
                            {missingBom && (
                              <p className="mt-0.5 text-[11px] text-rose-600">
                                Thiếu công thức BOM
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {order.status === "hoan_thanh" && order.actual_quantity != null ? (
                              <>
                                <div>
                                  {formatQuantity(order.actual_quantity)}{" "}
                                  <span className="text-xs font-normal text-muted-foreground">
                                    {order.product_unit}
                                  </span>
                                </div>
                                {order.waste_quantity ? (
                                  <span className="block text-[11px] font-normal text-rose-600">
                                    Hao hụt: {formatQuantity(order.waste_quantity)}
                                  </span>
                                ) : null}
                              </>
                            ) : (
                              <>
                                {formatQuantity(order.quantity)}{" "}
                                <span className="text-xs font-normal text-muted-foreground">
                                  {order.product_unit}
                                </span>
                              </>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(order.planned_date)}
                          </TableCell>
                          <TableCell>
                            <ProductionStatusBadge status={order.status} />
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDateTime(order.completed_at)}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-muted-foreground">
                            {order.note ?? "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button asChild size="sm" variant="outline" className="h-8 px-2 text-xs">
                              <a
                                href={`/san-xuat/in-lenh/${order.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="In lệnh sản xuất"
                              >
                                <PrinterIcon className="h-3.5 w-3.5 mr-1" />
                                In lệnh
                              </a>
                            </Button>
                          </TableCell>
                          <TableCell className="text-right">
                            {order.status === "cho_xac_nhan" ? (
                              <ConfirmOrderButton
                                orderId={order.id}
                                orderCode={order.code}
                                productName={order.product_name}
                                plannedQuantity={order.quantity}
                                productUnit={order.product_unit}
                                canInputCost={CAN_ACCESS.sanXuatGiaThanh(user.role)}
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                Đã nhập kho
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
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