"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { githubSignin } from "./api";

interface AuthContextValue {
  token: string;
  email: string;
  githubToken: string;
  githubUsername: string;
  ready: boolean; // true once token resolution is complete
}

const AuthContext = createContext<AuthContextValue>({
  token: "", email: "", githubToken: "", githubUsername: "", ready: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);

  const email = session?.user?.email ?? "";
  const sessionToken = (session as { token?: string })?.token ?? "";
  const githubToken = (session as { githubToken?: string })?.githubToken ?? "";
  const githubUsername = (session as { githubUsername?: string })?.githubUsername ?? "";

  useEffect(() => {
    if (status === "loading") return;

    if (sessionToken) {
      // Credentials login — token is already in session
      setToken(sessionToken);
      setReady(true);
      return;
    }

    if (email) {
      // GitHub login — backend token may not be in session, get it now
      githubSignin(email)
        .then((data) => setToken(data.token))
        .catch(() => setToken(""))
        .finally(() => setReady(true));
    } else {
      setReady(true);
    }
  }, [status, sessionToken, email]);

  return (
    <AuthContext.Provider value={{ token, email, githubToken, githubUsername, ready }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
