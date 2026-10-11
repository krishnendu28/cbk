export type MonthlyStatus = "Pending" | "Active" | "Completed" | "Cancelled" | "Rejected";

export type MonthlyRedemptionLogEntry = {
  redeemedAt: string;
  date?: string;
  meal: "Lunch" | "Dinner";
  note?: string;
  redeemedBy?: string;
};

export type MonthlyMealSelection = {
  date: string;
  meal: "Lunch" | "Dinner";
  wanted: boolean;
  served: boolean;
  servedAt?: string | null;
  source?: string;
  updatedAt?: string | null;
};

export type MonthlySubscription = {
  _id: string;
  name: string;
  phone: string;
  address: string;
  planType: "Veg" | "NonVeg" | "OnlyNonVeg";
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
  mealSelections?: MonthlyMealSelection[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
};