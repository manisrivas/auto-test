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
      // Credentials sign-in
      if (user && account?.provider === "credentials") {
        token.token = (user as { token?: string }).token;
        token.plan = (user as { plan?: string }).plan ?? "free";
      }

      // GitHub sign-in — create/find backend account and store GitHub token
      if (account?.provider === "github" && account.access_token) {
        token.githubToken = account.access_token;
        token.githubUsername = (profile as { login?: string })?.login ?? "";

        // Auto-create or find their backend account using GitHub email
        const email = token.email ?? (profile as { email?: string })?.email ?? "";
        if (email) {
          try {
            const data = await githubSignin(email);
            token.token = data.token;
            token.plan = data.plan;
          } catch {
            // Non-fatal — dashboard API calls will fail gracefully
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      (session as { token?: string }).token = token.token as string;
      (session as { githubToken?: string }).githubToken = token.githubToken as string;
      (session as { githubUsername?: string }).githubUsername = token.githubUsername as string;
      if (session.user) {
        (session.user as { plan?: string }).plan = token.plan as string;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
