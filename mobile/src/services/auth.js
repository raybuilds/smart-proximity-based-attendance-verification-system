import AsyncStorage from "@react-native-async-storage/async-storage";

import api from "./api";

const AUTH_TOKEN_KEY = "auth_token";
const AUTH_USER_KEY = "auth_user";

export async function loginUser({ email, password }) {
  const response = await api.post("/auth/login", {
    email,
    password,
  });

  const { token, user } = response.data;

  await AsyncStorage.multiSet([
    [AUTH_TOKEN_KEY, token],
    [AUTH_USER_KEY, JSON.stringify(user)],
  ]);

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
  await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, AUTH_USER_KEY]);
}

export async function getProtectedProfile() {
  const response = await api.get("/protected");
  return response.data;
}
