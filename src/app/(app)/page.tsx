import Link from "next/link";
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  BoxesIcon,
  FactoryIcon,
  WalletIcon,
} from "lucide-react";
import { MonthlyCashChart } from "@/components/monthly-cash-chart";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { formatCurrency, formatNumber } from "@/lib/format";
import { CAN_ACCESS } from "@/lib/labels";
import { getDashboardData } from "@/lib/queries";

function currentMonthLabel(): string {
  return new Intl.DateTimeFormat("vi-VN", {
    month: "long",
    year: "numeric",
  }).format(new Date());
}

export default async function DashboardPage() {
  await requireRole(CAN_ACCESS.dashboard);
  const data = await getDashboardData();

  const current = data.monthly.at(-1);
  const thu = current?.thu ?? 0;
  const chi = current?.chi ?? 0;
  const profit = thu - chi;
  const ratio = thu > 0 ? Math.min(Math.round((chi / thu) * 100), 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bảng điều khiển"
        description="Tổng quan hoạt động kho, sản xuất và dòng tiền của doanh nghiệp."
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/kho/nhap-xuat">
            Nhập / xuất kho <ArrowRightIcon />
          </Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/san-xuat">
            Lệnh sản xuất <ArrowRightIcon />
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tổng giá trị tồn kho"
          value={formatCurrency(data.totalStockValue)}
          hint="Theo đơn giá hiện hành"
          icon={BoxesIcon}
          tone="primary"
        />
        <StatCard
          label="Quỹ tiền hiện tại"
          value={formatCurrency(data.cashBalance)}
          hint="Tổng thu trừ tổng chi"
          icon={WalletIcon}
          tone="emerald"
        />
        <StatCard
          label="Lệnh sản xuất chờ"
          value={formatNumber(data.pendingOrdersToday)}
          hint="Đến hạn hôm nay hoặc trước đó"
          icon={FactoryIcon}
          tone="amber"
        />
        <StatCard
          label="Mặt hàng dưới định mức"
          value={formatNumber(data.lowStockCount)}
          hint="Cần nhập thêm nguyên liệu"
          icon={AlertTriangleIcon}
          tone="rose"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Thu chi 6 tháng gần nhất</CardTitle>
            <CardDescription>
              Tổng hợp từ sổ quỹ theo tháng, đơn vị VNĐ.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MonthlyCashChart data={data.monthly} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="capitalize">{currentMonthLabel()}</CardTitle>
            <CardDescription>Số liệu tháng hiện tại</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tổng thu</span>
                <span className="font-medium text-emerald-600">
                  {formatCurrency(thu)}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tổng chi</span>
                <span className="font-medium text-rose-600">
                  {formatCurrency(chi)}
                </span>
              </div>
              <div className="my-3 border-t border-dashed" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Chênh lệch</span>
                <span
                  className={
                    profit >= 0
                      ? "font-semibold text-emerald-600"
                      : "font-semibold text-rose-600"
                  }
                >
                  {formatCurrency(profit)}
                </span>
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                <span>Tỷ lệ chi / thu</span>
                <span>{ratio}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${ratio}%` }}
                />
              </div>
            </div>

            <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
              {data.lowStockCount > 0
                ? `Có ${data.lowStockCount} mặt hàng dưới định mức tồn kho. Nên lên kế hoạch nhập nguyên liệu.`
                : "Tồn kho đang ở mức an toàn, không có mặt hàng nào dưới định mức."}
            </div>

            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/ke-toan">
                Xem sổ quỹ <ArrowRightIcon />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
