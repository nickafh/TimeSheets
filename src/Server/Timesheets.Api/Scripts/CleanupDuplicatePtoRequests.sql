-- =====================================================
-- AFH TimeSheets - Cleanup Duplicate PTO Requests
-- =====================================================
-- Purpose: Remove duplicate PTO requests so there is only one record
--          per user per date (UserId + DateOfLeave).
--          Keeps the row with the lowest Id when duplicates exist.
-- Date: 2026-02-11
--
-- Usage:
--   1. Run all steps to analyze and preview before deleting.
--   2. Optionally wrap STEP 3 in a transaction:
--        START TRANSACTION;
--        DELETE p1 FROM PtoRequests p1 ... ;
--        -- Verify: SELECT COUNT(*) FROM PtoRequests; ... 
--        COMMIT;   -- or ROLLBACK; to undo
-- =====================================================

USE afh_timesheets;

-- Prevent query timeout when processing large tables
SET SESSION max_execution_time = 0;
SET SESSION net_read_timeout = 3600;
SET SESSION net_write_timeout = 3600;

-- =====================================================
-- STEP 1: Analyze Current State
-- =====================================================

SELECT '=== CURRENT STATE ANALYSIS ===' as Step;

-- Count total vs unique (UserId, DateOfLeave) combinations
SELECT
    COUNT(*) as total_pto_requests,
    COUNT(DISTINCT CONCAT(UserId, '-', DATE(DateOfLeave))) as unique_user_date_combos,
    COUNT(*) - COUNT(DISTINCT CONCAT(UserId, '-', DATE(DateOfLeave))) as duplicates_to_remove
FROM PtoRequests;

-- Show duplicates (UserId + DateOfLeave with more than one row)
SELECT
    UserId,
    DATE(DateOfLeave) as DateOfLeave,
    COUNT(*) as duplicate_count,
    GROUP_CONCAT(Id ORDER BY Id) as pto_ids
FROM PtoRequests
GROUP BY UserId, DATE(DateOfLeave)
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 20;

-- =====================================================
-- STEP 2: Count records to be deleted (fast preview)
-- =====================================================

SELECT '=== RECORDS TO BE DELETED (keeping lowest Id per UserId+DateOfLeave) ===' as Step;

SELECT COUNT(*) as rows_to_delete
FROM PtoRequests p1
INNER JOIN PtoRequests p2
    ON p1.UserId = p2.UserId
   AND DATE(p1.DateOfLeave) = DATE(p2.DateOfLeave)
   AND p1.Id > p2.Id;

-- =====================================================
-- STEP 3: Delete Duplicates
-- =====================================================
-- Keeps the row with the lowest Id for each (UserId, DateOfLeave).
-- Run this when ready to apply the cleanup.

SELECT '=== DELETING DUPLICATE PTO REQUESTS ===' as Step;

DELETE p1 FROM PtoRequests p1
INNER JOIN PtoRequests p2
    ON p1.UserId = p2.UserId
   AND DATE(p1.DateOfLeave) = DATE(p2.DateOfLeave)
   AND p1.Id > p2.Id;

SELECT ROW_COUNT() as duplicate_rows_deleted;

-- =====================================================
-- STEP 4: Verify Final State
-- =====================================================

SELECT '=== FINAL STATE VERIFICATION ===' as Step;

-- Verify no duplicates remain
SELECT
    COUNT(*) as total_pto_requests,
    COUNT(DISTINCT CONCAT(UserId, '-', DATE(DateOfLeave))) as unique_user_date_combos,
    COUNT(*) - COUNT(DISTINCT CONCAT(UserId, '-', DATE(DateOfLeave))) as remaining_duplicates
FROM PtoRequests;

-- Show any remaining duplicates (should be 0)
SELECT
    UserId,
    DATE(DateOfLeave) as DateOfLeave,
    COUNT(*) as count,
    GROUP_CONCAT(Id ORDER BY Id) as ids
FROM PtoRequests
GROUP BY UserId, DATE(DateOfLeave)
HAVING COUNT(*) > 1;

SELECT '=== CLEANUP COMPLETE ===' as Status;
