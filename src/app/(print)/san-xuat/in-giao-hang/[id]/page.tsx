import { notFound } from "next/navigation";
import { PrintDeliveryDocument } from "@/components/print-delivery-document";
import { requireRole } from "@/lib/auth";
import { CAN_ACCESS } from "@/lib/labels";
import { getProductionOrders } from "@/lib/queries";

export default async function PrintProductionDeliveryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(CAN_ACCESS.sanXuat);
  const { id } = await params;

  const orders = await getProductionOrders();
  const order = orders.find((entry) => entry.id === id);
  if (!order) notFound();

  return (
    <PrintDeliveryDocument order={order} printerName={user.name} />
  );
}
