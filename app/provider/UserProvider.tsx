"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { validateUser, User } from "../handlers/auth";

export interface UserContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  resolved: boolean;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    validateUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setResolved(true));
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