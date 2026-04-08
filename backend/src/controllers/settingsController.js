import { getIO } from "../config/socket.js";
import { getOutletSettings, updateOutletSettings } from "../services/settingsService.js";

export async function getOutletSettingsHandler(req, res) {
  try {
    const outletId = Number(req.params.outletId);
    const settings = await getOutletSettings(outletId);
    return res.json(settings);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch outlet settings." });
  }
}

export async function updateOutletSettingsHandler(req, res) {
  try {
    const outletId = Number(req.params.outletId);
    const settings = await updateOutletSettings(outletId, req.body);

    getIO().emit("outlet_settings_updated", {
      outletId,
      settings,
      updatedAt: new Date().toISOString(),
    });

    return res.json(settings);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update outlet settings." });
  }
}
