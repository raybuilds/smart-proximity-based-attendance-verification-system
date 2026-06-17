import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "https://attendance-system-backend-unu2.onrender.com/api";
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

  if (__DEV__) {
    console.log('[API] request start', config.method, config.url, 'Authorization present:', !!token, 'Token length:', token?.length);
  }

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
