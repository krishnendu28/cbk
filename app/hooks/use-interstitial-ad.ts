import { useEffect, useRef, useState } from "react";
import { getAdRequestOptions, getInterstitialAdUnitId, initializeAdMob } from "@/utils/admob";

type InterstitialModule = {
  InterstitialAd: {
    createForAdRequest: (
      unitId: string,
      options?: { requestNonPersonalizedAdsOnly?: boolean },
    ) => {
      addAdEventListener: (eventType: string | number, listener: (error?: unknown) => void) => () => void;
      load: () => void;
      show: () => void;
    };
  };
  AdEventType: {
    LOADED: string | number;
    CLOSED: string | number;
    ERROR: string | number;
  };
};

function getInterstitialModule(): InterstitialModule | null {
  try {
    const mod = require("react-native-google-mobile-ads");
    return {
      InterstitialAd: mod.InterstitialAd,
      AdEventType: mod.AdEventType,
    };
  } catch {
    return null;
  }
}

export function useInterstitialAd() {
  const adRef = useRef<{
    show: () => void;
    load: () => void;
  } | null>(null);
  const pendingShowRef = useRef(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    let cleanupLoaded: (() => void) | null = null;
    let cleanupClosed: (() => void) | null = null;
    let cleanupError: (() => void) | null = null;

    initializeAdMob()
      .then((canShowAds) => {
        if (!mounted || !canShowAds) return;

        const module = getInterstitialModule();
        if (!module) return;

        const ad = module.InterstitialAd.createForAdRequest(getInterstitialAdUnitId(), {
          ...getAdRequestOptions(),
        });
        adRef.current = ad;

        cleanupLoaded = ad.addAdEventListener(module.AdEventType.LOADED, () => {
          setLoaded(true);

          if (pendingShowRef.current) {
            pendingShowRef.current = false;
            try {
              ad.show();
            } catch {
              // If showing fails, keep flow non-blocking and allow next load cycle.
            }
          }
        });

        cleanupClosed = ad.addAdEventListener(module.AdEventType.CLOSED, () => {
          setLoaded(false);
          ad.load();
        });

        cleanupError = ad.addAdEventListener(module.AdEventType.ERROR, (error) => {
          console.warn("admob_interstitial_failed", error);
          setLoaded(false);
          pendingShowRef.current = false;
        });

        ad.load();
      })
      .catch((error) => {
        console.warn("admob_interstitial_init_failed", error);
      });

    return () => {
      mounted = false;
      cleanupLoaded?.();
      cleanupClosed?.();
      cleanupError?.();
    };
  }, []);

  const showIfLoaded = () => {
    const ad = adRef.current;
    if (!ad) return false;
    if (!loaded) {
      pendingShowRef.current = true;
      ad.load();
      return false;
    }
    ad.show();
    return true;
  };

  return {
    isLoaded: loaded,
    showIfLoaded,
  };
}
