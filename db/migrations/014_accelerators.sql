-- Accelerator programs per site (lib/taxonomy.js ACCELERATORS: yc, techstars,
-- finc, speedrun), for the badges, the accel=<program> browse filter and the
-- agent catalog and API. One row per site and program, filled by matching each
-- program's company websites against sites.domain (pipeline/accelerators/sync.js,
-- daily from the cron and `npm run accelerators:sync`). `batch` is the
-- program's short cohort label ("W26", "2025", "SR007") or null; `url` is the
-- company's page on the program's site.
--
-- Additive: sites.yc_batch and yc_url stay (the code before this one reads
-- them, and the YC sync keeps writing them so a rollback still works); a later
-- migration drops them.
CREATE TABLE site_accelerators (
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  program TEXT NOT NULL,
  batch   TEXT,
  url     TEXT,
  PRIMARY KEY (site_id, program)
);

CREATE INDEX site_accelerators_program ON site_accelerators(program);

INSERT INTO site_accelerators (site_id, program, batch, url)
SELECT id, 'yc', yc_batch, yc_url FROM sites WHERE yc_batch IS NOT NULL
ON CONFLICT (site_id, program) DO NOTHING;

-- The website behind each company page the sync has read. Programs that list
-- websites only on per-company pages (Founders Inc, a16z speedrun) take one
-- throttled request per company, minutes per program, so the sync keeps what
-- it found here and resumes across cron runs instead of starting over.
-- `website` is null when the page had none; `checked_at` (ISO 8601) dates the read.
CREATE TABLE accelerator_companies (
  program     TEXT NOT NULL,
  company_url TEXT NOT NULL,
  website     TEXT,
  checked_at  TEXT NOT NULL,
  PRIMARY KEY (program, company_url)
);
