import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

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
      try {
        const [savedToken, savedUser] = await Promise.all([
          getStoredToken(),
          getStoredUser(),
        ]);

        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(savedUser);
        }
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
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
