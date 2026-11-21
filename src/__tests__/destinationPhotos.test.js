import fs from "fs";
import path from "path";
import photos from "../data/destinationPhotos.json";
import { destinationSpots } from "../data/destinationSpots";

it("provides a local, licensed photo for each destination beyond the original Bromo guide", () => {
  expect(Object.keys(photos).sort()).toEqual(destinationSpots.filter((s) => s.slug !== "gunung-bromo").map((s) => s.slug).sort());
  for (const [slug, photo] of Object.entries(photos)) {
    expect(photo.src).toBe(`/images/destinations/${slug}.webp`);
    const bytes = fs.readFileSync(path.join(process.cwd(), "public", photo.src));
    expect(bytes.toString("ascii", 0, 4)).toBe("RIFF");
    expect(bytes.toString("ascii", 8, 12)).toBe("WEBP");
    expect(photo.author.trim().length).toBeGreaterThan(0);
    expect(photo.sourceUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    expect(photo.license).toMatch(/^(CC BY(?:-SA)? (?:2\.0|3\.0|4\.0)|CC0)$/);
    expect(photo.licenseUrl).toMatch(/^https?:\/\/creativecommons\.org\//);
    expect(photo.changes).toBeTruthy();
  }
});
