import { resolveSeo } from "../utils/seoConfig";

test("destination metadata identifies the actual destination and canonical URL", () => {
  const seo = resolveSeo("/destinasi/jawa/malioboro");
  expect(seo.title).toContain("Jalan Malioboro");
  expect(seo.description).toContain("Yogyakarta");
  expect(seo.canonical).toBe("https://www.cakra57.com/destinasi/jawa/malioboro");
  expect(seo.robots).toBe("index, follow");
});

test("regional landing pages have distinct metadata and retain their own canonical URLs", () => {
  const jawa = resolveSeo("/destinasi/jawa");
  const bali = resolveSeo("/destinasi/bali");
  expect(jawa.title).toContain("Jawa");
  expect(bali.title).toContain("Bali");
  expect(jawa.title).not.toBe(bali.title);
  expect(jawa.canonical).toBe("https://www.cakra57.com/destinasi/jawa");
  expect(resolveSeo("/discovery/indonesia").title).toContain("Indonesia");
});

test("account pages are not indexed while the trip planner remains indexable", () => {
  expect(resolveSeo("/login").robots).toBe("noindex, follow");
  expect(resolveSeo("/signup").robots).toBe("noindex, follow");
  expect(resolveSeo("/trip-planner").robots).toBe("index, follow");
});
