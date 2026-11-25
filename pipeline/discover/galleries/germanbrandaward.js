// The German Brand Award (german-brand-award.com), the German Design Council's
// competition for brand management and communication, judged by an expert
// jury. Its "Brand Communication – Web & Mobile" category names 10 to 20
// Winners and Golds a year, mostly brand and corporate sites from the German-
// speaking countries: Martor, LGT Private Banking, Allplan, Kleinwalsertal,
// Zell am See-Kaprun, INNIO, Globetrotter, experimenta, Craft Docs. It runs on
// the same gallery as the German Design Award (designcouncil.js); an entry
// whose customer and designer are one company is kept only when its title
// names that company (a brand's in-house site), which skips agencies' portals
// and cockpits entered under their own name.
import { councilListing } from "./designcouncil.js";

export const name = "germanbrandaward";

export const listing = councilListing(name, {
  base: "https://www.german-brand-award.com",
  award: "GBA",
  mainCategory: "Excellence in Brand Strategy and Creation",
  subCategory: "Brand Communication – Web & Mobile",
});
