import { USER_BACKEND_URL } from "@/lib/bridge";

export type MonthlyPlanType = "Veg" | "NonVeg" | "OnlyNonVeg";
export type MonthlyStatus = "Pending" | "Active" | "Completed" | "Cancelled" | "Rejected";

export type MonthlyPlan = {
  id: string;
  planType: MonthlyPlanType;
  meals: number;
  label: string;
  price: number;
  delivery: string;
};

export type MonthlyPlanCatalog = {
  title: string;
  highlights: string[];
  features: string[];
  perfectFor: string[];
  plans: Record<MonthlyPlanType, MonthlyPlan[]>;
  plansFlat: MonthlyPlan[];
  menu?: Record<MonthlyPlanType, MonthlyMenuRow[]>;
};

export type MonthlyMenuRow = {
  day: string;
  lunch: string;
  dinner: string;
};

export type MonthlyRedemptionLogEntry = {
  redeemedAt: string;
  meal: "Lunch" | "Dinner";
  note?: string;
  redeemedBy?: string;
};

export type MonthlySubscription = {
  _id: string;
  name: string;
  phone: string;
  address: string;
  planType: MonthlyPlanType;
  planId?: string;
  mealsTotal: number;
  mealsRemaining: number;
  mealsRedeemed: number;
  price: number;
  startDate: string;
  endDate: string;
  status: MonthlyStatus;
  statusApproval?: "Pending" | "Approved" | "Rejected";
  dailyLimit?: number;
  days?: number;
  instructions?: string;
  redemptionLog: MonthlyRedemptionLogEntry[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type MonthlyStats = {
  total: number;
  activeCount: number;
  completedCount: number;
  cancelledCount: number;
  activeMealsRemaining: number;
  revenue: number;
  vegCount: number;
  nonVegCount: number;
  onlyNonVegCount?: number;
};

export type MonthlySubscriptionResponse = {
  subscriptions: MonthlySubscription[];
  stats: MonthlyStats;
};

const TABIO_SESSION_TOKEN_KEY = "tabio_session_token";
const DEMO_SESSION_KEY = "cbk_tabio_demo_owner";
const DEMO_MONTHLY_KEY = "cbk_demo_monthly_subscriptions";

const MONTHLY_POLL_INTERVAL_MS = 4000;

function isDemoSessionActive() {
  return (
    typeof localStorage !== "undefined" &&
    (import.meta.env.VITE_TABIO_DEMO_AUTH === "true" || localStorage.getItem(DEMO_SESSION_KEY) === "1")
  );
}

function resolveAdminToken() {
  const fromEnv = String(import.meta.env.VITE_ADMIN_API_KEY || "").trim();
  if (fromEnv) return fromEnv;

  const fromLegacyEnv = String(import.meta.env.VITE_OWNER_API_KEY || "").trim();
  if (fromLegacyEnv) return fromLegacyEnv;

  const fromSession = String(localStorage.getItem(TABIO_SESSION_TOKEN_KEY) || "").trim();
  if (fromSession) return fromSession;

  return "";
}

function buildAdminHeaders(extraHeaders: Record<string, string> = {}) {
  const token = resolveAdminToken();
  if (!token) return extraHeaders;
  return {
    ...extraHeaders,
    Authorization: `Bearer ${token}`,
    "x-admin-key": token,
  };
}

async function buildRequestError(response: Response, fallbackMessage: string) {
  let message = fallbackMessage;
  try {
    const data = await response.json();
    const responseMessage = typeof data?.message === "string" ? data.message.trim() : "";
    if (responseMessage) message = responseMessage;
  } catch {
    // no-op
  }
  return new Error(`${message} (HTTP ${response.status})`);
}

// --- Demo-mode (localStorage) helpers -----------------------------------------

function readDemoSubscriptions(): MonthlySubscription[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(DEMO_MONTHLY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveDemoSubscriptions(subscriptions: MonthlySubscription[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(DEMO_MONTHLY_KEY, JSON.stringify(subscriptions));
  window.dispatchEvent(new CustomEvent("cbk_demo_monthly_changed"));
}

function emptyDemoStats(subscriptions: MonthlySubscription[]): MonthlyStats {
  const active = subscriptions.filter((row) => row.status === "Active");
  const completed = subscriptions.filter((row) => row.status === "Completed");
  return {
    total: subscriptions.length,
    activeCount: active.length,
    completedCount: completed.length,
    cancelledCount: subscriptions.filter((row) => row.status === "Cancelled").length,
    activeMealsRemaining: active.reduce((sum, row) => sum + Number(row.mealsRemaining || 0), 0),
    revenue: subscriptions.reduce((sum, row) => sum + Number(row.price || 0), 0),
    vegCount: active.filter((row) => row.planType === "Veg").length,
    nonVegCount: active.filter((row) => row.planType === "NonVeg").length,
    onlyNonVegCount: active.filter((row) => row.planType === "OnlyNonVeg").length,
  };
}

// --- Public API ----------------------------------------------------------------

export async function fetchMonthlyPlans(): Promise<MonthlyPlanCatalog> {
  const response = await fetch(`${USER_BACKEND_URL}/api/monthly/plans`);
  if (!response.ok) throw await buildRequestError(response, "Failed to fetch monthly plans");
  return response.json();
}

export async function fetchMonthlySubscriptions(status?: MonthlyStatus): Promise<MonthlySubscriptionResponse> {
  if (isDemoSessionActive()) {
    const subscriptions = readDemoSubscriptions();
    return { subscriptions, stats: emptyDemoStats(subscriptions) };
  }

  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const response = await fetch(`${USER_BACKEND_URL}/api/monthly/subscriptions${query}`);
  if (!response.ok) throw await buildRequestError(response, "Failed to fetch monthly subscriptions");
  const data = await response.json();
  return {
    subscriptions: Array.isArray(data?.subscriptions) ? data.subscriptions : [],
    stats: data?.stats ?? emptyDemoStats(Array.isArray(data?.subscriptions) ? data.subscriptions : []),
  };
}

export async function createMonthlySubscription(payload: {
  name: string;
  phone: string;
  address: string;
  planType: MonthlyPlanType;
  meals: number;
}): Promise<MonthlySubscription> {
  if (isDemoSessionActive()) {
    const plan = { mealsTotal: Number(payload.meals), mealsRemaining: Number(payload.meals) };
    const created: MonthlySubscription = {
      _id: `mem-${Date.now()}`,
      name: payload.name.trim(),
      phone: payload.phone.trim(),
      address: payload.address.trim(),
      planType: payload.planType,
      planId: `${payload.planType.toLowerCase()}-${payload.meals}`,
      mealsTotal: plan.mealsTotal,
      mealsRemaining: plan.mealsRemaining,
      mealsRedeemed: 0,
      price: 0,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      status: "Active",
      redemptionLog: [],
      notes: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveDemoSubscriptions([created, ...readDemoSubscriptions()]);
    return created;
  }

  const response = await fetch(`${USER_BACKEND_URL}/api/monthly/subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw await buildRequestError(response, "Failed to create monthly subscription");
  return response.json();
}

export async function redeemMonthlyMeal(
  subscriptionId: string,
  payload: { count?: number; meal?: "Lunch" | "Dinner"; note?: string; redeemedBy?: string },
): Promise<{ subscription: MonthlySubscription; redeemed: number }> {
  if (isDemoSessionActive()) {
    const subscriptions = readDemoSubscriptions();
    const index = subscriptions.findIndex((row) => row._id === subscriptionId);
    if (index < 0) throw new Error("Monthly subscription not found");
    const row = subscriptions[index];
    const count = Math.min(Number(payload.count) || 1, Number(row.mealsRemaining) || 0);
    row.mealsRemaining = Math.max(0, Number(row.mealsRemaining) - count);
    row.redemptionLog = [
      ...(row.redemptionLog || []),
      ...Array.from({ length: count }, () => ({
        redeemedAt: new Date().toISOString(),
        meal: payload.meal || "Lunch",
        note: payload.note || "",
        redeemedBy: payload.redeemedBy || "partner",
      })),
    ];
    if (row.mealsRemaining <= 0) row.status = "Completed";
    row.updatedAt = new Date().toISOString();
    saveDemoSubscriptions(subscriptions);
    return { subscription: row, redeemed: count };
  }

  const response = await fetch(`${USER_BACKEND_URL}/api/monthly/subscriptions/${subscriptionId}/redeem`, {
    method: "POST",
    headers: buildAdminHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw await buildRequestError(response, "Failed to redeem meal");
  return response.json();
}

export async function updateMonthlySubscription(
  subscriptionId: string,
  patch: Partial<Pick<MonthlySubscription, "name" | "phone" | "address" | "mealsTotal" | "price" | "status" | "notes">>,
): Promise<MonthlySubscription> {
  if (isDemoSessionActive()) {
    const subscriptions = readDemoSubscriptions();
    const index = subscriptions.findIndex((row) => row._id === subscriptionId);
    if (index < 0) throw new Error("Monthly subscription not found");
    const row = subscriptions[index];
    if (patch.mealsTotal !== undefined && Number(patch.mealsTotal) >= 1) {
      const adjustment = Number(patch.mealsTotal) - Number(row.mealsTotal);
      row.mealsTotal = Number(patch.mealsTotal);
      row.mealsRemaining = Math.max(0, Number(row.mealsRemaining) + adjustment);
    }
    if (patch.status) row.status = patch.status;
    if (patch.name) row.name = patch.name.trim();
    if (patch.phone) row.phone = patch.phone.trim();
    if (patch.address) row.address = patch.address.trim();
    if (patch.price !== undefined && Number(patch.price) >= 0) row.price = Number(patch.price);
    if (patch.notes !== undefined) row.notes = patch.notes;
    row.updatedAt = new Date().toISOString();
    saveDemoSubscriptions(subscriptions);
    return row;
  }

  const response = await fetch(`${USER_BACKEND_URL}/api/monthly/subscriptions/${subscriptionId}`, {
    method: "PATCH",
    headers: buildAdminHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(patch),
  });
  if (!response.ok) throw await buildRequestError(response, "Failed to update monthly subscription");
  return response.json();
}

export async function deleteMonthlySubscription(subscriptionId: string): Promise<void> {
  if (isDemoSessionActive()) {
    saveDemoSubscriptions(readDemoSubscriptions().filter((row) => row._id !== subscriptionId));
    return;
  }

  const response = await fetch(`${USER_BACKEND_URL}/api/monthly/subscriptions/${subscriptionId}`, {
    method: "DELETE",
    headers: buildAdminHeaders(),
  });
  if (!response.ok) throw await buildRequestError(response, "Failed to delete monthly subscription");
}

/**
 * Live feed for the admin sheet. Uses a fast polling snapshot diff (works on
 * the serverless backend where websockets are unavailable) and automatically
 * falls back to readDemoSubscriptions in demo mode. If the backend is ever
 * self-hosted with Socket.IO enabled, wire socket.io-client to
 * `monthly:changed` and call tabulate(snapshot) from the socket handler.
 */
export function subscribeMonthly(
  onSnapshot: (snapshot: { subscriptions: MonthlySubscription[]; stats: MonthlyStats }) => void,
) {
  let cancelled = false;

  const poll = async () => {
    try {
      const snapshot = await fetchMonthlySubscriptions();
      if (!cancelled) onSnapshot(snapshot);
    } catch {
      // transient error, keep polling
    }
  };

  poll();
  const timer = window.setInterval(poll, MONTHLY_POLL_INTERVAL_MS);

  return () => {
    cancelled = true;
    window.clearInterval(timer);
  };
}