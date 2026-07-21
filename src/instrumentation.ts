// Pins the process timezone so date-only fields (schedule, birthdates, attendance)
// compare consistently regardless of host TZ — local dev inherits America/Sao_Paulo
// from the OS, but deploy platforms (Vercel) default to UTC unless set explicitly.
export function register() {
  process.env.TZ = "America/Sao_Paulo";
}
