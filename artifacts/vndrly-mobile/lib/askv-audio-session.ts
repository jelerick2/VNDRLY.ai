import { Audio } from "expo-av";
import { AppState, type NativeEventSubscription } from "react-native";

export async function configureAskVAudioSession(): Promise<void> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    interruptionModeIOS: 1,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
}

export async function releaseAskVAudioSession(): Promise<void> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
  });
}

export function subscribeAskVAppState(
  onActive: () => void,
  onBackground: () => void,
): NativeEventSubscription {
  return AppState.addEventListener("change", (status) => {
    if (status === "active") onActive();
    else onBackground();
  });
}
