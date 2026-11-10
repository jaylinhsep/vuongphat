import { notFound } from "next/navigation";
import { PrintOrderDocument } from "@/components/print-order-document";
import { requireRole } from "@/lib/auth";
import { CAN_ACCESS } from "@/lib/labels";
import { getBoms, getProductionOrders } from "@/lib/queries";

export default async function PrintOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(CAN_ACCESS.sanXuat);
  const { id } = await params;

  const [orders, boms] = await Promise.all([
    getProductionOrders(),
    getBoms(),
  ]);

  const order = orders.find((entry) => entry.id === id);
  if (!order) notFound();

  const bom = boms.find((entry) => entry.product_id === order.product_id) ?? null;

  return (
    <PrintOrderDocument order={order} bom={bom} printerName={user.name} />
  );
}