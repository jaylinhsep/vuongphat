import { notFound } from "next/navigation";
import { PrintSalesDeliveryDocument } from "@/components/print-sales-delivery-document";
import { requireRole } from "@/lib/auth";
import { CAN_ACCESS } from "@/lib/labels";
import { getSalesOrder } from "@/lib/queries";

export default async function PrintSalesDeliveryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(
    (role) => CAN_ACCESS.banHang(role) || CAN_ACCESS.sanXuat(role),
  );
  const { id } = await params;

  const order = await getSalesOrder(id);
  if (!order) notFound();

  return (
    <PrintSalesDeliveryDocument order={order} printerName={user.name} />
  );
}
