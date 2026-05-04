import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { saveAuth, getAuth, deleteAuth, StoredAuth } from '../services/authStorage';

type User = { email: string } | null;

type AuthContextType = {
  user: User;
  token: string | null;
  signIn: (user: User, token: string) => Promise<void> | void;
  signOut: () => Promise<void> | void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  signIn: () => {},
  signOut: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const stored: StoredAuth | null = await getAuth();
      if (stored) {
        setUser(stored.user);
        setToken(stored.token);
      }
    })();
  }, []);

  const signIn = async (u: User, t: string) => {
    setUser(u);
    setToken(t);
    await saveAuth({ user: u, token: t });
  };

  const signOut = async () => {
    setUser(null);
    setToken(null);
    await deleteAuth();
  };

  return <AuthContext.Provider value={{ user, token, signIn, signOut }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
