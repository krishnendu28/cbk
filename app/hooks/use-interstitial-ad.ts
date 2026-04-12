import { useEffect, useRef, useState } from "react";
import { AdEventType, InterstitialAd } from "react-native-google-mobile-ads";
import { getInterstitialAdUnitId, initializeAdMob } from "@/utils/admob";

export function useInterstitialAd() {
  const adRef = useRef<ReturnType<typeof InterstitialAd.createForAdRequest> | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    let cleanupLoaded: (() => void) | null = null;
    let cleanupClosed: (() => void) | null = null;
    let cleanupError: (() => void) | null = null;

    initializeAdMob()
      .then((canShowAds) => {
        if (!mounted || !canShowAds) return;

        const ad = InterstitialAd.createForAdRequest(getInterstitialAdUnitId(), {
          requestNonPersonalizedAdsOnly: false,
        });
        adRef.current = ad;

        cleanupLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
          setLoaded(true);
        });

        cleanupClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
          setLoaded(false);
          ad.load();
        });

        cleanupError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
          console.warn("admob_interstitial_failed", error);
          setLoaded(false);
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
    if (!loaded || !ad) return false;
    ad.show();
    return true;
  };

  return {
    isLoaded: loaded,
    showIfLoaded,
  };
}
