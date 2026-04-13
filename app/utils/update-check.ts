import Constants from "expo-constants";

const DEFAULT_PLAY_STORE_WEB_BASE = "https://play.google.com/store/apps/details";

function getAndroidPackageName(): string {
  const fromEnv = String(process.env.EXPO_PUBLIC_PLAY_STORE_PACKAGE || "").trim();
  if (fromEnv) return fromEnv;

  const fromExpoConfig = Constants.expoConfig?.android?.package;
  if (typeof fromExpoConfig === "string" && fromExpoConfig.trim()) return fromExpoConfig;

  return "";
}

function getPlayStoreWebUrl(packageName: string): string {
  const params = new URLSearchParams({ id: packageName, hl: "en", gl: "US" });
  return `${DEFAULT_PLAY_STORE_WEB_BASE}?${params.toString()}`;
}

function getPlayStoreAppUrl(packageName: string): string {
  return `market://details?id=${encodeURIComponent(packageName)}`;
}

function extractVersionFromPlayStoreHtml(html: string): string {
  const patterns = [
    /\"softwareVersion\"\s*:\s*\"([^\"]+)\"/i,
    /\"Current Version\"\s*<\/div>\s*<span[^>]*>\s*<div[^>]*>\s*<span[^>]*>([^<]+)<\/span>/i,
    /\[\[\[\"([0-9]+(?:\.[0-9]+){1,3})\"\]\]\]/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    const candidate = String(match?.[1] || "").trim();
    if (candidate) return candidate;
  }

  return "";
}

function normalizeVersion(input: string | undefined | null): number[] {
  const raw = String(input || "").trim().replace(/^v/i, "");
  if (!raw) return [0, 0, 0];

  const segments = raw
    .split(/[.-]/)
    .map((part) => Number.parseInt(part, 10))
    .filter((value) => Number.isFinite(value));

  return [segments[0] || 0, segments[1] || 0, segments[2] || 0];
}

function isRemoteNewer(remote: string, local: string): boolean {
  const [rMaj, rMin, rPatch] = normalizeVersion(remote);
  const [lMaj, lMin, lPatch] = normalizeVersion(local);

  if (rMaj !== lMaj) return rMaj > lMaj;
  if (rMin !== lMin) return rMin > lMin;
  return rPatch > lPatch;
}

function getCurrentAppVersion(): string {
  const fromExpoConfig = Constants.expoConfig?.version;
  if (typeof fromExpoConfig === "string" && fromExpoConfig.trim()) return fromExpoConfig;

  const fromManifest2 = (Constants as unknown as { manifest2?: { extra?: { expoClient?: { version?: string } } } })
    .manifest2?.extra?.expoClient?.version;
  if (typeof fromManifest2 === "string" && fromManifest2.trim()) return fromManifest2;

  const fromNative = Constants.nativeAppVersion;
  if (typeof fromNative === "string" && fromNative.trim()) return fromNative;

  return "0.0.0";
}

export async function checkForPlayStoreUpdate(): Promise<{
  hasUpdate: boolean;
  latestVersion: string;
  storeAppUrl: string;
  storeUrl: string;
}> {
  const packageName = getAndroidPackageName();
  if (!packageName) {
    return {
      hasUpdate: false,
      latestVersion: "",
      storeAppUrl: "",
      storeUrl: "",
    };
  }

  const storeAppUrl = getPlayStoreAppUrl(packageName);
  const storeUrl = getPlayStoreWebUrl(packageName);
  const configuredLatestVersion = String(process.env.EXPO_PUBLIC_PLAY_STORE_LATEST_VERSION || "").trim();

  let latestVersion = configuredLatestVersion;

  if (!latestVersion) {
    const response = await fetch(storeUrl);
    if (!response.ok) {
      throw new Error(`Failed to check Play Store updates (HTTP ${response.status})`);
    }

    const html = await response.text();
    latestVersion = extractVersionFromPlayStoreHtml(html);
  }

  if (!latestVersion) {
    return {
      hasUpdate: false,
      latestVersion: "",
      storeAppUrl,
      storeUrl,
    };
  }

  const currentVersion = getCurrentAppVersion();
  const hasUpdate = isRemoteNewer(latestVersion, currentVersion);

  return {
    hasUpdate,
    latestVersion,
    storeAppUrl,
    storeUrl,
  };
}

export const checkForGithubReleaseUpdate = checkForPlayStoreUpdate;
