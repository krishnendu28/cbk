import { useEffect, useMemo, useState } from "react";
import { AdEventType, InterstitialAd } from "react-native-google-mobile-ads";
import { getInterstitialAdUnitId } from "@/utils/admob";

export function useInterstitialAd() {
  const ad = useMemo(
    () =>
      InterstitialAd.createForAdRequest(getInterstitialAdUnitId(), {
        requestNonPersonalizedAdsOnly: false,
      }),
    [],
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const onLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      setLoaded(true);
    });

    const onClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      setLoaded(false);
      ad.load();
    });

    const onError = ad.addAdEventListener(AdEventType.ERROR, () => {
      setLoaded(false);
    });

    ad.load();

    return () => {
      onLoaded();
      onClosed();
      onError();
    };
  }, [ad]);

  const showIfLoaded = () => {
    if (!loaded) return false;
    ad.show();
    return true;
  };

  return {
    isLoaded: loaded,
    showIfLoaded,
  };
}
