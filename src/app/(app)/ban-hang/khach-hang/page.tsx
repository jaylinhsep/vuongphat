import Link from "next/link";
import { ArrowLeftIcon, SearchIcon, UsersRoundIcon } from "lucide-react";
import { deleteCustomerAction } from "@/actions/ban-hang-actions";
import { ConfirmDeleteButton } from "@/components/forms/confirm-delete-button";
import {
  CreateCustomerDialog,
  EditCustomerDialog,
} from "@/components/forms/customer-forms";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
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
import { formatNumber } from "@/lib/format";
import { CAN_ACCESS } from "@/lib/labels";
import { getCustomers } from "@/lib/queries";

export default async function KhachHangPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireRole(CAN_ACCESS.banHang);
  const { q } = await searchParams;
  const customers = await getCustomers(q);
  const canWrite = CAN_ACCESS.banHangWrite(user.role);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Danh mục khách hàng"
        description="Quản lý danh sách đối tác, đại lý và khách hàng của doanh nghiệp."
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/ban-hang">
            <ArrowLeftIcon /> Đơn bán hàng
          </Link>
        </Button>
        {canWrite && <CreateCustomerDialog />}
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Tổng số khách hàng"
          value={formatNumber(customers.length)}
          icon={UsersRoundIcon}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Khách hàng ({customers.length})</CardTitle>
          <form className="relative w-64">
            <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-neutral-400" />
            <Input
              name="q"
              placeholder="Tìm theo tên, mã, SĐT..."
              defaultValue={q ?? ""}
              className="pl-8"
            />
          </form>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">STT</TableHead>
                  <TableHead className="w-28 font-mono">Mã KH</TableHead>
                  <TableHead>Tên khách hàng</TableHead>
                  <TableHead className="w-36">Điện thoại</TableHead>
                  <TableHead>Địa chỉ</TableHead>
                  <TableHead>Ghi chú</TableHead>
                  {canWrite && <TableHead className="w-24 text-right">Thao tác</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={canWrite ? 7 : 6}
                      className="h-24 text-center text-neutral-500"
                    >
                      Chưa có khách hàng nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map((c, idx) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-center font-mono text-xs text-neutral-500">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold">
                        {c.code}
                      </TableCell>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.phone || "—"}</TableCell>
                      <TableCell className="text-neutral-600 text-sm">
                        {c.address || "—"}
                      </TableCell>
                      <TableCell className="text-neutral-500 text-xs">
                        {c.note || "—"}
                      </TableCell>
                      {canWrite && (
                        <TableCell className="text-right">
                          <div className="flex justify-end items-center gap-1">
                            <EditCustomerDialog customer={c} />
                            <ConfirmDeleteButton
                              action={deleteCustomerAction}
                              id={c.id}
                              title={`Xóa khách hàng "${c.name}"?`}
                              description="Lưu ý: Không thể xóa khách hàng đã có đơn bán hàng."
                            />
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
