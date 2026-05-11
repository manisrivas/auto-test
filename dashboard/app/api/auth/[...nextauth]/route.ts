import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import { login, githubSignin } from "@/lib/api";

async function getGitHubPrimaryEmail(accessToken: string): Promise<string> {
  try {
    const res = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    });
    const emails: { email: string; primary: boolean; verified: boolean }[] = await res.json();
    const primary = emails.find((e) => e.primary && e.verified);
    return primary?.email ?? emails[0]?.email ?? "";
  } catch {
    return "";
  }
}

const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
      authorization: { params: { scope: "read:user user:email repo" } },
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

      // GitHub sign-in
      if (account?.provider === "github" && account.access_token) {
        token.githubToken = account.access_token;
        token.githubUsername = (profile as { login?: string })?.login ?? "";

        // Get email — profile.email is null for users with private emails
        let email = (profile as { email?: string | null })?.email ?? "";
        if (!email && account.access_token) {
          email = await getGitHubPrimaryEmail(account.access_token);
        }
        if (email) token.email = email;
      }

      // Ensure backend token exists — retry every JWT refresh until obtained
      if (!token.token && token.email) {
        try {
          const data = await githubSignin(String(token.email));
          token.token = data.token;
          token.plan = data.plan;
        } catch {
          // Will retry next request
        }
      }

      return token;
    },
    async session({ session, token }) {
      (session as { token?: string }).token = token.token as string | undefined;
      (session as { githubToken?: string }).githubToken = token.githubToken as string | undefined;
      (session as { githubUsername?: string }).githubUsername = token.githubUsername as string | undefined;
      // Make sure session.user.email reflects the GitHub email we fetched
      if (token.email && session.user) {
        session.user.email = token.email as string;
      }
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
