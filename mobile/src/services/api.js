import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { Platform } from "react-native";
import Constants from "expo-constants";

const getApiBaseUrl = () => {
  // Production environment configuration
  if (!__DEV__) {
    const productionBaseUrl = "https://attendance-system-backend-unu2.onrender.com/api";
    console.log("[API] Running in PRODUCTION mode");
    console.log("[API] Production Base URL:", productionBaseUrl);
    return productionBaseUrl;
  }

  // Development environment configuration
  console.log("[API] Running in DEVELOPMENT mode");

  if (Platform.OS === "web") {
    console.log("[API] Host URI: web");
    console.log("[API] Resolved IP: localhost");
    console.log("[API] Resolved Base URL: http://localhost:5000/api");
    return "http://localhost:5000/api";
  }

  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest?.hostUri ||
    Constants.expoGoConfig?.debuggerHost;

  let resolvedIp = "";
  if (hostUri) {
    resolvedIp = hostUri.split(":")[0];
  } else {
    resolvedIp = Platform.OS === "android" ? "10.0.2.2" : "localhost";
  }

  const resolvedBaseUrl = `http://${resolvedIp}:5000/api`;

  console.log("[API] Host URI:", hostUri || "Not available");
  console.log("[API] Resolved IP:", resolvedIp);
  console.log("[API] Resolved Base URL:", resolvedBaseUrl);

  return resolvedBaseUrl;
};

const API_BASE_URL = getApiBaseUrl();
const AUTH_TOKEN_KEY = "auth_token";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
// Response interceptor to log 401 errors
api.interceptors.response.use(
  response => response,
  error => {
    if (__DEV__) {
      if (error.response && error.response.status === 401) {
        console.log('[API] 401 received', error.config?.url);
      }
    }
    return Promise.reject(error);
  }
);

export async function testBackendConnection() {
  const response = await api.get("/test");
  return response.data;
}

export default api;
