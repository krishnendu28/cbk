import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import {
  Activity,
  CalendarCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Download,
  Plus,
  RefreshCw,
  Trash2,
  UtensilsCrossed,
  Utensils,
  Beef,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  createMonthlySubscription,
  deleteMonthlySubscription,
  fetchMonthlyPlans,
  MonthlyPlan,
  MonthlyPlanCatalog,
  MonthlyPlanType,
  MonthlyStatus,
  MonthlySubscription,
  MonthlyStats,
  redeemMonthlyMeal,
  subscribeMonthly,
  updateMonthlySubscription,
} from "@/lib/monthly";
import { toast } from "@/hooks/use-toast";

const statusStyles: Record<MonthlyStatus, string> = {
  Pending: "bg-amber-100 text-amber-800 border-amber-200",
  Active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Completed: "bg-sky-100 text-sky-800 border-sky-200",
  Cancelled: "bg-rose-100 text-rose-800 border-rose-200",
  Rejected: "bg-gray-100 text-gray-800 border-gray-200",
};

const planTypeStyles: Record<MonthlyPlanType, string> = {
  Veg: "bg-lime-100 text-lime-800 border-lime-200",
  NonVeg: "bg-orange-100 text-orange-800 border-orange-200",
  OnlyNonVeg: "bg-rose-100 text-rose-800 border-rose-200",
};

const planTypeLabels: Record<MonthlyPlanType, string> = {
  Veg: "Only Veg",
  NonVeg: "Non-Veg + Veg",
  OnlyNonVeg: "Only NonVeg",
};

const CALENDAR_WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const LOCAL_MENU: Record<MonthlyPlanType, { day: string; lunch: string; dinner: string }[]> = {
  Veg: [
    { day: "Monday", lunch: "Veg Thali", dinner: "Dal Tadka Meal" },
    { day: "Tuesday", lunch: "Paneer Thali", dinner: "Aalu Paratha" },
    { day: "Wednesday", lunch: "Mushroom Thali", dinner: "Veg Noodles + Paneer Chilli" },
    { day: "Thursday", lunch: "Veg Thali", dinner: "Chana Masala Meal" },
    { day: "Friday", lunch: "Veg Noodles + Mushroom Chilli", dinner: "Mushroom Masala Meal" },
    { day: "Saturday", lunch: "Kadhi Chawal", dinner: "Aalu Dum Combo" },
    { day: "Sunday", lunch: "Veg Fried Rice + Paneer Chilli", dinner: "Mushroom Masala (Roti)" },
  ],
  NonVeg: [
    { day: "Monday", lunch: "Veg Thali", dinner: "Dal Tadka Combo" },
    { day: "Tuesday", lunch: "Veg Thali", dinner: "Aalu Paratha" },
    { day: "Wednesday", lunch: "Fish Thali", dinner: "Veg Fried Rice + Chilli Chicken/Noodles" },
    { day: "Thursday", lunch: "Paneer Thali", dinner: "Chana Masala Combo" },
    { day: "Friday", lunch: "Egg Thali", dinner: "Handi Chicken Meal" },
    { day: "Saturday", lunch: "Kadhi Chawal", dinner: "Aalu Dum Combo" },
    { day: "Sunday", lunch: "Chicken Biryani", dinner: "Omelette Curry Meal" },
  ],
  OnlyNonVeg: [
    { day: "Monday", lunch: "Egg Thali", dinner: "Chicken + Roti" },
    { day: "Tuesday", lunch: "Fish Thali", dinner: "Chicken Tadka + Roti" },
    { day: "Wednesday", lunch: "Egg Thali", dinner: "Chinese: Chili Chicken (3pcs) + Veg Noodles" },
    { day: "Thursday", lunch: "Fish Thali", dinner: "Chinese: Veg Fried Rice + Chili Chicken (3pcs)" },
    { day: "Friday", lunch: "Chicken Biryani", dinner: "Chicken + Roti" },
    { day: "Saturday", lunch: "Fish Thali", dinner: "Chicken Bharta + Roti" },
    { day: "Sunday", lunch: "Chicken Thali", dinner: "Chinese: Egg Chicken / Schezwan Noodles" },
  ],
};

