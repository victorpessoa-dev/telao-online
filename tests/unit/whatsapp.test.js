import { describe, expect, it } from "vitest";
import {
  formatWhatsAppNumber,
  getWhatsAppUrl,
  normalizeWhatsAppNumber,
} from "@/lib/utils/whatsapp";

describe("WhatsApp contact formatting", () => {
  it("formats a Brazilian number with country code", () => {
    expect(formatWhatsAppNumber("5587991068478")).toBe(
      "+55 (87) 99106-8478",
    );
  });

  it("accepts legacy wa.me links but keeps only the contact in the input", () => {
    expect(formatWhatsAppNumber("https://wa.me/5587991068478")).toBe(
      "+55 (87) 99106-8478",
    );
  });

  it("saves the normalized contact as a wa.me URL", () => {
    expect(normalizeWhatsAppNumber("+55 (87) 99106-8478")).toBe(
      "5587991068478",
    );
    expect(getWhatsAppUrl("+55 (87) 99106-8478")).toBe(
      "https://wa.me/5587991068478",
    );
  });
});
