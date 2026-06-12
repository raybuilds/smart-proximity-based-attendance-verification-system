# Token Collision Test Report

- **Audit Run ID**: LOADTEST_20260609_CBY9KF
- **Timestamp**: 2026-06-09T13:45:07.714Z
- **Result**: FAIL

## Metrics
- **Concurrent Requests (N)**: 20
- **Successes**: 0 (Expected: exactly 1)
- **Conflicts (409)**: 3 (Expected: exactly 19)
- **Unexpected Responses / Errors**: 17 (Expected: 0)

## Details
Failed: Token collision check failed: Expected exactly 1 success, but got 0

0 !== 1

