export function stripEvidencePrefix(text: string): string {
  return text.replace(/^[✓✗]\s*/, "");
}

export function isPositiveEvidence(text: string): boolean {
  return text.startsWith("✓");
}

export function isNegativeEvidence(text: string): boolean {
  return text.startsWith("✗");
}
