"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getUser, validateUser, User } from "../handlers/auth";

export interface UserContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  // Hydrate from reactive key immediately
  const [user, setUser] = useState<User | null>(() => {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("reactiveLoginKey") ? {} as User : null;
});

  // Optional: validate in background if user exists
  useEffect(() => {
    if (user) {
      validateUser().then(updated => {
        setUser(updated);
      });
    }

    // Listen for reactive key changes in other tabs/windows
    const onStorage = (e: StorageEvent) => {
      if (e.key === "reactiveLoginKey") {
        setUser(getUser());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be inside UserProvider");
  return ctx;
};