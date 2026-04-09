import { useEffect, useState } from "react";
import { useAppOutlet } from "@/lib/contexts";
import {
  getGetSettingsQueryKey,
  useGetSettings,
  useUpdateSettings,
} from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { fetchOrderingStatus, sendBroadcastNotification, updateOrderingStatus } from "@/lib/bridge";

export default function Settings() {
  const { outletId } = useAppOutlet();
  const queryClient = useQueryClient();
  const { data: settings, isLoading, isError, error } = useGetSettings(outletId);
  const updateSettings = useUpdateSettings();
  const [draftSettings, setDraftSettings] = useState<typeof settings | null>(null);
  const [isOrderingOpen, setIsOrderingOpen] = useState(true);
  const [isUpdatingOrderingStatus, setIsUpdatingOrderingStatus] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [isSendingNotification, setIsSendingNotification] = useState(false);

  useEffect(() => {
    if (settings) {
      setDraftSettings(settings);
    }
  }, [settings]);

  useEffect(() => {
    let isMounted = true;

    const loadOrderingStatus = async () => {
      try {
        const status = await fetchOrderingStatus();
        if (!isMounted) return;
        setIsOrderingOpen(Boolean(status.isOrderingOpen));
      } catch {
        if (!isMounted) return;
        setIsOrderingOpen(true);
      }
    };

    loadOrderingStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleOrderingToggle = async (checked: boolean) => {
    const previousStatus = isOrderingOpen;
    setIsOrderingOpen(checked);
    setIsUpdatingOrderingStatus(true);
    try {
      const nextStatus = await updateOrderingStatus(checked);
      setIsOrderingOpen(Boolean(nextStatus.isOrderingOpen));
      toast({
        title: nextStatus.isOrderingOpen ? "Shop is accepting orders" : "Shop is not accepting orders now",
      });
    } catch (error) {
      setIsOrderingOpen(previousStatus);
      toast({
        title: "Failed to update shop availability",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingOrderingStatus(false);
    }
  };

  const handleSave = async () => {
    if (!draftSettings) return;
    const current = draftSettings as any;

    try {
      await updateSettings.mutateAsync({
        outletId,
        data: {
          discountEnabled: Boolean(current.discountEnabled),
          discountRate: Number(current.discountRate),
          gstEnabled: Boolean(current.gstEnabled),
          gstRate: Number(current.gstRate),
          serviceChargeEnabled: Boolean(current.serviceChargeEnabled),
          serviceChargeRate: Number(current.serviceChargeRate),
          loyaltyPointsPerRupee: Number(current.loyaltyPointsPerRupee),
          loyaltyRedemptionRate: Number(current.loyaltyRedemptionRate),
          currencySymbol: String(current.currencySymbol || "Rs"),
          receiptFooter: String(current.receiptFooter || "Thank you for visiting Chakhna by Kilo"),
          printKotAutomatically: Boolean(current.printKotAutomatically),
          zomatoEnabled: Boolean(current.zomatoEnabled),
          swiggyEnabled: Boolean(current.swiggyEnabled),
          zomatoApiKey: current.zomatoApiKey ? String(current.zomatoApiKey) : null,
          swiggyApiKey: current.swiggyApiKey ? String(current.swiggyApiKey) : null,
          carbonTrackingEnabled: Boolean(current.carbonTrackingEnabled),
        },
      });
      queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey(outletId) });
      toast({ title: "Settings updated" });
    } catch {
      toast({
        title: "Failed to update settings",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSendNotification = async () => {
    const message = broadcastMessage.trim();
    if (!message) {
      toast({
        title: "Message required",
        description: "Please enter a notification message first.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSendingNotification(true);
      await sendBroadcastNotification(message);
      setBroadcastMessage("");
      toast({
        title: "Notification sent",
        description: "Connected app users will receive it instantly.",
      });
    } catch (error) {
      toast({
        title: "Failed to send notification",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingNotification(false);
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading settings...</div>;
  }

  if (isError) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="font-medium text-destructive">Failed to load settings from backend.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Please verify backend settings endpoint and admin access."}
          </p>
        </div>
      </div>
    );
  }

  if (!settings || !draftSettings) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="font-medium">Settings are currently unavailable.</p>
          <p className="mt-1 text-sm text-muted-foreground">Please refresh or check backend connectivity.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Outlet Settings</h1>
          <p className="text-muted-foreground">Configure taxes, printing, and notifications</p>
        </div>
        <Button
          className="rounded-xl shadow-md"
          onClick={handleSave}
          disabled={updateSettings.isPending}
        >
          {updateSettings.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Discount</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Enable Discount</Label>
                <p className="text-sm text-muted-foreground">Apply a percentage discount for all user orders</p>
              </div>
              <Switch
                checked={Boolean((draftSettings as any).discountEnabled)}
                onCheckedChange={(checked) =>
                  setDraftSettings((prev) => (prev ? { ...(prev as any), discountEnabled: checked } : prev))
                }
              />
            </div>
            {Boolean((draftSettings as any).discountEnabled) && (
              <div className="space-y-2">
                <Label>Discount Rate (%)</Label>
                <Input
                  value={String((draftSettings as any).discountRate ?? 0)}
                  onChange={(e) =>
                    setDraftSettings((prev) =>
                      prev ? { ...(prev as any), discountRate: Number(e.target.value || 0) } : prev,
                    )
                  }
                  type="number"
                  className="w-32"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Availability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Accept User Orders</Label>
                <p className="text-sm text-muted-foreground">
                  Turn this off at night or whenever needed to stop new orders.
                </p>
              </div>
              <Switch
                checked={isOrderingOpen}
                onCheckedChange={handleOrderingToggle}
                disabled={isUpdatingOrderingStatus}
              />
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
              {isOrderingOpen ? "Users can place orders right now." : "Shop is not accepting orders now."}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>App Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="broadcast-message">Broadcast Message</Label>
              <Textarea
                id="broadcast-message"
                value={broadcastMessage}
                onChange={(event) => setBroadcastMessage(event.target.value)}
                placeholder="Write a message for all connected app users"
                maxLength={220}
                className="min-h-24"
              />
              <p className="text-xs text-muted-foreground">{broadcastMessage.length}/220 characters</p>
            </div>
            <Button
              onClick={handleSendNotification}
              disabled={isSendingNotification || broadcastMessage.trim().length === 0}
            >
              {isSendingNotification ? "Sending..." : "Send Notification"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
