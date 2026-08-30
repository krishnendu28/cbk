import { getOrderingStatus, setOrderingStatus } from "../services/shopService.js";
import { getOutletSettings } from "../services/settingsService.js";

const DEFAULT_OUTLET_ID = 1;

export async function getOrderingStatusHandler(_req, res) {
  try {
    const status = await getOrderingStatus();
    const settings = await getOutletSettings(DEFAULT_OUTLET_ID);
    return res.json({
      ...status,
      deliveryCharge: settings.deliveryCharge,
      etaMinutes: settings.etaMinutes,
      orderWindows: settings.orderWindows,
      firstOrderDiscountEnabled: settings.firstOrderDiscountEnabled,
      firstOrderDiscountRate: settings.firstOrderDiscountRate,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch ordering status." });
  }
}

export async function updateOrderingStatusHandler(req, res) {
  try {
    const { isOrderingOpen } = req.body;
    const status = await setOrderingStatus(isOrderingOpen);
    return res.json(status);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update ordering status." });
  }
}
