// Company fetchers for the accelerators in lib/taxonomy.js ACCELERATORS (YC
// has its own, pipeline/yc.js). Each module exports:
//   name                    the ACCELERATORS id
//   hasCohortYears          false when the program publishes no cohort years
//   roster({ years })       the program's companies from its directory, cheap:
//                           { name, website?, batch, year, companyUrl, oneLiner?, industryHint? }[]
//                           (`years`, when given, keeps only those cohort years)
//   details(row)            the row with `website` (and whatever else the
//                           company's page adds) filled in; may fetch that page
//   companies({ years })    roster, then details for each row: every cohort
//                           when `years` is not given
// `batch` is the program's own cohort label, `year` the cohort year or null,
// `companyUrl` the company on the accelerator's site and `industryHint` the
// program's own industry labels (an array; map them with
// pipeline/discover/industry.js). Only the company's website is returned for
// capture, never an image of the company.
import * as techstars from "./techstars.js";
import * as finc from "./finc.js";
import * as speedrun from "./speedrun.js";

export const PROGRAMS = [techstars, finc, speedrun];
