"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { githubSignin, getMe } from "./api";

interface AuthContextValue {
  token: string;
  email: string;
  githubToken: string;
  githubUsername: string;
  githubConnected: boolean;
  setGitHubConnected: (v: boolean) => void;
  authError: string;
  ready: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  token: "", email: "", githubToken: "", githubUsername: "",
  githubConnected: false, setGitHubConnected: () => {}, authError: "", ready: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);

  const email = session?.user?.email ?? "";
  const sessionToken = (session as { token?: string })?.token ?? "";
  const githubToken = (session as { githubToken?: string })?.githubToken ?? "";
  const githubUsername = (session as { githubUsername?: string })?.githubUsername ?? "";

  const [githubConnected, setGitHubConnected] = useState(false);
  const [githubConnectedUsername, setGitHubConnectedUsername] = useState(githubUsername);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (status === "loading") return;

    async function resolve() {
      let resolvedToken = "";

      if (sessionToken) {
        resolvedToken = sessionToken;
      } else if (email) {
        try {
          const data = await githubSignin(email);
          resolvedToken = data.token;
        } catch (e: unknown) {
          resolvedToken = "";
          setAuthError(e instanceof Error ? e.message : "Backend auth failed — check Railway is running");
        }
      }

      setToken(resolvedToken);

      if (resolvedToken) {
        try {
          const me = await getMe(resolvedToken);
          setGitHubConnected(me.github_connected);
          setGitHubConnectedUsername(me.github_username ?? "");
        } catch {
          // fall back to session-based detection
          setGitHubConnected(!!githubToken);
          setGitHubConnectedUsername(githubUsername);
        }
      }

      setReady(true);
    }

    resolve();
  }, [status, sessionToken, email]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider value={{ token, email, githubToken, githubUsername: githubConnectedUsername, githubConnected, setGitHubConnected, authError, ready }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
