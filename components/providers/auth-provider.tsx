"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface AuthState {
  token: string | null;
  role: string | null;
  deviceId: string | null;
  isLoaded: boolean;
}

interface AuthContextValue extends AuthState {
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  token: null,
  role: null,
  deviceId: null,
  isLoaded: false,
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [auth, setAuth] = useState<AuthState>({
    token: null,
    role: null,
    deviceId: null,
    isLoaded: false,
  });

  useEffect(() => {
    const token = localStorage.getItem("bb_token");
    const role = localStorage.getItem("bb_role");
    const deviceId = localStorage.getItem("bb_device_id");

    if (token) {
      // Sync to cookie so Next.js middleware can verify on navigation
      document.cookie = `bb_token=${token}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    }

    setAuth({ token, role, deviceId, isLoaded: true });

    if (!token) {
      router.replace("/register");
    }
  }, [router]);

  const logout = useCallback(() => {
    localStorage.removeItem("bb_token");
    localStorage.removeItem("bb_role");
    localStorage.removeItem("bb_device_id");
    localStorage.removeItem("bb_company_code");
    document.cookie = "bb_token=; path=/; max-age=0";
    router.replace("/register");
  }, [router]);

  return (
    <AuthContext.Provider value={{ ...auth, logout }}>
      {auth.isLoaded ? children : (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
          <div className="w-1 h-1 bg-neutral-600 animate-ping rounded-full" />
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
