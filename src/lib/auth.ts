import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import { createSession, isSessionValid } from "@/lib/session";

class InactiveUserError extends CredentialsSignin {
  code = "inactive";
}

class FirstAccessError extends CredentialsSignin {
  code = "first-access";
}

const {
  handlers,
  signIn,
  signOut,
  auth: nextAuth,
} = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: { label: "Usuário", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { username: credentials.username as string },
        });

        if (!user || !user.username) return null;
        if (!user.active) throw new InactiveUserError();
        // No password yet means the volunteer hasn't done first access.
        if (!user.password) throw new FirstAccessError();

        const valid = await bcrypt.compare(credentials.password as string, user.password);
        if (!valid) return null;

        const sessionToken = await createSession(user.id);
        return { id: user.id, name: user.name, username: user.username, role: user.role, sessionToken };
      },
    }),
  ],
});

// Wrap auth() so every server component / route re-validates the DB session row.
// This is what makes logout (and expiry) actually revoke access, since the JWT
// itself is self-contained. Middleware stays on the plain JWT check (edge-safe).
async function auth() {
  const session = await nextAuth();
  if (!session) return null;
  if (!session.sessionToken || !(await isSessionValid(session.sessionToken))) return null;
  return session;
}

export { handlers, signIn, signOut, auth };
