SELECT table_name FROM information_schema.tables WHERE table_name = 'UsedProximityToken';
SELECT column_name FROM information_schema.columns WHERE table_name = 'UsedProximityToken' ORDER BY ordinal_position;
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'UsedProximityToken' ORDER BY indexname;
EXPLAIN (ANALYZE, BUFFERS) DELETE FROM "UsedProximityToken" WHERE "expiresAt" < NOW();
SELECT COUNT(*) FROM "UsedProximityToken";
DELETE FROM "UsedProximityToken" WHERE "expiresAt" < NOW();
SELECT COUNT(*) FROM "UsedProximityToken";
