import axios from "axios";

const API_BASE_URL = "http://10.200.130.104:5000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

export async function testBackendConnection() {
  const response = await api.get("/test");
  return response.data;
}

export default api;
