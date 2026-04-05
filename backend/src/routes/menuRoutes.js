import { Router } from "express";
import {
  addMenuItem,
  editMenuItem,
  listMenu,
  removeMenuItem,
} from "../controllers/menuController.js";

const router = Router();

router.get("/", listMenu);
router.post("/", addMenuItem);
router.patch("/:id", editMenuItem);
router.delete("/:id", removeMenuItem);

export default router;
