import { describe, expect, it } from "vitest";
import { extractLinks, webHref } from "./links";

describe("webHref", () => {
  it("adds https to bare domains and keeps full links", () => {
    expect(webHref("barclays.com")).toBe("https://barclays.com");
    expect(webHref("www.yelp.com/biz/barclays")).toBe("https://www.yelp.com/biz/barclays");
    expect(webHref(" http://a.co ")).toBe("http://a.co");
  });
  it("rejects unsafe or non-link text", () => {
    for (const v of ["javascript:alert(1)", "file:///etc/passwd", "ftp://a.com", "Yelp page", "", null, undefined, "nodot"]) expect(webHref(v)).toBeNull();
  });
});

describe("extractLinks", () => {
  it("finds links in free text and skips handles and duplicates", () => {
    const r = extractLinks("IG: instagram.com/barclays, (https://facebook.com/barclays). @barclays instagram.com/barclays");
    expect(r.map((l) => l.href)).toEqual(["https://instagram.com/barclays", "https://facebook.com/barclays"]);
  });
});
