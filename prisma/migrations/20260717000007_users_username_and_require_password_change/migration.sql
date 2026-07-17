ALTER TABLE "users" RENAME COLUMN "email" TO "username";
ALTER TABLE "users" ADD COLUMN "require_password_change" BOOLEAN NOT NULL DEFAULT false;
