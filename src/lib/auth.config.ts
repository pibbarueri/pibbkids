import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.username = user.username;
        token.sessionToken = user.sessionToken;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sessionToken) session.sessionToken = token.sessionToken as string;
      if (session.user) {
        session.user.role = token.role as typeof session.user.role;
        session.user.username = token.username as string;
        session.user.id = token.sub!;
      }
      return session;
    },
  },
};
