import { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { getBannerAdUnitId, initializeAdMob } from "@/utils/admob";

export function AdBanner() {
  const [ready, setReady] = useState(false);

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

  if (Platform.OS === "web" || !ready) return null;

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={getBannerAdUnitId()}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
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
