import { describe, expect, it } from "vitest";
import {
  buildSecurityRuleErrorMessage,
  normalizeCustomSecurityRule,
} from "./security-rule.js";

describe("security rule helpers", () => {
  it("normalizes object input into JSON string for CUSTOM rules", () => {
    expect(
      normalizeCustomSecurityRule("function", {
        "*": {
          invoke: true,
        },
      }),
    ).toBe('{"*":{"invoke":true}}');
  });

  it("rejects bare string values with a readable hint", () => {
    expect(() => normalizeCustomSecurityRule("function", "true")).toThrow(
      /JSON 对象/,
    );
  });

  it("wraps backend failures with a format hint", () => {
    const message = buildSecurityRuleErrorMessage(
      "writeSecurityRule",
      "function",
      "CUSTOM",
      new Error("[ModifySecurityRule] [INVALID_VALUE] 错误的值 start: 1"),
    );

    expect(message).toContain("writeSecurityRule");
    expect(message).toContain("JSON 对象");
    expect(message).toContain("invoke");
  });
});
