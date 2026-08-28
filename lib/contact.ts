export function toWhatsAppNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;

  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) {
    digits = `92${digits.slice(1)}`;
  }
  return digits;
}

export function whatsappUrl(raw: string | null | undefined, text?: string): string | null {
  const number = toWhatsAppNumber(raw);
  if (!number) return null;
  const encoded = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${number}${encoded}`;
}

export function telUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d+]/g, "");
  return cleaned ? `tel:${cleaned}` : null;
}

export function mailtoUrl(email: string | null | undefined, subject?: string): string | null {
  if (!email) return null;
  const query = subject ? `?subject=${encodeURIComponent(subject)}` : "";
  return `mailto:${email}${query}`;
}
