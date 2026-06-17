import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";

import {
  getStoredToken,
  getStoredUser,
  loginUser,
  logoutUser,
  registerUser,
} from "../services/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      if (__DEV__) {
        console.log("[APP] Started at", new Date().toISOString());
        console.log("[AUTH] restoreSession invoked");
      }
      try {
        const [savedToken, savedUser] = await Promise.all([
          getStoredToken(),
          getStoredUser(),
        ]);

        if (__DEV__) {
          console.log("[AUTH] Raw token exists:", !!savedToken);
          console.log("[AUTH] Raw user exists:", !!savedUser);
          console.log("[AUTH] Raw token length:", savedToken?.length);
          console.log("[AUTH] User restored email:", savedUser?.email);
          // JWT expiry inspection
          if (savedToken) {
            try {
              const decoded = jwtDecode(savedToken);
              console.log("[AUTH] JWT exp:", decoded.exp);
              if (decoded.exp) {
                console.log("[AUTH] JWT expires at:", new Date(decoded.exp * 1000).toISOString());
              }
            } catch (err) {
              console.log("[AUTH] Failed to decode JWT", err);
            }
          }
          // Storage keys check
          const keys = await AsyncStorage.getAllKeys();
          console.log("[AUTH] AsyncStorage keys:", keys);
        }

        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(savedUser);
        }
      } finally {
        setIsLoading(false);
        if (__DEV__) {
          console.log("[AUTH] restoreSession complete");
        }
      }
    }

    restoreSession();

    if (__DEV__) {
      const subscription = AppState.addEventListener("change", state => {
        console.log("[APPSTATE]", state);
      });
      return () => subscription.remove();
    }
  }, []);

  async function signIn(credentials) {
    const result = await loginUser(credentials);
    setToken(result.token);
    setUser(result.user);
    return result;
  }

  async function signUp(registrationData) {
    const result = await registerUser(registrationData);
    setToken(result.token);
    setUser(result.user);
    return result;
  }

  async function signOut() {
    await logoutUser();
    setToken(null);
    setUser(null);
  }

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: Boolean(token && user),
      signIn,
      signUp,
      signOut,
    }),
    [isLoading, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
