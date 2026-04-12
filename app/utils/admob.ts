import { Platform } from "react-native";
import mobileAds, {
  AdsConsent,
  AdsConsentStatus,
  MaxAdContentRating,
  TestIds,
} from "react-native-google-mobile-ads";

const BANNER_TEST_ID = TestIds.BANNER;
const INTERSTITIAL_TEST_ID = TestIds.INTERSTITIAL;
const ANDROID_BANNER_FALLBACK = "ca-app-pub-7501738870401219/2488455783";
const ANDROID_INTERSTITIAL_FALLBACK = "ca-app-pub-7501738870401219/3436360931";

let initialized = false;

function isNativeMobile() {
  return Platform.OS === "android" || Platform.OS === "ios";
}

export function getBannerAdUnitId() {
  if (__DEV__) return BANNER_TEST_ID;
  const fromEnv = String(process.env.EXPO_PUBLIC_ADMOB_BANNER_ID || "").trim();
  if (fromEnv) return fromEnv;
  if (Platform.OS === "android") return ANDROID_BANNER_FALLBACK;
  return BANNER_TEST_ID;
}

export function getInterstitialAdUnitId() {
  if (__DEV__) return INTERSTITIAL_TEST_ID;
  const fromEnv = String(process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID || "").trim();
  if (fromEnv) return fromEnv;
  if (Platform.OS === "android") return ANDROID_INTERSTITIAL_FALLBACK;
  return INTERSTITIAL_TEST_ID;
}

export async function initializeAdMob() {
  if (!isNativeMobile()) return false;
  if (initialized) return true;

  try {
    await mobileAds().setRequestConfiguration({
      maxAdContentRating: MaxAdContentRating.T,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
      testDeviceIdentifiers: __DEV__ ? ["EMULATOR"] : [],
    });

    const consentInfo = await AdsConsent.gatherConsent();
    const canRequestAds =
      consentInfo.canRequestAds ||
      consentInfo.status === AdsConsentStatus.NOT_REQUIRED ||
      consentInfo.status === AdsConsentStatus.OBTAINED;

    if (!canRequestAds) return false;

    await mobileAds().initialize();
    initialized = true;
    return true;
  } catch (error) {
    console.warn("admob_initialize_failed", error);
    return false;
  }
}
