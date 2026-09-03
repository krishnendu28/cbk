export type MonthlyPlanType = "Veg" | "NonVeg" | "OnlyNonVeg";

export type MonthlyPlan = {
  id: string;
  planType: MonthlyPlanType;
  meals: number;
  days: number;
  label: string;
  price: number;
  delivery: string;
};

export type MonthlyMenuRow = {
  day: string;
  lunch: string;
  dinner: string;
};

export const MONTHLY_TITLE = "Monthly Food Subscription";
export const MONTHLY_TAGLINE = '"By Kilo By Choice By Taste"';

export const MONTHLY_PLAN_LABELS: Record<MonthlyPlanType, string> = {
  Veg: "Only Veg",
  NonVeg: "Non-Veg + Veg",
  OnlyNonVeg: "Only NonVeg",
};

export const MONTHLY_HIGHLIGHTS = [
  "Healthy - Homely - Hassle-Free",
  "Ghar Jaisa Khana, Har Roz!",
  "Timely Delivery",
];

export const MONTHLY_FEATURES = [
  "30 Days Subscription",
  "Daily Lunch & Dinner",
  "Variety of Rotis, Rice, Dal, Sabzi, Salad & More",
  "Timely Delivery",
  "No compromise on Taste & Quality",
];

export const MONTHLY_BADGES = [
  "Freshly Cooked Everyday",
  "Hygienic & Safe",
  "No Compromise on Taste & Quality",
  "Flexible & Convenient",
];

export const MONTHLY_PERFECT_FOR = ["Working Professionals", "Families", "Students", "Elders"];

export const MONTHLY_LOCATION = "Opposite of C Gate, Shapoorji Complex";
export const MONTHLY_WHATSAPP_DIAL = "918420252042";
export const MONTHLY_FOOTER_QUOTE = "Ghar Ka Khana, Har Din.";
export const MONTHLY_FOOTER_TAGLINE = "By Kilo By Choice By Taste";

export const MONTHLY_PLANS: Record<MonthlyPlanType, MonthlyPlan[]> = {
  Veg: [
    { id: "veg-60", planType: "Veg", meals: 60, days: 90, label: "60 Meals – Lunch + Dinner", price: 4100, delivery: "Lunch + Dinner" },
    { id: "veg-30", planType: "Veg", meals: 30, days: 60, label: "30 Meals – Lunch or Dinner", price: 2200, delivery: "Lunch or Dinner" },
    { id: "veg-15", planType: "Veg", meals: 15, days: 35, label: "15 Meals – Lunch or Dinner", price: 1250, delivery: "Lunch or Dinner" },
  ],
  NonVeg: [
    { id: "nonveg-60", planType: "NonVeg", meals: 60, days: 90, label: "60 Meals – Lunch + Dinner", price: 5000, delivery: "Lunch + Dinner" },
    { id: "nonveg-30", planType: "NonVeg", meals: 30, days: 60, label: "30 Meals – Lunch or Dinner", price: 2900, delivery: "Lunch or Dinner" },
    { id: "nonveg-15", planType: "NonVeg", meals: 15, days: 35, label: "15 Meals – Lunch or Dinner", price: 1600, delivery: "Lunch or Dinner" },
  ],
  OnlyNonVeg: [
    { id: "onlynonveg-60", planType: "OnlyNonVeg", meals: 60, days: 90, label: "60 Meals – Lunch + Dinner", price: 6700, delivery: "Lunch + Dinner" },
    { id: "onlynonveg-30", planType: "OnlyNonVeg", meals: 30, days: 60, label: "30 Meals – Lunch or Dinner", price: 3500, delivery: "Lunch or Dinner" },
    { id: "onlynonveg-15", planType: "OnlyNonVeg", meals: 15, days: 35, label: "15 Meals – Lunch or Dinner", price: 2150, delivery: "Lunch or Dinner" },
  ],
};

export const MONTHLY_MENU: Record<MonthlyPlanType, MonthlyMenuRow[]> = {
  NonVeg: [
    { day: "Monday", lunch: "Veg Thali", dinner: "Dal Tadka Combo" },
    { day: "Tuesday", lunch: "Veg Thali", dinner: "Aalu Paratha" },
    { day: "Wednesday", lunch: "Fish Thali", dinner: "Veg Fried Rice + Chilli Chicken/Noodles" },
    { day: "Thursday", lunch: "Paneer Thali", dinner: "Chana Masala Combo" },
    { day: "Friday", lunch: "Egg Thali", dinner: "Handi Chicken Meal" },
    { day: "Saturday", lunch: "Kadhi Chawal", dinner: "Aalu Dum Combo" },
    { day: "Sunday", lunch: "Chicken Biryani", dinner: "Omelette Curry Meal" },
  ],
  Veg: [
    { day: "Monday", lunch: "Veg Thali", dinner: "Dal Tadka Meal" },
    { day: "Tuesday", lunch: "Paneer Thali", dinner: "Aalu Paratha" },
    { day: "Wednesday", lunch: "Mushroom Thali", dinner: "Veg Noodles + Paneer Chilli" },
    { day: "Thursday", lunch: "Veg Thali", dinner: "Chana Masala Meal" },
    { day: "Friday", lunch: "Veg Noodles + Mushroom Chilli", dinner: "Mushroom Masala Meal" },
    { day: "Saturday", lunch: "Kadhi Chawal", dinner: "Aalu Dum Combo" },
    { day: "Sunday", lunch: "Veg Fried Rice + Paneer Chilli", dinner: "Mushroom Masala (Roti)" },
  ],
  OnlyNonVeg: [
    { day: "Monday", lunch: "Egg Thali", dinner: "Chicken + Roti" },
    { day: "Tuesday", lunch: "Fish Thali", dinner: "Chicken Tadka + Roti" },
    { day: "Wednesday", lunch: "Egg Thali", dinner: "Chili Chicken (3pcs) + Veg Noodles" },
    { day: "Thursday", lunch: "Fish Thali", dinner: "Veg Fried Rice + Chili Chicken (3pcs)" },
    { day: "Friday", lunch: "Chicken Biryani", dinner: "Chicken + Roti" },
    { day: "Saturday", lunch: "Fish Thali", dinner: "Chicken Bharta + Roti" },
    { day: "Sunday", lunch: "Chicken Thali", dinner: "Egg Chicken / Schezwan Noodles" },
  ],
};

export const MONTHLY_THALI_BREAKDOWN = [
  "Veg Thali: Rice / 4 pc Roti, Dal, Sabjhi, Bujhiya, Chatni, Salad, Papad",
  "Paneer Thali: Rice / 4 pc Roti, Dal, Paneer Masala, Bujhiya, Chatni, Salad, Papad",
  "Mushroom Thali: Rice / 4 pc Roti, Dal, Mushroom Masala, Bujhiya, Chatni, Salad, Papad",
  "Fish Thali: Rice / 4 pc Roti, Dal, Sabjhi, Bujhiya, Fish 1 pc, Chatni, Salad, Papad",
  "Chicken Thali: Rice / 4 pc Roti, Dal, Sabjhi, Bujhiya, 2 pc Chicken, Chatni, Salad, Papad",
];

export const MONTHLY_NOTE = "Menu may change slightly based on seasonal availability & freshness.";