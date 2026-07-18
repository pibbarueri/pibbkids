// Phone is UI-masked but stored as digits only.

export function phoneDigits(value: string): string {
  return (value ?? "").replace(/\D/g, "").slice(0, 11)
}

// Format Brazilian phone: (11) 91234-5678 (11 digits) or (11) 1234-5678 (10 digits).
export function formatPhone(value: string): string {
  const d = phoneDigits(value)
  if (d.length === 0) return ""
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}
