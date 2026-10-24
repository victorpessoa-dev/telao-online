import { describe, expect, it } from "vitest";
import {
  columnName,
  escapeXml,
  sanitizeSheetName,
} from "@/lib/export/simple-xlsx";

describe("simple xlsx helpers", () => {
  it("escapes XML special characters", () => {
    expect(escapeXml('A&B <C> "D"')).toBe("A&amp;B &lt;C&gt; &quot;D&quot;");
  });

  it("removes invalid XML control characters", () => {
    expect(escapeXml("A\u0001B\u000cC")).toBe("ABC");
  });

  it("formats spreadsheet column names", () => {
    expect(columnName(0)).toBe("A");
    expect(columnName(25)).toBe("Z");
    expect(columnName(26)).toBe("AA");
  });

  it("sanitizes worksheet names for Excel", () => {
    const sanitized = sanitizeSheetName("Relatório: público / completo * 2026");
    expect(sanitized).not.toMatch(/[:\\/?*\[\]]/);
    expect(sanitized.length).toBeLessThanOrEqual(31);
    expect(sanitizeSheetName("")).toBe("Planilha");
  });
});
