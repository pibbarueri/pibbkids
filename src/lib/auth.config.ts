import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.username = user.username;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as typeof session.user.role;
        session.user.username = token.username as string;
        session.user.id = token.sub!;
      }
      return session;
    },
  },
};
