import { useEffect, useState } from "react";
import Constants from "expo-constants";
import { Platform, StyleSheet, View } from "react-native";
import { getAdRequestOptions, getBannerAdUnitId, initializeAdMob } from "@/utils/admob";

type BannerModule = {
  BannerAd: React.ComponentType<{
    unitId: string;
    size: string;
    requestOptions?: { requestNonPersonalizedAdsOnly?: boolean };
    onAdFailedToLoad?: (error: unknown) => void;
  }>;
  BannerAdSize: {
    ANCHORED_ADAPTIVE_BANNER: string;
  };
};

function getBannerModule(): BannerModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("react-native-google-mobile-ads");
    return {
      BannerAd: mod.BannerAd,
      BannerAdSize: mod.BannerAdSize,
    };
  } catch {
    return null;
  }
}

export function AdBanner() {
  const [ready, setReady] = useState(false);
  const [bannerModule, setBannerModule] = useState<BannerModule | null>(null);

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (Constants.appOwnership === "expo") return;
    setBannerModule(getBannerModule());
  }, []);

  useEffect(() => {
    let mounted = true;

    initializeAdMob()
      .then((canShow) => {
        if (!mounted) return;
        setReady(Boolean(canShow));
      })
      .catch((error) => {
        console.warn("admob_banner_init_failed", error);
        if (!mounted) return;
        setReady(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (Platform.OS === "web" || !ready || !bannerModule) return null;

  const BannerAd = bannerModule.BannerAd;
  const BannerAdSize = bannerModule.BannerAdSize;

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={getBannerAdUnitId()}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={getAdRequestOptions()}
        onAdFailedToLoad={(error) => {
          console.warn("admob_banner_load_failed", error);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
