"use client"
import React, { createContext, useContext } from "react";
import { useUser } from "@/components/user-nav";

const UserContext = createContext<{ username: string | null }>({ username: null });

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const { username } = useUser();
  return (
    <UserContext.Provider value={{ username }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => useContext(UserContext); 