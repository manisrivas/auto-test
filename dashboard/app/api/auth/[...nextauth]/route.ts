import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import { login, githubSignin } from "@/lib/api";

const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
      authorization: { params: { scope: "read:user repo" } },
    }),
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        try {
          const data = await login(credentials.email, credentials.password);
          return { id: data.token, email: data.email, plan: data.plan, token: data.token };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // Credentials sign-in — store backend JWT directly
      if (user && account?.provider === "credentials") {
        token.token = (user as { token?: string }).token;
        token.plan = (user as { plan?: string }).plan ?? "free";
      }

      // GitHub sign-in — capture GitHub token and username
      if (account?.provider === "github" && account.access_token) {
        token.githubToken = account.access_token;
        token.githubUsername = (profile as { login?: string })?.login ?? "";
        // Store email from GitHub profile so we can use it later
        const ghEmail = (profile as { email?: string })?.email;
        if (ghEmail) token.email = ghEmail;
      }

      // Always ensure backend token exists — retry every time if missing
      // This covers: initial GitHub sign-in failure, session refresh, etc.
      if (!token.token && token.email) {
        try {
          const data = await githubSignin(String(token.email));
          token.token = data.token;
          token.plan = data.plan;
        } catch {
          // Backend unreachable — will retry on next request
        }
      }

      return token;
    },
    async session({ session, token }) {
      (session as { token?: string }).token = token.token as string | undefined;
      (session as { githubToken?: string }).githubToken = token.githubToken as string | undefined;
      (session as { githubUsername?: string }).githubUsername = token.githubUsername as string | undefined;
      if (session.user) {
        (session.user as { plan?: string }).plan = (token.plan as string) ?? "free";
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
