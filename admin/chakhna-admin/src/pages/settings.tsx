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
import { sendBroadcastNotification } from "@/lib/bridge";

export default function Settings() {
  const { outletId } = useAppOutlet();
  const queryClient = useQueryClient();
  const { data: settings, isLoading, isError, error } = useGetSettings(outletId);
  const updateSettings = useUpdateSettings();
  const [draftSettings, setDraftSettings] = useState<typeof settings | null>(null);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [isSendingNotification, setIsSendingNotification] = useState(false);

  useEffect(() => {
    if (settings) {
      setDraftSettings(settings);
    }
  }, [settings]);

  const handleSave = async () => {
    if (!draftSettings) return;

    try {
      await updateSettings.mutateAsync({
        outletId,
        data: {
          gstEnabled: draftSettings.gstEnabled,
          gstRate: Number(draftSettings.gstRate),
          serviceChargeEnabled: draftSettings.serviceChargeEnabled,
          serviceChargeRate: Number(draftSettings.serviceChargeRate),
          loyaltyPointsPerRupee: Number(draftSettings.loyaltyPointsPerRupee),
          loyaltyRedemptionRate: Number(draftSettings.loyaltyRedemptionRate),
          currencySymbol: draftSettings.currencySymbol,
          receiptFooter: draftSettings.receiptFooter,
          printKotAutomatically: draftSettings.printKotAutomatically,
          zomatoEnabled: draftSettings.zomatoEnabled,
          swiggyEnabled: draftSettings.swiggyEnabled,
          zomatoApiKey: draftSettings.zomatoApiKey ?? null,
          swiggyApiKey: draftSettings.swiggyApiKey ?? null,
          carbonTrackingEnabled: draftSettings.carbonTrackingEnabled,
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
          <p className="text-muted-foreground">Configure taxes, printing, and integrations</p>
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
            <CardTitle>Taxes & Charges</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Enable GST</Label>
                <p className="text-sm text-muted-foreground">Apply GST to all orders</p>
              </div>
              <Switch
                checked={draftSettings.gstEnabled}
                onCheckedChange={(checked) =>
                  setDraftSettings((prev) => (prev ? { ...prev, gstEnabled: checked } : prev))
                }
              />
            </div>
            {draftSettings.gstEnabled && (
              <div className="space-y-2">
                <Label>Default GST Rate (%)</Label>
                <Input
                  value={draftSettings.gstRate}
                  onChange={(e) =>
                    setDraftSettings((prev) =>
                      prev ? { ...prev, gstRate: Number(e.target.value || 0) } : prev,
                    )
                  }
                  type="number"
                  className="w-32"
                />
              </div>
            )}
            <div className="flex items-center justify-between border-t pt-6">
              <div>
                <Label className="text-base">Service Charge</Label>
                <p className="text-sm text-muted-foreground">Automatically add service charge</p>
              </div>
              <Switch
                checked={draftSettings.serviceChargeEnabled}
                onCheckedChange={(checked) =>
                  setDraftSettings((prev) =>
                    prev ? { ...prev, serviceChargeEnabled: checked } : prev,
                  )
                }
              />
            </div>
            {draftSettings.serviceChargeEnabled && (
              <div className="space-y-2">
                <Label>Service Charge Rate (%)</Label>
                <Input
                  value={draftSettings.serviceChargeRate}
                  onChange={(e) =>
                    setDraftSettings((prev) =>
                      prev ? { ...prev, serviceChargeRate: Number(e.target.value || 0) } : prev,
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
            <CardTitle>Integrations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Zomato Sync</Label>
                <p className="text-sm text-muted-foreground">Receive orders from Zomato</p>
              </div>
              <Switch
                checked={draftSettings.zomatoEnabled}
                onCheckedChange={(checked) =>
                  setDraftSettings((prev) => (prev ? { ...prev, zomatoEnabled: checked } : prev))
                }
              />
            </div>
            <div className="flex items-center justify-between border-t pt-6">
              <div>
                <Label className="text-base">Swiggy Sync</Label>
                <p className="text-sm text-muted-foreground">Receive orders from Swiggy</p>
              </div>
              <Switch
                checked={draftSettings.swiggyEnabled}
                onCheckedChange={(checked) =>
                  setDraftSettings((prev) => (prev ? { ...prev, swiggyEnabled: checked } : prev))
                }
              />
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
