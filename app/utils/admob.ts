import Constants from "expo-constants";
import { Platform } from "react-native";

const BANNER_TEST_ID = "ca-app-pub-3940256099942544/6300978111";
const INTERSTITIAL_TEST_ID = "ca-app-pub-3940256099942544/1033173712";
const ANDROID_BANNER_FALLBACK = "ca-app-pub-7501738870401219/2488455783";
const ANDROID_INTERSTITIAL_FALLBACK = "ca-app-pub-7501738870401219/3436360931";

let initialized = false;
let requestNonPersonalizedAdsOnly = false;

type GoogleMobileAdsModule = {
  default: () => {
    setRequestConfiguration: (config: {
      maxAdContentRating: string;
      tagForChildDirectedTreatment: boolean;
      tagForUnderAgeOfConsent: boolean;
      testDeviceIdentifiers: string[];
    }) => Promise<void>;
    initialize: () => Promise<unknown>;
  };
  AdsConsent: {
    gatherConsent: () => Promise<{
      canRequestAds?: boolean;
      status?: string | number;
    }>;
  };
  AdsConsentStatus: {
    NOT_REQUIRED: string | number;
    OBTAINED: string | number;
    REQUIRED: string | number;
  };
  MaxAdContentRating: {
    T: string;
  };
};

function getGoogleMobileAdsModule(): GoogleMobileAdsModule | null {
  try {
    return require("react-native-google-mobile-ads") as GoogleMobileAdsModule;
  } catch {
    return null;
  }
}

function forceTestAds() {
  return String(process.env.EXPO_PUBLIC_FORCE_TEST_ADS || "").trim().toLowerCase() === "true";
}

function getConfiguredTestDeviceIds() {
  const fromEnv = String(process.env.EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS || "").trim();
  if (!fromEnv) return [];
  return fromEnv
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isNativeMobile() {
  return Platform.OS === "android" || Platform.OS === "ios";
}

function isExpoGoRuntime() {
  return Constants.appOwnership === "expo";
}

export function getBannerAdUnitId() {
  if (__DEV__ || forceTestAds()) return BANNER_TEST_ID;
  const fromEnv = String(process.env.EXPO_PUBLIC_ADMOB_BANNER_ID || "").trim();
  if (fromEnv) return fromEnv;
  if (Platform.OS === "android") return ANDROID_BANNER_FALLBACK;
  return BANNER_TEST_ID;
}

export function getInterstitialAdUnitId() {
  if (__DEV__ || forceTestAds()) return INTERSTITIAL_TEST_ID;
  const fromEnv = String(process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID || "").trim();
  if (fromEnv) return fromEnv;
  if (Platform.OS === "android") return ANDROID_INTERSTITIAL_FALLBACK;
  return INTERSTITIAL_TEST_ID;
}

export function getAdRequestOptions() {
  return {
    requestNonPersonalizedAdsOnly: requestNonPersonalizedAdsOnly,
  };
}

export async function initializeAdMob() {
  if (!isNativeMobile()) return false;
  if (isExpoGoRuntime()) return false;
  if (initialized) return true;

  const googleMobileAds = getGoogleMobileAdsModule();
  if (!googleMobileAds) return false;

  try {
    const testDeviceIds = __DEV__ ? ["EMULATOR"] : getConfiguredTestDeviceIds();
    const mobileAds = googleMobileAds.default;

    await mobileAds().setRequestConfiguration({
      maxAdContentRating: googleMobileAds.MaxAdContentRating.T,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
      testDeviceIdentifiers: testDeviceIds,
    });

    let canRequestAds = true;
    requestNonPersonalizedAdsOnly = false;

    try {
      const consentInfo = await googleMobileAds.AdsConsent.gatherConsent();
      canRequestAds =
        consentInfo.canRequestAds ||
        consentInfo.status === googleMobileAds.AdsConsentStatus.NOT_REQUIRED ||
        consentInfo.status === googleMobileAds.AdsConsentStatus.OBTAINED;

      // If consent cannot be obtained yet, fall back to non-personalized requests.
      if (!consentInfo.canRequestAds && consentInfo.status === googleMobileAds.AdsConsentStatus.REQUIRED) {
        requestNonPersonalizedAdsOnly = true;
      }
    } catch (consentError) {
      // Consent retrieval can fail on some networks/devices; continue with safe ad requests.
      console.warn("admob_consent_check_failed", consentError);
      requestNonPersonalizedAdsOnly = true;
      canRequestAds = true;
    }

    if (!canRequestAds) return false;

    await mobileAds().initialize();
    initialized = true;
    return true;
  } catch (error) {
    console.warn("admob_initialize_failed", error);
    return false;
  }
}
