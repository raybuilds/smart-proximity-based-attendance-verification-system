// Mocks React Native Platform and expo-constants to inspect dynamic resolution
const PlatformWeb = { OS: "web" };
const PlatformAndroidEmulator = { OS: "android" };
const PlatformAndroidDevice = { OS: "android" };
const PlatformIosSimulator = { OS: "ios" };
const PlatformIosDevice = { OS: "ios" };

const ConstantsEmulator = { isDevice: false };
const ConstantsDevice = { isDevice: true };

const HOST_IP = "10.50.9.104";

const getApiBaseUrl = (Platform, Constants) => {
  if (Platform.OS === "web") {
    return "http://localhost:5000/api";
  }
  
  if (Platform.OS === "android") {
    if (Constants.isDevice) {
      return `http://${HOST_IP}:5000/api`;
    }
    return "http://10.0.2.2:5000/api";
  }
  
  if (Platform.OS === "ios") {
    if (Constants.isDevice) {
      return `http://${HOST_IP}:5000/api`;
    }
    return "http://localhost:5000/api";
  }
  
  return "http://localhost:5000/api";
};

console.log("=== API BASE URL RESOLUTIONS ===");
console.log("Web (Playwright / Browser):", getApiBaseUrl(PlatformWeb, ConstantsDevice));
console.log("Android Emulator:", getApiBaseUrl(PlatformAndroidEmulator, ConstantsEmulator));
console.log("Android Physical Device (using Constants.isDevice):", getApiBaseUrl(PlatformAndroidDevice, ConstantsDevice));
console.log("iOS Simulator:", getApiBaseUrl(PlatformIosSimulator, ConstantsEmulator));
console.log("iOS Physical Device (using Constants.isDevice):", getApiBaseUrl(PlatformIosDevice, ConstantsDevice));

// Now, what happens if Constants.isDevice is undefined at runtime?
const ConstantsUndefined = { isDevice: undefined };
console.log("\n=== WHEN Constants.isDevice IS UNDEFINED ===");
console.log("Android Physical Device (isDevice undefined):", getApiBaseUrl(PlatformAndroidDevice, ConstantsUndefined));
console.log("iOS Physical Device (isDevice undefined):", getApiBaseUrl(PlatformIosDevice, ConstantsUndefined));
