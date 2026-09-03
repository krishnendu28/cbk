import {
  createSubscription,
  deleteSubscription,
  getMonthlyStats,
  getSubscriptionById,
  listSubscriptions,
  redeemMeals,
  updateSubscription,
} from "../services/monthlyService.js";
import {
  MONTHLY_PLANS,
  MONTHLY_PLANS_FLAT,
  MONTHLY_MENU,
  MONTHLY_SUBSCRIPTION_FEATURES,
  MONTHLY_SUBSCRIPTION_HIGHLIGHTS,
  MONTHLY_SUBSCRIPTION_PERFECT_FOR,
  MONTHLY_SUBSCRIPTION_TITLE,
} from "../data/monthlyPlans.js";

export async function getMonthlyPlansHandler(req, res) {
  return res.json({
    title: MONTHLY_SUBSCRIPTION_TITLE,
    highlights: MONTHLY_SUBSCRIPTION_HIGHLIGHTS,
    features: MONTHLY_SUBSCRIPTION_FEATURES,
    perfectFor: MONTHLY_SUBSCRIPTION_PERFECT_FOR,
    plans: MONTHLY_PLANS,
    plansFlat: MONTHLY_PLANS_FLAT,
    menu: MONTHLY_MENU,
  });
}

export async function createMonthlySubscriptionHandler(req, res) {
  try {
    const subscription = await createSubscription(req.body);
    return res.status(201).json(subscription);
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return res.status(500).json({ message: "Failed to subscribe to monthly plan." });
  }
}

export async function listMonthlySubscriptionsHandler(req, res) {
  try {
    const { phone, status } = req.query;
    const subscriptions = await listSubscriptions({ phone, status });
    return res.json({
      subscriptions,
      stats: getMonthlyStats(subscriptions),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch monthly subscriptions." });
  }
}

export async function getMonthlySubscriptionHandler(req, res) {
  try {
    const subscription = await getSubscriptionById(req.params.id);
    if (!subscription) {
      return res.status(404).json({ message: "Monthly subscription not found." });
    }
    return res.json(subscription);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch monthly subscription." });
  }
}

export async function redeemMonthlyMealHandler(req, res) {
  try {
    const result = await redeemMeals(req.params.id, req.body);
    if (result?.error === "NOT_FOUND") {
      return res.status(404).json({ message: "Monthly subscription not found." });
    }
    if (result?.error === "CLOSED") {
      return res.status(400).json({ message: `Subscription is ${String(result.detail).toLowerCase()}.` });
    }
    if (result?.error === "NO_MEALS") {
      return res.status(400).json({ message: "No meals remaining on this subscription." });
    }
    if (result?.error === "PENDING_APPROVAL") {
      return res.status(400).json({ message: "Subscription is pending approval. Please wait for admin confirmation." });
    }
    if (result?.error === "REJECTED") {
      return res.status(400).json({ message: "This subscription was not approved." });
    }
    if (result?.error === "DAILY_LIMIT") {
      return res.status(400).json({
        message: `Daily meal limit reached (${result?.detail?.usedToday} of ${result?.detail?.dailyLimit} meals). Come back later.`,
      });
    }
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: "Failed to redeem meal." });
  }
}

export async function updateMonthlySubscriptionHandler(req, res) {
  try {
    const updated = await updateSubscription(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ message: "Monthly subscription not found." });
    }
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update monthly subscription." });
  }
}

export async function deleteMonthlySubscriptionHandler(req, res) {
  try {
    const deleted = await deleteSubscription(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Monthly subscription not found." });
    }
    return res.json({ ok: true, _id: req.params.id });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete monthly subscription." });
  }
}