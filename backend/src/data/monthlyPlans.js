export const MONTHLY_SUBSCRIPTION_TITLE = "Monthly Food Subscription";

export const MONTHLY_SUBSCRIPTION_HIGHLIGHTS = [
  "Healthy - Homely - Hassle-Free",
  "Ghar Jaisa Khana, Har Roz!",
  "Timely Delivery",
  "Freshly Cooked Everyday",
  "Hygienic & Safe",
  "No Compromise on Taste & Quality",
  "Flexible & Convenient",
];

export const MONTHLY_SUBSCRIPTION_FEATURES = [
  "30 Days Subscription",
  "Daily Lunch & Dinner",
  "Variety of Rotis, Rice, Dal, Sabzi, Salad & More",
  "Timely Delivery",
  "No compromise on Taste & Quality",
];

export const MONTHLY_SUBSCRIPTION_PERFECT_FOR = [
  "Working Professionals",
  "Families",
  "Students",
  "Elders",
];

const basePlans = [
  { id: "veg-60", planType: "Veg", meals: 60, label: "60 Meals (Lunch + Dinner)", price: 4100, delivery: "Lunch + Dinner" },
  { id: "veg-30", planType: "Veg", meals: 30, label: "30 Meals (Lunch or Dinner)", price: 2200, delivery: "Lunch or Dinner" },
  { id: "veg-15", planType: "Veg", meals: 15, label: "15 Meals (Lunch or Dinner)", price: 1250, delivery: "Lunch or Dinner" },
  { id: "nonveg-60", planType: "NonVeg", meals: 60, label: "60 Meals (Lunch + Dinner)", price: 5000, delivery: "Lunch + Dinner" },
  { id: "nonveg-30", planType: "NonVeg", meals: 30, label: "30 Meals (Lunch or Dinner)", price: 2900, delivery: "Lunch or Dinner" },
  { id: "nonveg-15", planType: "NonVeg", meals: 15, label: "15 Meals (Lunch or Dinner)", price: 1600, delivery: "Lunch or Dinner" },
];

export const MONTHLY_PLANS = {
  Veg: basePlans.filter((plan) => plan.planType === "Veg"),
  NonVeg: basePlans.filter((plan) => plan.planType === "NonVeg"),
};

export const MONTHLY_PLANS_FLAT = basePlans;

export function findMonthlyPlan(planType, meals) {
  return basePlans.find((plan) => plan.planType === planType && Number(plan.meals) === Number(meals)) || null;
}

const nonVegMenu = [
  { day: "Monday", lunch: "Veg Thali", dinner: "Dal Tadka Combo" },
  { day: "Tuesday", lunch: "Veg Thali", dinner: "Aalu Paratha" },
  { day: "Wednesday", lunch: "Fish Thali", dinner: "Veg Fried Rice + Chilli Chicken/Noodles" },
  { day: "Thursday", lunch: "Paneer Thali", dinner: "Chana Masala Combo" },
  { day: "Friday", lunch: "Egg Thali", dinner: "Afghani Chicken Meal" },
  { day: "Saturday", lunch: "Kadhi Chawal", dinner: "Aalu Dum Combo" },
  { day: "Sunday", lunch: "Chicken Biryani", dinner: "Omelette Curry Meal" },
];

const vegMenu = [
  { day: "Monday", lunch: "Veg Thali", dinner: "Dal Tadka Meal" },
  { day: "Tuesday", lunch: "Paneer Thali", dinner: "Aalu Paratha" },
  { day: "Wednesday", lunch: "Mushroom Thali", dinner: "Veg Noodles + Paneer Chilli" },
  { day: "Thursday", lunch: "Veg Thali", dinner: "Chana Masala Meal" },
  { day: "Friday", lunch: "Veg Noodles + Mushroom Chilli", dinner: "Mushroom Masala Meal" },
  { day: "Saturday", lunch: "Kadhi Chawal", dinner: "Aalu Dum Combo" },
  { day: "Sunday", lunch: "Veg Fried Rice + Paneer Chilli", dinner: "Mushroom Masala (Roti)" },
];

export const MONTHLY_MENU = {
  NonVeg: nonVegMenu,
  Veg: vegMenu,
};

export const MONTHLY_LOCATION = "Opposite of C Gate, Shapoorji Complex";
export const MONTHLY_CONTACT_PHONE = "+918420252042";
export const MONTHLY_CONTACT_PHONE_LABEL = "8420252042";
export const MONTHLY_FOOTER_QUOTE = "Ghar Ka Khana, Har Din.";

export const MONTHLY_PLAN_TYPES = Object.freeze(["Veg", "NonVeg"]);
export const MONTHLY_STATUSES = Object.freeze(["Active", "Completed", "Cancelled"]);