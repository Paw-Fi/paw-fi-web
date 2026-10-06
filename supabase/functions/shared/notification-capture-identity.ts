/** Compare AI-extracted identities without interpreting or deleting words. */
export function normalizeNotificationCounterparty(value: string): string {
  let result = "";
  let spacePending = false;
  for (const character of value.normalize("NFKC").toLowerCase().trim()) {
    if (character.trim() === "") {
      spacePending = result.length > 0;
    } else {
      if (spacePending) result += " ";
      result += character;
      spacePending = false;
    }
  }
  return result;
}
