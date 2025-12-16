"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getUser, validateUser, User } from "../handlers/auth";

export interface UserContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  resolved: boolean;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [resolved, setResolved] = useState(false);
  // Hydrate from reactive key immediately
  const [user, setUser] = useState<User | null>(() => {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("reactiveLoginKey") ? {} as User : null;
});

  // Optional: validate in background if user exists
  useEffect(() => {
    const run = async () => {
      if (user) {
        const updated = await validateUser();
        setUser(updated);
      }
      setResolved(true);
    };

    run();

    const onStorage = (e: StorageEvent) => {
      if (e.key === "reactiveLoginKey") {
        setUser(getUser());
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, resolved }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be inside UserProvider");
  return ctx;
};