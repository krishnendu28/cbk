import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ReceiptText, ShoppingCart } from "lucide-react";
import {
  BridgeMenuItem,
  appendDemoOrder,
  fetchBridgeMenuGroups,
  getBridgeMenuGroups,
  getStoredTables,
  saveStoredTables,
  subscribeBridgeMenu,
  USER_BACKEND_URL,
} from "@/lib/bridge";
import { DEMO_SESSION_KEY } from "@/lib/session";

type CartItem = {
  id: number;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export default function POS() {
  const [menuGroups, setMenuGroups] = useState(getBridgeMenuGroups);
  const [activeGroupId, setActiveGroupId] = useState(menuGroups[0]?.id || "non-veg-chakhna");
  const [search, setSearch] = useState("");
  const [orderType, setOrderType] = useState<"dine-in" | "takeaway" | "delivery">("dine-in");
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [placing, setPlacing] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [flatNo, setFlatNo] = useState("");
  const [roomNo, setRoomNo] = useState("");
  const [landmark, setLandmark] = useState("");
  const [autoLocation, setAutoLocation] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const tables = getStoredTables();
  const availableTables = tables.filter((table) => table.status === "available");

  const activeGroup = menuGroups.find((group) => group.id === activeGroupId) || menuGroups[0];

  useEffect(() => {
    if (localStorage.getItem(DEMO_SESSION_KEY) === "1") {
      const demoMenuGroups = getBridgeMenuGroups();
      setMenuGroups(demoMenuGroups);
      setActiveGroupId(demoMenuGroups[0]?.id || "");
      return;
    }

    async function reloadMenu() {
      const nextGroups = await fetchBridgeMenuGroups();
      setMenuGroups(nextGroups);
      if (!nextGroups.some((group) => group.id === activeGroupId)) {
        setActiveGroupId(nextGroups[0]?.id || "");
      }
    }

    reloadMenu();
    return subscribeBridgeMenu(() => {
      reloadMenu();
    });
  }, []);

  const filteredItems = useMemo(
    () =>
      (activeGroup?.items || []).filter((item) => item.name.toLowerCase().includes(search.trim().toLowerCase())),
    [activeGroup?.items, search],
  );

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.totalPrice, 0), [cart]);
  const deliveryCharge = cart.length > 0 && orderType === "delivery" ? 20 : 0;
  const total = subtotal + deliveryCharge;

  function addToCart(item: BridgeMenuItem) {
    setCart((prev) => {
      const existing = prev.find((entry) => entry.id === item.id);
      if (existing) {
        return prev.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                quantity: entry.quantity + 1,
                totalPrice: (entry.quantity + 1) * entry.unitPrice,
              }
            : entry,
        );
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          quantity: 1,
          unitPrice: item.price,
          totalPrice: item.price,
        },
      ];
    });
  }

  function updateQuantity(id: number, delta: number) {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id !== id) return item;
          const quantity = Math.max(0, item.quantity + delta);
          return {
            ...item,
            quantity,
            totalPrice: quantity * item.unitPrice,
          };
        })
        .filter((item) => item.quantity > 0),
    );
  }

  async function useAutoLocation() {
    if (!navigator.geolocation) {
      setAutoLocation("Geolocation not supported on this browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
          );
          const data = await response.json();
          const label = data?.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
          setAutoLocation(label);
        } catch {
          setAutoLocation("Unable to fetch readable location, please type manually");
        }
      },
      () => setAutoLocation("Location permission denied"),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  async function placeOrder() {
    if (orderType === "delivery" && (!customerName.trim() || !phone.trim())) return;
    if (cart.length === 0) return;

    if (orderType === "dine-in" && !selectedTableId) {
      return;
    }

    if (orderType === "delivery" && !flatNo.trim() && !autoLocation.trim()) {
      return;
    }

    setPlacing(true);
    try {
      const addressParts =
        orderType === "delivery"
          ? [
              flatNo && `Flat: ${flatNo}`,
              roomNo && `Room: ${roomNo}`,
              landmark && `Landmark: ${landmark}`,
              autoLocation && `Location: ${autoLocation}`,
            ].filter(Boolean)
          : orderType === "dine-in"
            ? [`Table: ${tables.find((table) => table.id === selectedTableId)?.name || selectedTableId}`]
            : ["Counter pickup"];

      const payload = {
        customerName: customerName.trim() || (orderType === "dine-in" ? "Walk-in Guest" : "Takeaway Guest"),
        // Backend validates min length for phone; keep a POS-safe fallback for walk-in orders.
        phone: phone.trim() || "0000000000",
        address: addressParts.join(", "),
        items: cart.map((item) => ({
          name: item.name,
          variant: "Regular",
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
        deliveryCharge,
        subtotal,
        total: Math.round(total),
      };

      if (localStorage.getItem(DEMO_SESSION_KEY) === "1") {
        const demoOrder = {
          _id: `demo-${Date.now()}`,
          customerName: payload.customerName,
          phone: payload.phone,
          address: payload.address,
          items: payload.items,
          total: payload.total,
          deliveryCharge,
          status: "Preparing" as const,
          createdAt: new Date().toISOString(),
        };

        appendDemoOrder(demoOrder);

        if (orderType === "dine-in" && selectedTableId) {
          const updatedTables = getStoredTables().map((table) =>
            table.id === selectedTableId ? { ...table, status: "occupied" as const } : table,
          );
          saveStoredTables(updatedTables);
        }

        setCart([]);
        setCustomerName("");
        setPhone("");
        setFlatNo("");
        setRoomNo("");
        setLandmark("");
        setAutoLocation("");
        setSelectedTableId(null);
        setSavedAt(null);
        toast({
          title: "Order sent to kitchen",
          description: "Demo order created successfully.",
        });
        return;
      }

      const response = await fetch(`${USER_BACKEND_URL}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to place order");

      if (orderType === "dine-in" && selectedTableId) {
        const updatedTables = getStoredTables().map((table) =>
          table.id === selectedTableId ? { ...table, status: "occupied" as const } : table,
        );
        saveStoredTables(updatedTables);
      }

      setCart([]);
      setCustomerName("");
      setPhone("");
      setFlatNo("");
      setRoomNo("");
      setLandmark("");
      setAutoLocation("");
      setSelectedTableId(null);
      setSavedAt(null);
      toast({
        title: "Order sent to kitchen",
        description: "POS order created successfully.",
      });
    } catch (error) {
      toast({
        title: "Failed to place order",
        description: error instanceof Error ? error.message : "Please check order details and try again.",
        variant: "destructive",
      });
    } finally {
      setPlacing(false);
    }
  }

  function saveCartDraft() {
    const draft = {
      orderType,
      selectedTableId,
      customerName,
      phone,
      flatNo,
      roomNo,
      landmark,
      autoLocation,
      cart,
      subtotal,
      deliveryCharge,
      total,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem("cbk_pos_cart_draft", JSON.stringify(draft));
    setSavedAt(new Date().toLocaleTimeString());
  }

  function printEBill() {
    if (cart.length === 0) return;

    const now = new Date();
    const orderNo = `CBK-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
    const customerLabel = customerName.trim() || (orderType === "dine-in" ? "Walk-in Guest" : "Takeaway Guest");
    const phoneLabel = phone.trim() || "N/A";
    const tableLabel =
      orderType === "dine-in"
        ? tables.find((table) => table.id === selectedTableId)?.name || "Not selected"
        : "-";

    const rowsHtml = cart
      .map(
        (item) => `
          <tr>
            <td class="item-name">${item.name}</td>
            <td class="num">${item.quantity}</td>
            <td class="num">${item.unitPrice.toFixed(2)}</td>
            <td class="num">${item.totalPrice.toFixed(2)}</td>
          </tr>
        `,
      )
      .join("");

    const logoUrl = new URL(`${import.meta.env.BASE_URL}logo.jpeg`, window.location.origin).toString();

    const printWindow = window.open("", "_blank", "width=430,height=780");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Chakhna by Kilo E-Bill</title>
          <style>
            @page { size: 80mm auto; margin: 6mm; }
            * { box-sizing: border-box; }
            body {
              font-family: "Courier New", monospace;
              color: #0f172a;
              margin: 0;
              background: #ffffff;
            }
            .bill {
              width: 78mm;
              margin: 0 auto;
              border: 1px dashed #64748b;
              padding: 10px;
            }
            .center { text-align: center; }
            .logo {
              width: 60px;
              height: 60px;
              object-fit: cover;
              border-radius: 10px;
              border: 1px solid #cbd5e1;
              margin-bottom: 6px;
            }
            h1 {
              margin: 0;
              font-size: 16px;
              letter-spacing: 0.3px;
            }
            .muted { color: #334155; font-size: 11px; }
            .line {
              border-top: 1px dashed #334155;
              margin: 8px 0;
            }
            .meta {
              font-size: 11px;
              line-height: 1.45;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }
            th, td {
              padding: 3px 0;
              border-bottom: 1px dotted #94a3b8;
              vertical-align: top;
            }
            th { text-align: left; font-size: 10px; color: #1e293b; }
            .num { text-align: right; white-space: nowrap; }
            .item-name { max-width: 28mm; }
            .totals {
              margin-top: 8px;
              font-size: 12px;
            }
            .totals-row {
              display: flex;
              justify-content: space-between;
              padding: 2px 0;
            }
            .grand {
              font-weight: 800;
              font-size: 14px;
              border-top: 1px dashed #334155;
              padding-top: 5px;
              margin-top: 4px;
            }
            .footer {
              margin-top: 10px;
              text-align: center;
              font-size: 10px;
              color: #1e293b;
            }
          </style>
        </head>
        <body>
          <div class="bill">
            <div class="center">
              <img src="${logoUrl}" alt="Chakhna by Kilo" class="logo" />
              <h1>Chakhna by Kilo</h1>
              <div class="muted">E-BILL / TAX INVOICE</div>
            </div>

            <div class="line"></div>

            <div class="meta">
              <div><strong>Order No:</strong> ${orderNo}</div>
              <div><strong>Date:</strong> ${now.toLocaleDateString()} ${now.toLocaleTimeString()}</div>
              <div><strong>Type:</strong> ${orderType.toUpperCase()}</div>
              <div><strong>Table:</strong> ${tableLabel}</div>
              <div><strong>Customer:</strong> ${customerLabel}</div>
              <div><strong>Phone:</strong> ${phoneLabel}</div>
            </div>

            <div class="line"></div>

            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th class="num">Qty</th>
                  <th class="num">Rate</th>
                  <th class="num">Amt</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <div class="totals">
              <div class="totals-row"><span>Subtotal</span><span>Rs ${subtotal.toFixed(2)}</span></div>
              <div class="totals-row"><span>Delivery</span><span>Rs ${deliveryCharge.toFixed(2)}</span></div>
              <div class="totals-row grand"><span>Grand Total</span><span>Rs ${total.toFixed(2)}</span></div>
            </div>

            <div class="line"></div>

            <div class="footer">
              <div>Thank you for dining with us!</div>
              <div>By Kilo By Choice By Taste</div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  function saveAndPrintBill() {
    if (cart.length === 0) return;
    saveCartDraft();
    printEBill();
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {menuGroups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => setActiveGroupId(group.id)}
              className={
                activeGroupId === group.id
                  ? "px-4 py-2 rounded-full bg-primary text-primary-foreground whitespace-nowrap"
                  : "px-4 py-2 rounded-full bg-muted whitespace-nowrap"
              }
            >
              {group.title}
            </button>
          ))}
        </div>

        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search in menu" />

        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <img src={item.image} alt={item.name} className="w-full h-32 object-cover" />
                <div className="p-3 space-y-2">
                  <h3 className="font-semibold">{item.name}</h3>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Rs {item.price}</Badge>
                    <Button onClick={() => addToCart(item)} size="sm">Add</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <Card className="w-[420px] flex flex-col overflow-hidden border-blue-200 shadow-xl shadow-blue-200/30 bg-gradient-to-b from-blue-50/50 to-white">
        <div className="p-4 border-b bg-blue-100/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-foreground font-bold">
              <ShoppingCart className="w-5 h-5 text-primary" />
              <span>Cart</span>
            </div>
            {savedAt && <span className="text-xs text-muted-foreground">Saved {savedAt}</span>}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button variant={orderType === "dine-in" ? "default" : "outline"} onClick={() => setOrderType("dine-in")}>Dine-in</Button>
            <Button variant={orderType === "takeaway" ? "default" : "outline"} onClick={() => setOrderType("takeaway")}>Takeaway</Button>
            <Button variant={orderType === "delivery" ? "default" : "outline"} onClick={() => setOrderType("delivery")}>Delivery</Button>
          </div>

          {orderType === "dine-in" && (
            <select
              className="w-full h-10 rounded-md border border-blue-300 bg-white px-3 text-sm"
              value={selectedTableId || ""}
              onChange={(event) => setSelectedTableId(Number(event.target.value))}
            >
              <option value="" disabled>
                Select available table first
              </option>
              {availableTables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.name} (Capacity {table.capacity})
                </option>
              ))}
            </select>
          )}

          <Input
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            placeholder="Customer Name"
          />
          <Input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Phone"
          />

          {orderType === "delivery" && (
            <div className="space-y-2">
              <Input value={flatNo} onChange={(event) => setFlatNo(event.target.value)} placeholder="Flat No" />
              <Input value={roomNo} onChange={(event) => setRoomNo(event.target.value)} placeholder="Room No" />
              <Input value={landmark} onChange={(event) => setLandmark(event.target.value)} placeholder="Nearby Landmark" />
              <div className="flex gap-2">
                <Input value={autoLocation} onChange={(event) => setAutoLocation(event.target.value)} placeholder="Auto location / map location" />
                <Button type="button" variant="outline" onClick={useAutoLocation}>Auto</Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f7fcff]">
          {cart.length === 0 && <p className="text-muted-foreground">Cart is empty</p>}
          {cart.map((item) => (
            <div key={item.id} className="rounded-xl border border-blue-200 p-3 bg-white flex items-center justify-between gap-3 shadow-sm">
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-muted-foreground">Rs {item.unitPrice} each</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => updateQuantity(item.id, -1)}>-</Button>
                <span className="w-5 text-center">{item.quantity}</span>
                <Button size="sm" variant="outline" onClick={() => updateQuantity(item.id, 1)}>+</Button>
              </div>
              <p className="font-semibold">Rs {item.totalPrice}</p>
            </div>
          ))}
        </div>

        <div className="p-4 border-t bg-blue-50 space-y-2">
          <div className="flex justify-between text-sm"><span>Subtotal</span><span>Rs {subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm"><span>Delivery</span><span>Rs {deliveryCharge.toFixed(2)}</span></div>
          <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total</span><span>Rs {total.toFixed(2)}</span></div>

          <Button type="button" variant="outline" onClick={saveAndPrintBill} disabled={cart.length === 0}>
            <ReceiptText className="w-4 h-4 mr-2" />
            Save & Print E-Bill
          </Button>

          <Button
            className="w-full mt-2"
            onClick={placeOrder}
            disabled={
              placing ||
              cart.length === 0 ||
              (orderType === "delivery" && !customerName.trim()) ||
              (orderType === "delivery" && !phone.trim()) ||
              (orderType === "dine-in" && !selectedTableId) ||
              (orderType === "delivery" && !flatNo.trim() && !autoLocation.trim())
            }
          >
            {placing ? "Placing..." : "Place Bill + Order"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

