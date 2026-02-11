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
-- STEP 2: Preview Records to be Deleted
-- =====================================================

SELECT '=== RECORDS TO BE DELETED (keeping lowest Id per UserId+DateOfLeave) ===' as Step;

-- Show which rows will be kept (lowest Id) vs deleted
SELECT
    p.Id,
    p.UserId,
    p.DateOfLeave,
    p.EndDate,
    p.Hours,
    p.Status,
    p.RequestedAt,
    CASE WHEN p.Id = (
        SELECT MIN(p2.Id)
        FROM PtoRequests p2
        WHERE p2.UserId = p.UserId
          AND DATE(p2.DateOfLeave) = DATE(p.DateOfLeave)
    ) THEN 'KEEP' ELSE 'DELETE' END as action
FROM PtoRequests p
WHERE EXISTS (
    SELECT 1
    FROM PtoRequests p2
    WHERE p2.UserId = p.UserId
      AND DATE(p2.DateOfLeave) = DATE(p.DateOfLeave)
      AND p2.Id < p.Id
)
ORDER BY p.UserId, p.DateOfLeave, p.Id;

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
