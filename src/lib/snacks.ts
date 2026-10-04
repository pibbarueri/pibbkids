export const DEFAULT_SNACK_MIN_QUANTITY = 5;

/**
 * Shared by the snack form and the snack API routes. The threshold can't exceed the stock
 * being saved, otherwise the item would be flagged as low the moment it's created.
 * Returns an error message, or null when valid.
 */
export function validateMinQuantity(minQuantity: number, quantity: number): string | null {
  if (!Number.isInteger(minQuantity) || minQuantity < 0) {
    return "Informe um número inteiro a partir de 0.";
  }
  if (minQuantity > quantity) {
    return "Não pode ser maior que a quantidade em estoque.";
  }
  return null;
}
