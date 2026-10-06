/**
 * Utility functions for GIM Swimming Frontend
 */

/**
 * Format phone number into WhatsApp compatible international format (E.164 without leading +).
 * For Indonesia (+62): '08123456789' -> '628123456789'
 */
export function formatWaNumber(phone?: string): string {
  if (!phone) return "";
  let digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  
  if (digits.startsWith("0")) {
    digits = "62" + digits.slice(1);
  } else if (digits.startsWith("8")) {
    digits = "62" + digits;
  }
  
  return digits;
}
