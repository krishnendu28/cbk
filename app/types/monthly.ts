export type MonthlyStatus = "Pending" | "Active" | "Completed" | "Cancelled" | "Rejected";

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
  planType: "Veg" | "NonVeg" | "OnlyNonVeg";
  planId?: string;
  mealsTotal: number;
  mealsRemaining: number;
  mealsRedeemed: number;
  price: number;
  startDate: string;
  endDate: string;
  status: MonthlyStatus;
  statusApproval?: "Pending" | "Active" | "Rejected";
  dailyLimit?: number;
  days?: number;
  instructions?: string;
  redemptionLog: MonthlyRedemptionLogEntry[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
};