import React, { createContext, useContext, useEffect, useState } from "react";
import {
  loginWithCredentials,
  fetchCurrentUser,
  setStoredToken,
  clearStoredToken,
  getStoredToken,
} from "../api";

type UserRole = "Employee" | "Manager" | "Admin";

interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  payType: string;
  exemptionStatus: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    fetchCurrentUser()
      .then((u) => setUser({ ...u, role: u.role as UserRole }))
      .catch(() => clearStoredToken())
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await loginWithCredentials(email, password);
    setStoredToken(res.token);
    setUser({ ...res.user, role: res.user.role as UserRole });
  };

  const logout = () => {
    clearStoredToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};
