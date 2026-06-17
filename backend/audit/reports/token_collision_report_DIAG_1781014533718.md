# Token Collision Test Report

- **Audit Run ID**: DIAG_1781014533718
- **Timestamp**: 2026-06-09T14:15:37.775Z
- **Result**: PASS

## Metrics
- **Concurrent Requests (N)**: 20
- **Successes**: 1 (Expected: exactly 1)
- **Conflicts (409)**: 19 (Expected: exactly 19)
- **Unexpected Responses / Errors**: 0 (Expected: 0)

## Details
Passed: Successfully verified concurrency. Exactly 1 success, 19 conflicts, and 0 unexpected responses. DB Verified: Exactly 1 attendance row exists in database (no duplicates).
