-- Sanity audit script for UsedProximityToken
-- Test 1: Table existence
SELECT table_name FROM information_schema.tables WHERE table_name = 'UsedProximityToken';

-- Test 2: Column verification
SELECT column_name FROM information_schema.columns WHERE table_name = 'UsedProximityToken' ORDER BY ordinal_position;

-- Test 3: Index verification
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'UsedProximityToken' ORDER BY indexname;

-- Test 4: Planner output for pruning
EXPLAIN (ANALYZE, BUFFERS) DELETE FROM "UsedProximityToken" WHERE "expiresAt" < NOW();

-- Test 5: Row count before
SELECT COUNT(*) FROM "UsedProximityToken";

-- Test 5: Perform pruning
DELETE FROM "UsedProximityToken" WHERE "expiresAt" < NOW();

-- Test 5: Row count after
SELECT COUNT(*) FROM "UsedProximityToken";
