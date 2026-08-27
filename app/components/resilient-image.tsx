import { useEffect, useMemo, useState } from "react";
import { Animated, type ImageSourcePropType } from "react-native";

const FALLBACK_IMAGE = require("@/assets/images/logo.jpeg");

type ResilientImageProps = {
  primarySource: ImageSourcePropType;
  secondarySource?: ImageSourcePropType;
  style: any;
  animateOnChange?: boolean;
};

export function ResilientImage({
  primarySource,
  secondarySource,
  style,
  animateOnChange = false,
}: ResilientImageProps) {
  const [source, setSource] = useState<ImageSourcePropType>(primarySource);
  const [step, setStep] = useState(0);
  const fade = useMemo(() => new Animated.Value(1), []);

  useEffect(() => {
    if (!animateOnChange) {
      setSource(primarySource);
      setStep(0);
      return;
    }

    fade.setValue(0);
    setSource(primarySource);
    setStep(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [animateOnChange, fade, primarySource]);

  return (
    <Animated.Image
      source={source}
      style={[style, animateOnChange && { opacity: fade }]}
      onError={() => {
        if (step === 0 && secondarySource) {
          setSource(secondarySource);
          setStep(1);
          return;
        }
        setSource(FALLBACK_IMAGE);
        setStep(2);
      }}
    />
  );
}

export { FALLBACK_IMAGE };