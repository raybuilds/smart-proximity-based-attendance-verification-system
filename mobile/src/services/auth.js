import AsyncStorage from "@react-native-async-storage/async-storage";

import api from "./api";

const AUTH_TOKEN_KEY = "auth_token";
const AUTH_USER_KEY = "auth_user";

export async function storeAuthSession(token, user) {
  await AsyncStorage.multiSet([
    [AUTH_TOKEN_KEY, token],
    [AUTH_USER_KEY, JSON.stringify(user)],
  ]);
}

export async function loginUser({ email, password }) {
  const response = await api.post("/auth/login", {
    email,
    password,
  });

  const { token, user } = response.data;

  await storeAuthSession(token, user);

  if (__DEV__) {
    console.log('[AUTH] Login success');
    console.log('[AUTH] Token length:', token?.length);
    console.log('[AUTH] Token prefix:', token?.slice(0, 20));
    console.log('[AUTH] Login timestamp:', new Date().toISOString());
  }

  return { token, user };
}

export async function registerUser(registrationData) {
  const response = await api.post("/auth/register", registrationData);

  const { token, user } = response.data;

  await storeAuthSession(token, user);

  return { token, user };
}

export async function getStoredToken() {
  return AsyncStorage.getItem(AUTH_TOKEN_KEY);
}

export async function getStoredUser() {
  const user = await AsyncStorage.getItem(AUTH_USER_KEY);
  return user ? JSON.parse(user) : null;
}

export async function logoutUser() {
  if (__DEV__) {
    console.log('[AUTH] logoutUser - removing keys', AUTH_TOKEN_KEY, AUTH_USER_KEY);
  }
  await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, AUTH_USER_KEY]);
}

export async function getProtectedProfile() {
  const response = await api.get("/protected");
  return response.data;
}

export async function getProfile() {
  const response = await api.get("/auth/profile");
  return response.data;
}

export async function updateTeacherHotspot(data) {
  const response = await api.put("/auth/teacher/hotspot", data);
  return response.data;
}
