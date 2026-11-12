import { FlaskConicalIcon, LayersIcon, PencilLineIcon } from "lucide-react";
import { BomForm } from "@/components/forms/bom-form";
import { DeleteBomDialog } from "@/components/forms/delete-bom-dialog";
import { EditBomDialog } from "@/components/forms/edit-bom-dialog";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
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
import { formatCurrency, formatDate, formatQuantity } from "@/lib/format";
import { CAN_ACCESS } from "@/lib/labels";
import { getBoms, getItems } from "@/lib/queries";

export default async function CongThucPage() {
  await requireRole(CAN_ACCESS.sanXuatBom);

  const [boms, allItems] = await Promise.all([
    getBoms(),
    getItems(),
  ]);

  const products = allItems.filter(
    (i) => i.type === "thanh_pham" || i.type === "ban_thanh_pham",
  );
  const materials = allItems.filter(
    (i) => i.type === "nguyen_lieu" || i.type === "ban_thanh_pham",
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Công thức định lượng (BOM)"
        description="Thiết lập nguyên liệu tiêu hao cho mỗi đơn vị thành phẩm. Hệ thống dùng công thức này khi xác nhận lệnh sản xuất."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PencilLineIcon className="size-4 text-primary" />
            Thiết lập công thức
          </CardTitle>
          <CardDescription>
            Chọn thành phẩm để tạo mới hoặc cập nhật công thức hiện có.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BomForm products={products} materials={materials} boms={boms} />
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase">
          Công thức đã thiết lập ({boms.length})
        </h2>

        {boms.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FlaskConicalIcon className="mx-auto size-8 text-muted-foreground/60" />
              <p className="mt-3 text-sm text-muted-foreground">
                Chưa có công thức nào. Thiết lập công thức đầu tiên ở phía trên.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {boms.map((bom) => {
              const batchCost = bom.items.reduce(
                (total, line) =>
                  total + line.quantity * line.material_unit_price,
                0,
              );
              const unitCost =
                bom.output_quantity > 0 ? batchCost / bom.output_quantity : 0;

              return (
                <Card key={bom.id}>
                  <CardHeader className="gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle>{bom.product_name}</CardTitle>
                        <CardDescription>
                          {bom.product_code} · Đầu ra{" "}
                          {formatQuantity(bom.output_quantity)}{" "}
                          {bom.product_unit}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="secondary" className="hidden sm:inline-flex">
                          <LayersIcon /> {bom.items.length} nguyên liệu
                        </Badge>
                        <EditBomDialog bom={bom} materials={materials} />
                        <DeleteBomDialog bom={bom} />
                      </div>
                    </div>
                    {bom.note && (
                      <p className="text-xs text-muted-foreground">{bom.note}</p>
                    )}
                  </CardHeader>
                  <CardContent className="px-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nguyên liệu</TableHead>
                            <TableHead className="text-right">
                              Định lượng
                            </TableHead>
                            <TableHead className="text-right">Đơn giá</TableHead>
                            <TableHead className="text-right">Chi phí</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bom.items.map((line) => (
                            <TableRow key={line.id}>
                              <TableCell>
                                <p className="font-medium">{line.material_name}</p>
                                <p className="font-mono text-[11px] text-muted-foreground">
                                  {line.material_code}
                                </p>
                              </TableCell>
                              <TableCell className="text-right">
                                {formatQuantity(line.quantity)}{" "}
                                <span className="text-xs text-muted-foreground">
                                  {line.material_unit}
                                </span>
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {formatCurrency(line.material_unit_price)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(
                                  line.quantity * line.material_unit_price,
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 pt-3 text-xs text-muted-foreground">
                      <span>
                        Cập nhật: {formatDate(bom.updated_at)}
                      </span>
                      <span className="text-right">
                        Chi phí / lô:{" "}
                        <strong className="text-foreground">
                          {formatCurrency(batchCost)}
                        </strong>
                        {" · "}
                        Đơn giá:{" "}
                        <strong className="text-foreground">
                          {formatCurrency(unitCost)}
                        </strong>
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
