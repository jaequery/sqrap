-- Y Combinator batch per site, for the "YC W26" badge, the yc=1 browse filter
-- and the agent catalog and API. Filled by matching each YC company's website
-- domain against sites.domain (pipeline/yc.js, daily from the cron and
-- `npm run yc:sync`). Both null for a site that is not a YC company.
-- yc_batch is the short label ("W26", "X25", "S24", "F25"); yc_url is the
-- company's ycombinator.com page. Additive, so the code before it still runs.
ALTER TABLE sites ADD COLUMN yc_batch TEXT, ADD COLUMN yc_url TEXT;

CREATE INDEX sites_yc ON sites(yc_batch) WHERE yc_batch IS NOT NULL;
