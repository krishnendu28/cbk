function parseRoleKeyPairs(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [role, key] = entry.split(":");
      return {
        role: String(role || "").trim().toLowerCase(),
        key: String(key || "").trim(),
      };
    })
    .filter((entry) => entry.role && entry.key);
}

function loadAdminKeys() {
  const fromPairs = parseRoleKeyPairs(process.env.ADMIN_API_KEYS);
  if (fromPairs.length > 0) {
    return fromPairs;
  }

  const legacyKey = String(process.env.ADMIN_API_KEY || "").trim();
  if (legacyKey) {
    return [{ role: "owner", key: legacyKey }];
  }

  return [];
}

function extractToken(req) {
  const header = String(req.headers.authorization || "").trim();
  if (header.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim();
  }

  const apiKey = String(req.headers["x-admin-key"] || "").trim();
  return apiKey;
}

export function requireAdmin(allowedRoles = ["owner", "manager"]) {
  return (req, res, next) => {
    const admins = loadAdminKeys();
    if (admins.length === 0) {
      return res.status(503).json({
        message: "Admin auth is not configured.",
        requestId: req.requestId,
      });
    }

    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({
        message: "Missing admin credentials.",
        requestId: req.requestId,
      });
    }

    const found = admins.find((admin) => admin.key === token);
    if (!found) {
      return res.status(403).json({
        message: "Invalid admin credentials.",
        requestId: req.requestId,
      });
    }

    if (!allowedRoles.includes(found.role)) {
      return res.status(403).json({
        message: "Insufficient role permissions.",
        requestId: req.requestId,
      });
    }

    req.admin = {
      role: found.role,
    };

    next();
  };
}
