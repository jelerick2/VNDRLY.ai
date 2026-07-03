import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const STORAGE_PREFIX = "askv:text-only";
const memoryStore: Record<string, string> = {};

export function askvTextOnlyKey(userId: number): string {
  return `${STORAGE_PREFIX}:${userId}`;
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") return memoryStore[key] ?? null;
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    memoryStore[key] = value;
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function removeItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    delete memoryStore[key];
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function readAskVTextOnly(userId: number): Promise<boolean> {
  return (await getItem(askvTextOnlyKey(userId))) === "1";
}

export async function writeAskVTextOnly(userId: number, enabled: boolean): Promise<void> {
  if (enabled) await setItem(askvTextOnlyKey(userId), "1");
  else await removeItem(askvTextOnlyKey(userId));
}