function menuForDay(menu: Record<MonthlyPlanType, { day: string; lunch: string; dinner: string }[]>, plan: MonthlyPlanType, date: Date) {
  const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getDay()];
  return (menu[plan] ?? []).find((row) => row.day === weekday) ?? null;
}

function formatDate(value?: string) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return format(parsed, "dd MMM yyyy");
}

function planLabel(plan: MonthlyPlan | undefined, subscription: MonthlySubscription) {
  const days = subscription.days || (plan ? 30 : 30);
  if (plan) return `${plan.meals} Meals · ${days} days · ${plan.delivery}`;
  return `${subscription.mealsTotal} Meals · ${days} days`;
}

function toCsv(subs: MonthlySubscription[]) {
  const header = ["Name", "Phone", "Address", "Plan Type", "Meals Total", "Meals Redeemed", "Meals Remaining", "Price (Rs)", "Start Date", "End Date", "Status", "Notes"];
  const rows = subs.map((row) =>
    [
      row.name,
      row.phone,
      row.address,
      row.planType,
      row.mealsTotal,
      row.mealsRedeemed,
      row.mealsRemaining,
      row.price,
      formatDate(row.startDate),
      formatDate(row.endDate),
      row.status,
      (row.notes || "").replace(/[\r\n]+/g, " "),
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [header.join(","), ...rows].join("\r\n");
}

function downloadCsv(subs: MonthlySubscription[]) {
  if (subs.length === 0) {
    toast({ title: "Nothing to export", description: "No monthly subscribers yet.", variant: "destructive" });
    return;
  }
  const blob = new Blob([toCsv(subs)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `monthly-subscriptions-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

type FormState = {
  name: string;
  phone: string;
  address: string;
  planType: MonthlyPlanType;
  meals: string;
};

const emptyForm: FormState = { name: "", phone: "", address: "", planType: "Veg", meals: "" };

type ServeState = {
  subscription: MonthlySubscription;
  count: string;
  meal: "Lunch" | "Dinner";
  note: string;
};

type EditState = {
  subscription: MonthlySubscription;
  mealsTotal: string;
  status: MonthlyStatus;
  notes: string;
};

export default function MonthlyMeals() {
  const [subscriptions, setSubscriptions] = useState<MonthlySubscription[]>([]);
  const [stats, setStats] = useState<MonthlyStats>({
    total: 0,
    activeCount: 0,
    completedCount: 0,
    cancelledCount: 0,
    activeMealsRemaining: 0,
    revenue: 0,
    vegCount: 0,
    nonVegCount: 0,
    onlyNonVegCount: 0,
  });
  const [catalog, setCatalog] = useState<MonthlyPlanCatalog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MonthlyStatus | "All">("All");
  const [planFilter, setPlanFilter] = useState<"All" | MonthlyPlanType>("All");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [serveTarget, setServeTarget] = useState<ServeState | null>(null);
  const [serving, setServing] = useState(false);

  const [editTarget, setEditTarget] = useState<EditState | null>(null);
  const [editing, setEditing] = useState(false);

  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [calPlan, setCalPlan] = useState<MonthlyPlanType>("Veg");

  const refreshTimerRef = useRef<number | null>(null);

  const applySnapshot = useCallback((snapshot: { subscriptions: MonthlySubscription[]; stats: MonthlyStats }) => {
    setSubscriptions(snapshot.subscriptions);
    setStats(snapshot.stats);
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [nextCatalog] = await Promise.all([fetchMonthlyPlans()]);
        if (!active) return;
        setCatalog(nextCatalog);
      } catch {
        if (active) setCatalog(null);
      }
      try {
        const snapshot = await (await import("@/lib/monthly")).fetchMonthlySubscriptions();
        if (active) applySnapshot(snapshot);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    load();
    const unsubscribe = subscribeMonthly(applySnapshot);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [applySnapshot]);

  useEffect(() => {
    const tick = () => {
      if (!lastUpdated) {
        setLastUpdatedLabel("");
        return;
      }
      const seconds = Math.max(0, Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
      setLastUpdatedLabel(seconds < 60 ? `${seconds}s ago` : `${Math.floor(seconds / 60)}m ago`);
    };
    tick();
    refreshTimerRef.current = window.setInterval(tick, 1000);
    return () => {
      if (refreshTimerRef.current) window.clearInterval(refreshTimerRef.current);
    };
  }, [lastUpdated]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return subscriptions
      .filter((row) => (statusFilter === "All" ? true : row.status === statusFilter))
      .filter((row) => (planFilter === "All" ? true : row.planType === planFilter))
      .filter((row) => {
        if (!term) return true;
        return (
          row.name.toLowerCase().includes(term) ||
          row.phone.toLowerCase().includes(term) ||
          row.address.toLowerCase().includes(term)
        );
      });
  }, [subscriptions, search, statusFilter, planFilter]);

  const planFor = useCallback(
    (row: MonthlySubscription) => catalog?.plansFlat.find((plan) => plan.id === row.planId) ?? undefined,
    [catalog],
  );

  const menuData = useMemo(() => catalog?.menu ?? LOCAL_MENU, [catalog]);

  const calRedemptionsByDay = useMemo(() => {
    const map: Record<string, { lunch: number; dinner: number }> = {};
    for (const sub of subscriptions) {
      for (const entry of sub.redemptionLog ?? []) {
        const d = new Date(entry.redeemedAt);
        if (Number.isNaN(d.getTime())) continue;
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        const bucket = map[key] ?? { lunch: 0, dinner: 0 };
        if (entry.meal === "Dinner") bucket.dinner += 1;
        else bucket.lunch += 1;
        map[key] = bucket;
      }
    }
    return map;
  }, [subscriptions]);

  const calPeriods = useMemo(
    () =>
      subscriptions
        .filter((row) => row.status === "Active")
        .map((row) => ({
          name: row.name,
          planType: row.planType,
          start: new Date(row.startDate),
          end: new Date(row.endDate),
        })),
    [subscriptions],
  );

  const year = calMonth.getFullYear();
  const month = calMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const calCells: (Date | null)[] = Array.from({ length: firstWeekday }, () => null);
  for (let day = 1; day <= daysInMonth; day++) calCells.push(new Date(year, month, day));

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const periodsOnDay = (date: Date) =>
    calPeriods.filter((p) => date >= p.start && date <= p.end);

  async function handleCreate() {
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim() || !form.meals) {
      toast({ title: "Missing details", description: "Name, phone, address and meal plan are required.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      await createMonthlySubscription({
        name: form.name,
        phone: form.phone,
        address: form.address,
        planType: form.planType,
        meals: Number(form.meals),
      });
      toast({ title: "Subscription created", description: `${form.name} was added to monthly plans.` });
      setAddOpen(false);
      setForm(emptyForm);
      const snapshot = await (await import("@/lib/monthly")).fetchMonthlySubscriptions();
      applySnapshot(snapshot);
    } catch (error) {
      toast({
        title: "Failed to create subscription",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleServe() {
    if (!serveTarget) return;
    const count = Number(serveTarget.count) || 1;
    setServing(true);
    try {
      const result = await redeemMonthlyMeal(serveTarget.subscription._id, {
        count,
        meal: serveTarget.meal,
        note: serveTarget.note.trim(),
        redeemedBy: "admin",
      });
      toast({
        title: "Meal served",
        description: `${result.redeemed} meal(s) marked for ${serveTarget.subscription.name}. ${result.subscription.mealsRemaining} remaining.`,
      });
      setServeTarget(null);
    } catch (error) {
      toast({
        title: "Failed to serve meal",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setServing(false);
    }
  }

  async function handleEdit() {
    if (!editTarget) return;
    setEditing(true);
    try {
      await updateMonthlySubscription(editTarget.subscription._id, {
        mealsTotal: Number(editTarget.mealsTotal),
        status: editTarget.status,
        notes: editTarget.notes,
      });
      toast({ title: "Subscription updated", description: `${editTarget.subscription.name}'s plan was updated.` });
      setEditTarget(null);
    } catch (error) {
      toast({
        title: "Failed to update subscription",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setEditing(false);
    }
  }

  async function handleDelete(row: MonthlySubscription) {
    const ok = window.confirm(`Delete ${row.name}'s monthly subscription (${row.mealsRemaining} meals remaining)? This cannot be undone.`);
    if (!ok) return;
    try {
      await deleteMonthlySubscription(row._id);
      toast({ title: "Subscription deleted", description: `${row.name}'s monthly subscription was removed.` });
    } catch (error) {
      toast({
        title: "Failed to delete subscription",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  const selectPlans = (planType: MonthlyPlanType) => catalog?.plans[planType] ?? [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Monthly Meals</h1>
          <p className="text-muted-foreground">
            Monthly food subscription sheet · live update <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />{lastUpdatedLabel || "syncing"}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => downloadCsv(filtered)}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Subscription
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><Activity className="w-5 h-5 text-emerald-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Active Subscribers</p>
              <p className="text-2xl font-bold">{stats.activeCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><CalendarCheck className="w-5 h-5 text-amber-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Pending Approval</p>
              <p className="text-2xl font-bold">{subscriptions.filter((r) => r.status === "Pending").length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center"><CalendarCheck className="w-5 h-5 text-sky-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Meals Remaining</p>
              <p className="text-2xl font-bold">{stats.activeMealsRemaining}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><DollarSign className="w-5 h-5 text-amber-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Subscription Revenue</p>
              <p className="text-2xl font-bold">Rs {stats.revenue}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-lime-100 flex items-center justify-center"><Utensils className="w-5 h-5 text-lime-700" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Veg Plans</p>
              <p className="text-2xl font-bold">{stats.vegCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center"><Beef className="w-5 h-5 text-orange-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Non-Veg Plans</p>
              <p className="text-2xl font-bold">{stats.nonVegCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center"><Beef className="w-5 h-5 text-rose-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Only Non-Veg Plans</p>
              <p className="text-2xl font-bold">{stats.onlyNonVegCount ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-border">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2"><CalendarDays className="w-5 h-5 text-emerald-600" /> Monthly Calendar</h2>
              <p className="text-sm text-muted-foreground">Weekly menu mapped to dates · redemptions · active subscription periods</p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={calPlan} onValueChange={(value) => setCalPlan(value as MonthlyPlanType)}>
                <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Veg">Only Veg</SelectItem>
                  <SelectItem value="NonVeg">Non-Veg + Veg</SelectItem>
                  <SelectItem value="OnlyNonVeg">Only NonVeg</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => setCalMonth(new Date(year, month - 1, 1))}><ChevronLeft className="w-4 h-4" /></Button>
              <span className="text-sm font-semibold min-w-[130px] text-center">
                {format(new Date(year, month, 1), "MMMM yyyy")}
              </span>
              <Button variant="outline" size="icon" onClick={() => setCalMonth(new Date(year, month + 1, 1))}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {CALENDAR_WEEKDAYS.map((d, i) => (
              <div key={`${d}-${i}`} className="text-center text-[11px] font-semibold text-muted-foreground">{d}</div>
            ))}
            {calCells.map((cell, i) => {
              if (!cell) {
                return <div key={`blank-${i}`} className="min-h-[78px]" />;
              }
              const menu = menuForDay(menuData, calPlan, cell);
              const red = calRedemptionsByDay[`${cell.getFullYear()}-${cell.getMonth()}-${cell.getDate()}`];
              const periods = periodsOnDay(cell);
              const key = `${cell.getFullYear()}-${cell.getMonth()}-${cell.getDate()}`;
              const isToday = isSameDay(cell, today);
              return (
                <div
                  key={key}
                  className={`rounded-lg border p-1.5 min-h-[78px] ${isToday ? "border-emerald-500" : "border-border"} ${periods.length ? "bg-amber-50" : "bg-card"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${isToday ? "text-emerald-600" : ""}`}>{cell.getDate()}</span>
                    {red ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-600">
                        {red.lunch > 0 && <span title="Lunch redeemed" className="w-2 h-2 rounded-full bg-orange-500" />}
                        {red.dinner > 0 && <span title="Dinner redeemed" className="w-2 h-2 rounded-full bg-rose-500" />}
                        <span>{red.lunch + red.dinner}</span>
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-[10px] leading-tight text-muted-foreground">
                    {menu ? (
                      <>
                        <div><span className="font-semibold text-orange-600">L:</span> {menu.lunch}</div>
                        <div><span className="font-semibold text-rose-600">D:</span> {menu.dinner}</div>
                      </>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </div>
                  {periods.length > 0 && (
                    <div className="mt-1 truncate text-[9px] font-medium text-amber-700" title={periods.map((p) => `${p.name} (${planTypeLabels[p.planType]})`).join(", ")}>
                      {periods.map((p) => p.name).join(", ")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Lunch redeemed</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Dinner redeemed</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border border-orange-300 bg-amber-50" /> Active subscription period</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone or address..."
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as MonthlyStatus | "All")}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All statuses</SelectItem>
            <SelectItem value="Pending">Pending Approval</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={planFilter} onValueChange={(value) => setPlanFilter(value as "All" | MonthlyPlanType)}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Plan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All plans</SelectItem>
            <SelectItem value="Veg">Veg only</SelectItem>
            <SelectItem value="NonVeg">Non-Veg + Veg</SelectItem>
            <SelectItem value="OnlyNonVeg">Only NonVeg</SelectItem>
          </SelectContent>
        </Select>
        {isLoading && (
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading...
          </span>
        )}
      </div>

      <Card className="shadow-sm border-border overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead className="text-center">Meals Left</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  {isLoading ? "Loading monthly subscriptions..." : "No monthly subscribers found. Add one or wait for app signups."}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((row) => {
              const plan = planFor(row);
              return (
                <TableRow key={row._id} className={row.status === "Pending" ? "bg-amber-50/80 border-l-2 border-l-amber-400" : row.status === "Active" && Number(row.mealsRemaining) <= Math.max(2, Math.floor(Number(row.mealsTotal) / 4)) ? "bg-amber-50/60" : undefined}>
                  <TableCell>
                    <div className="font-semibold">{row.name}</div>
                    <div className="text-xs text-muted-foreground">{row.phone}</div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground max-w-[220px] block truncate" title={row.address}>
                      {row.address}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="secondary" className={planTypeStyles[row.planType]}>
                        {row.planType === "Veg" ? <UtensilsCrossed className="w-3 h-3 mr-1" /> : <Beef className="w-3 h-3 mr-1" />}
                        {planTypeLabels[row.planType]}
                      </Badge>
                    </div>
                    <div className="text-xs mt-1">{planLabel(plan, row)}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-lg font-bold tabular-nums">{row.mealsRemaining}</div>
                    <div className="text-[11px] text-muted-foreground">of {row.mealsTotal} · <span className="text-emerald-600">{row.mealsRedeemed} used</span></div>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">Rs {row.price}</TableCell>
                  <TableCell>
                    <div className="text-xs">
                      <div>{formatDate(row.startDate)}</div>
                      <div className="text-muted-foreground">to {formatDate(row.endDate)}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusStyles[row.status]}>{row.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {row.status === "Pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={async () => {
                              try {
                                await updateMonthlySubscription(row._id, { status: "Active" });
                                toast({ title: "Approved", description: `${row.name}'s subscription is now Active.` });
                              } catch (error) {
                                toast({ title: "Failed to approve", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
                              }
                            }}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={async () => {
                              try {
                                await updateMonthlySubscription(row._id, { status: "Rejected" });
                                toast({ title: "Rejected", description: `${row.name}'s subscription was rejected.` });
                              } catch (error) {
                                toast({ title: "Failed to reject", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
                              }
                            }}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={row.status !== "Active" || Number(row.mealsRemaining) <= 0}
                        onClick={() =>
                          setServeTarget({ subscription: row, count: "1", meal: "Lunch", note: "" })
                        }
                        title="Mark a meal as served"
                      >
                        <UtensilsCrossed className="w-3.5 h-3.5 mr-1" /> Serve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setEditTarget({ subscription: row, mealsTotal: String(row.mealsTotal), status: row.status, notes: row.notes || "" })
                        }
                      >
                        Edit
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(row)} title="Delete subscription">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Add subscription dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Monthly Subscription</DialogTitle>
            <DialogDescription>Register a customer manually for monthly meals.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Customer name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
            </div>
            <div>
              <Label>Phone number</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="10-digit mobile" inputMode="tel" />
            </div>
            <div>
              <Label>Delivery address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Flat / Tower / Landmark" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Plan type</Label>
                <Select value={form.planType} onValueChange={(value) => setForm({ ...form, planType: value as MonthlyPlanType, meals: "" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Veg">Only Veg</SelectItem>
                    <SelectItem value="NonVeg">Non-Veg + Veg</SelectItem>
                    <SelectItem value="OnlyNonVeg">Only NonVeg</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Meals plan</Label>
                <Select value={form.meals} onValueChange={(value) => setForm({ ...form, meals: value })}>
                  <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                  <SelectContent>
                    {selectPlans(form.planType).map((plan) => (
                      <SelectItem key={plan.id} value={String(plan.meals)}>
                        {plan.label} · Rs {plan.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Saving..." : "Create Subscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Serve meal dialog */}
      <Dialog open={serveTarget !== null} onOpenChange={(open) => { if (!open) setServeTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark meal as served</DialogTitle>
            <DialogDescription>
              {serveTarget ? `${serveTarget.subscription.name} · ${serveTarget.subscription.mealsRemaining} meals remaining.` : ""}
            </DialogDescription>
          </DialogHeader>
          {serveTarget && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Meal</Label>
                  <Select value={serveTarget.meal} onValueChange={(value) => setServeTarget({ ...serveTarget, meal: value as "Lunch" | "Dinner" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Lunch">Lunch</SelectItem>
                      <SelectItem value="Dinner">Dinner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Count</Label>
                  <Input
                    type="number"
                    min={1}
                    max={serveTarget.subscription.mealsRemaining}
                    value={serveTarget.count}
                    onChange={(e) => setServeTarget({ ...serveTarget, count: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Note (optional)</Label>
                <Textarea value={serveTarget.note} onChange={(e) => setServeTarget({ ...serveTarget, note: e.target.value })} placeholder="e.g. no onions" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setServeTarget(null)}>Cancel</Button>
            <Button onClick={handleServe} disabled={serving}>
              {serving ? "Saving..." : "Mark served"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit subscription dialog */}
      <Dialog open={editTarget !== null} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
            <DialogDescription>{editTarget ? `${editTarget.subscription.name} · Phone ${editTarget.subscription.phone}` : ""}</DialogDescription>
          </DialogHeader>
          {editTarget && (
            <div className="space-y-3">
              <div>
                <Label>Total meals</Label>
                <Input type="number" min={1} max={240} value={editTarget.mealsTotal} onChange={(e) => setEditTarget({ ...editTarget, mealsTotal: e.target.value })} />
                <p className="text-xs text-muted-foreground mt-1">Remaining will adjust automatically.</p>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={editTarget.status} onValueChange={(value) => setEditTarget({ ...editTarget, status: value as MonthlyStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={editTarget.notes} onChange={(e) => setEditTarget({ ...editTarget, notes: e.target.value })} placeholder="Dietary notes, preferences..." />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={editing}>
              {editing ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}