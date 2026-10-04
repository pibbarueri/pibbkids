export const DEFAULT_SNACK_MIN_QUANTITY = 5;
export const MAX_SNACK_MIN_QUANTITY = 50;

/** 0 turns the low-stock warning off for that snack. */
export function isLowStock(snack: { quantity: number; minQuantity: number }) {
  return snack.minQuantity > 0 && snack.quantity <= snack.minQuantity;
}

/**
 * Shared by the snack form and the snack API routes. Returns an error message, or null
 * when valid.
 */
export function validateMinQuantity(minQuantity: number): string | null {
  if (!Number.isInteger(minQuantity) || minQuantity < 0 || minQuantity > MAX_SNACK_MIN_QUANTITY) {
    return `Informe um número entre 0 e ${MAX_SNACK_MIN_QUANTITY}.`;
  }
  return null;
}
