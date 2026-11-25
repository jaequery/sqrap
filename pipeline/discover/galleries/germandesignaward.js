// The German Design Award (german-design-award.com), the German Design
// Council's international competition, judged by an expert jury since 2012.
// Its Web category (under Excellent Communications Design) names a few dozen
// Winners and Golds a year: corporate sites, museums, foundations, tourism
// boards, online stores and studios' own sites (Woodeco, the OECD's Western
// Balkans data hub, CIBC's thought leadership portal, Max-Planck-Förderstiftung,
// Soda Studios). How the gallery is read: designcouncil.js.
import { councilListing } from "./designcouncil.js";

export const name = "germandesignaward";

export const listing = councilListing(name, {
  base: "https://www.german-design-award.com",
  award: "GDA",
  mainCategory: "Excellent Communications Design",
  subCategory: "Web",
  ownSiteHint: "Agency & Portfolio",
});
