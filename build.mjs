import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, "dist");
const isWin = process.platform === "win32";

const DEFAULT_API = "https://n6dorzvkp2.execute-api.ap-south-1.amazonaws.com";
const DEFAULT_ADMIN_URL = "https://cbk-gamma.vercel.app/admin";

function run(command, args, cwd, env = {}) {
  console.log(`\n> ${command} ${args.join(" ")} (in ${path.relative(root, cwd)})`);
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: isWin,
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const frontendEnv = {
  VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || DEFAULT_API,
  VITE_ADMIN_DASHBOARD_URL: process.env.VITE_ADMIN_DASHBOARD_URL || DEFAULT_ADMIN_URL,
};

const adminEnv = {
  VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || DEFAULT_API,
  VITE_BRAND_LOGO_URL: process.env.VITE_BRAND_LOGO_URL || "https://cbk-gamma.vercel.app/logo.jpeg",
};
for (const key of ["VITE_TABIO_DEMO_AUTH", "VITE_ADMIN_API_KEY", "VITE_OWNER_API_KEY"]) {
  if (process.env[key]) adminEnv[key] = process.env[key];
}

if (existsSync(dist)) rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

run("npm", ["run", "build", "--", "--outDir=../dist"], path.join(root, "frontend"), frontendEnv);

run("npm", ["run", "build", "--", "--base=/admin/", "--outDir=../../dist/admin"], path.join(root, "admin", "chakhna-admin"), adminEnv);

console.log("\nBuild complete. dist layout:");
console.log("  /            -> storefront (frontend/dist)")
console.log("  /admin/      -> admin panel (admin/chakhna-admin, base=/admin/)")