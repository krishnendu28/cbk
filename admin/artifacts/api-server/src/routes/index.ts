import { Router } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import outletsRouter from "./outlets";
import staffRouter from "./staff";
import tablesRouter from "./tables";
import menuRouter from "./menu";
import ordersRouter from "./orders";
import kotsRouter from "./kots";
import inventoryRouter from "./inventory";
import customersRouter from "./customers";
import reportsRouter from "./reports";
import aggregatorsRouter from "./aggregators";
import { authenticate, authorize, authorizeOutletAccess } from "../middlewares/auth";

const router = Router();

router.use(healthRouter);
router.use("/auth", authRouter);

router.use(authenticate);

router.use("/outlets", authorize("owner", "manager", "cashier", "kitchen", "waiter"), outletsRouter);
router.use("/outlets/:outletId/staff", authorizeOutletAccess, authorize("owner", "manager"), staffRouter);
router.use("/outlets/:outletId/tables", authorizeOutletAccess, authorize("owner", "manager", "cashier", "waiter"), tablesRouter);
router.use("/outlets/:outletId", authorizeOutletAccess, authorize("owner", "manager", "cashier", "kitchen", "waiter"), menuRouter);
router.use("/outlets/:outletId/orders", authorizeOutletAccess, authorize("owner", "manager", "cashier", "waiter"), ordersRouter);
router.use("/outlets/:outletId/kots", authorizeOutletAccess, authorize("owner", "manager", "kitchen"), kotsRouter);
router.use("/outlets/:outletId/inventory", authorizeOutletAccess, authorize("owner", "manager"), inventoryRouter);
router.use("/outlets/:outletId/customers", authorizeOutletAccess, authorize("owner", "manager", "cashier", "waiter"), customersRouter);
router.use("/outlets/:outletId/reports", authorizeOutletAccess, authorize("owner", "manager"), reportsRouter);
router.use("/outlets/:outletId/aggregators", authorizeOutletAccess, authorize("owner", "manager", "cashier"), aggregatorsRouter);

export default router;
