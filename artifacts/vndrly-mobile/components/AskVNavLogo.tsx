import React from "react";
import { Image, type ImageStyle, type StyleProp } from "react-native";

import { useBrand } from "@/hooks/use-brand";
import { pickAskVLogo, pickAskVLogoIdle } from "@/lib/pick-askv-logo";

type Props = {
  active: boolean;
  size?: number;
  style?: StyleProp<ImageStyle>;
  testID?: string;
};

export default function AskVNavLogo({
  active,
  size = 34,
  style,
  testID,
}: Props) {
  const brand = useBrand();
  return (
    <Image
      accessibilityIgnoresInvertColors
      resizeMode="contain"
      source={
        active ? pickAskVLogo(brand.primary, brand.name) : pickAskVLogoIdle()
      }
      style={[{ width: size, height: size / 2 }, style]}
      testID={testID}
    />
  );
}
