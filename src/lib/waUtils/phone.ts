export function normalizeAndValidate(phone: string | null | undefined): string | null {
  if (!phone) return null;

  let cleanPhone = phone.replace(/\D/g, "");

  // Convert strictly to '08...' format as demanded by the user
  if (cleanPhone.startsWith("628")) {
    cleanPhone = "0" + cleanPhone.substring(2);
  } else if (cleanPhone.startsWith("8")) {
    cleanPhone = "0" + cleanPhone;
  } else if (cleanPhone.startsWith("62")) {
    cleanPhone = "0" + cleanPhone.substring(2);
  } else if (!cleanPhone.startsWith("08")) {
    // If it is a WAHA system Linked Device ID (like 1005...) or foreign number,
    // explicitly prepend 08 to satisfy the dashboard formatting request 
    // without dropping the valid customer chat.
    cleanPhone = "08" + cleanPhone;
  }

  // Prevent completely empty strings after processing
  if (cleanPhone.length < 5) return null;

  return cleanPhone;
}
