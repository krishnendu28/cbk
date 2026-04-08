import { useEffect } from "react";
import { useAppOutlet } from "@/lib/contexts";
import { 
  useGetZomatoOrders, useGetSwiggyOrders, 
  useAcceptZomatoOrder,
  useAcceptSwiggyOrder,
  useRejectZomatoOrder,
  useRejectSwiggyOrder,
} from "@workspace/api-client-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Check, X, Clock, MapPin, Phone } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function Aggregators() {
  const { outletId } = useAppOutlet();
  
  // Polling simulated via standard query options or just manual interval
  const zQuery = useGetZomatoOrders(outletId);
  const sQuery = useGetSwiggyOrders(outletId);
  
  useEffect(() => {
    const int = setInterval(() => {
      zQuery.refetch();
      sQuery.refetch();
    }, 10000);
    return () => clearInterval(int);
  }, [zQuery, sQuery]);

  const acceptZ = useAcceptZomatoOrder();
  const acceptS = useAcceptSwiggyOrder();
  const rejectZ = useRejectZomatoOrder();
  const rejectS = useRejectSwiggyOrder();

  const handleAccept = (platform: string, orderId: string) => {
    if (platform === 'zomato') {
      acceptZ.mutate({ outletId, aggOrderId: orderId }, {
        onSuccess: () => { toast({ title: "Order Accepted on Zomato" }); zQuery.refetch(); }
      });
    } else {
      acceptS.mutate({ outletId, aggOrderId: orderId }, {
        onSuccess: () => { toast({ title: "Order Accepted on Swiggy" }); sQuery.refetch(); }
      });
    }
  };

  const handleReject = (platform: string, orderId: string) => {
    const reason = "Rejected by restaurant";

    if (platform === "zomato") {
      rejectZ.mutate(
        { outletId, aggOrderId: orderId, data: { reason } },
        {
          onSuccess: () => {
            toast({ title: "Order Rejected on Zomato" });
            zQuery.refetch();
          },
          onError: (error) => {
            const message =
              error && typeof error === "object" && "message" in error
                ? String((error as { message?: unknown }).message ?? "")
                : "Failed to reject order";
            toast({ title: "Reject failed", description: message, variant: "destructive" });
          },
        },
      );
      return;
    }

    rejectS.mutate(
      { outletId, aggOrderId: orderId, data: { reason } },
      {
        onSuccess: () => {
          toast({ title: "Order Rejected on Swiggy" });
          sQuery.refetch();
        },
        onError: (error) => {
          const message =
            error && typeof error === "object" && "message" in error
              ? String((error as { message?: unknown }).message ?? "")
              : "Failed to reject order";
          toast({ title: "Reject failed", description: message, variant: "destructive" });
        },
      },
    );
  };

  const renderOrders = (orders: any[], platform: string, colorClass: string) => {
    if (!orders || orders.length === 0) return <div className="p-8 text-center text-muted-foreground">No active orders.</div>;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {orders.map(order => (
          <Card key={order.id} className="shadow-md border-t-4" style={{ borderTopColor: colorClass }}>
            <CardHeader className="pb-3 border-b bg-slate-50/50">
              <div className="flex justify-between items-start">
                <div>
                  <Badge variant="outline" className="font-mono text-xs mb-2">#{order.id}</Badge>
                  <h3 className="font-bold text-lg">{order.customerName}</h3>
                </div>
                <div className="text-right">
                  <p className="font-bold text-xl text-primary">₹{order.totalAmount}</p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center justify-end gap-1">
                    <Clock className="w-3 h-3"/> {format(new Date(order.createdAt), "h:mm a")}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="text-sm space-y-2 text-muted-foreground">
                <p className="flex items-center gap-2"><Phone className="w-4 h-4"/> {order.customerPhone}</p>
                <p className="flex items-start gap-2"><MapPin className="w-4 h-4 shrink-0 mt-0.5"/> {order.deliveryAddress}</p>
              </div>
              
              <div className="bg-slate-50 p-3 rounded-lg border text-sm">
                <ul className="space-y-2">
                  {order.items.map((i: any, idx: number) => (
                    <li key={idx} className="flex justify-between font-medium">
                      <span>{i.quantity}x {i.name}</span>
                      <span>₹{i.price * i.quantity}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {order.status === 'new' && (
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => handleReject(platform, order.id)}
                  >
                    <X className="w-4 h-4 mr-2" /> Reject
                  </Button>
                  <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20"
                    onClick={() => handleAccept(platform, order.id)}
                  >
                    <Check className="w-4 h-4 mr-2" /> Accept
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Online Orders</h1>
          <p className="text-muted-foreground">Manage incoming delivery partner orders directly</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-full text-sm font-semibold">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Sync Active
        </div>
      </div>

      <Tabs defaultValue="zomato" className="w-full">
        <TabsList className="grid w-[400px] grid-cols-2 mb-6 h-12">
          <TabsTrigger value="zomato" className="text-base data-[state=active]:bg-red-600 data-[state=active]:text-white">Zomato</TabsTrigger>
          <TabsTrigger value="swiggy" className="text-base data-[state=active]:bg-orange-500 data-[state=active]:text-white">Swiggy</TabsTrigger>
        </TabsList>
        <TabsContent value="zomato">
          {renderOrders(zQuery.data || [], 'zomato', '#dc2626')}
        </TabsContent>
        <TabsContent value="swiggy">
          {renderOrders(sQuery.data || [], 'swiggy', '#f97316')}
        </TabsContent>
      </Tabs>
    </div>
  );
}
