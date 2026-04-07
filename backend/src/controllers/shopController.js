import { getIO } from "../config/socket.js";
import { getOrderingStatus, setOrderingStatus } from "../services/shopService.js";

export async function getOrderingStatusHandler(_req, res) {
  try {
    const status = await getOrderingStatus();
    return res.json(status);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch ordering status." });
  }
}

export async function updateOrderingStatusHandler(req, res) {
  try {
    const { isOrderingOpen } = req.body;
    const status = await setOrderingStatus(isOrderingOpen);
    getIO().emit("ordering_status_updated", status);
    return res.json(status);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update ordering status." });
  }
}
