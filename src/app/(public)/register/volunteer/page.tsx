import { connection } from "next/server";
import { VolunteerRegisterForm } from "./volunteer-register-form";

export default async function RegisterVolunteerPage() {
  // Read at request time: the var is Sensitive in Vercel, so a value read during the build
  // would be the "[SENSITIVE]" placeholder.
  await connection();
  return <VolunteerRegisterForm whatsappNumber={process.env.WHATSAPP_PHONE_NUMBER ?? ""} />;
}
