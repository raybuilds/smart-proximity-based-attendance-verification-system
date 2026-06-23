import Constants from "expo-constants";
import { Platform } from "react-native";

// Determine if BLE is usable (not in Expo Go, and not on Web)
const canUseBle = Platform.OS !== "web" && Constants.appOwnership !== "expo";


let BleManagerClass = null;
if (canUseBle) {
  try {
    const { BleManager } = require("react-native-ble-plx");
    BleManagerClass = BleManager;
  } catch (e) {
    if (__DEV__) console.warn("BleManager not available:", e);
  }
}

let instance = null;

export function getBleManager() {
  if (!instance && canUseBle && BleManagerClass) {
    try {
      instance = new BleManagerClass();
    } catch (e) {
      if (__DEV__) console.warn("Failed to initialize BleManager:", e);
    }
  }
  return instance;
}