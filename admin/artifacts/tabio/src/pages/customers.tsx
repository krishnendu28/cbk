import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { BridgeOrder, deriveCustomersFromOrders, fetchBridgeOrders, subscribeBridgeOrders } from "@/lib/bridge";

export default function Customers() {
  const [orders, setOrders] = useState<BridgeOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchBridgeOrders();
        setOrders(data);
      } finally {
        setIsLoading(false);
      }
    }

    load();

    return subscribeBridgeOrders(
      (order) => setOrders((prev) => [order, ...prev]),
      (updated) => setOrders((prev) => prev.map((order) => (order._id === updated._id ? updated : order))),
    );
  }, []);

  const customers = useMemo(() => deriveCustomersFromOrders(orders), [orders]);

  if (isLoading) return <div className="p-8">Loading CRM...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">CRM & Loyalty</h1>
          <p className="text-muted-foreground">Manage your customer relationships and loyalty points</p>
        </div>
      </div>

      <Card className="shadow-sm border-border overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Total Orders</TableHead>
              <TableHead>Lifetime Spend</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Last Visit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.phone || customer.name}>
                <TableCell className="font-semibold">{customer.name}</TableCell>
                <TableCell>{customer.phone}</TableCell>
                <TableCell>{customer.orders}</TableCell>
                <TableCell className="font-bold text-primary">Rs {customer.spend}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 max-w-[280px] truncate">
                    {customer.address}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {customer.lastVisit ? format(new Date(customer.lastVisit), "MMM d, yyyy") : "Never"}
                </TableCell>
              </TableRow>
            ))}
            {customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No customer orders yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
