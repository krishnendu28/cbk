export type MonthlyStatus = "Active" | "Completed" | "Cancelled";

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
  planType: "Veg" | "NonVeg";
  planId?: string;
  mealsTotal: number;
  mealsRemaining: number;
  mealsRedeemed: number;
  price: number;
  startDate: string;
  endDate: string;
  status: MonthlyStatus;
  redemptionLog: MonthlyRedemptionLogEntry[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
};