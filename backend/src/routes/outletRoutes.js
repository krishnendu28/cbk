import { Router } from "express";
import { requireAdmin } from "../middlewares/auth.js";

const router = Router();

const defaultOutlet = {
  id: 1,
  name: "Chakhna by Kilo",
  address: "Outside Shapoorji C Block Gate, Technocity (New Town), Kolkata - 700135",
  phone: "+91-84202 52042",
  email: "owner@tabio.com",
  gstNumber: "",
  fssaiNumber: "",
  currency: "INR",
  timezone: "Asia/Kolkata",
  logoUrl: null,
  isActive: true,
  createdAt: new Date().toISOString(),
};

router.get("/outlets", requireAdmin(["owner", "manager"]), (_req, res) => {
  return res.json([defaultOutlet]);
});

export default router;