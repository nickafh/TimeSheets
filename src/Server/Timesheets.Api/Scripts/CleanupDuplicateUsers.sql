-- =====================================================
-- AFH TimeSheets - Cleanup Duplicate Users
-- =====================================================
-- Purpose: Remove duplicate user entries and add unique constraint on Email
-- Date: 2026-01-06
-- Author: Claude Code
-- =====================================================

USE afh_timesheets;

-- =====================================================
-- STEP 1: Analyze Current State
-- =====================================================

SELECT '=== CURRENT STATE ANALYSIS ===' as Step;

SELECT
    COUNT(*) as total_active_users,
    COUNT(DISTINCT Email) as unique_emails,
    COUNT(*) - COUNT(DISTINCT Email) as duplicates_to_remove
FROM Users
WHERE IsActive = 1;

-- Show sample duplicates
SELECT
    Email,
    COUNT(*) as occurrence_count,
    GROUP_CONCAT(Id ORDER BY Id) as duplicate_ids
FROM Users
WHERE IsActive = 1
GROUP BY Email
HAVING COUNT(*) > 1
ORDER BY occurrence_count DESC
LIMIT 10;

-- =====================================================
-- STEP 2: Identify Users to Keep vs. Delete
-- =====================================================

SELECT '=== USERS TO KEEP (Lowest ID per Email) ===' as Step;

-- Show which IDs will be kept (lowest ID per email)
SELECT
    MIN(Id) as id_to_keep,
    Email,
    FirstName,
    LastName,
    Department
FROM Users
WHERE IsActive = 1
GROUP BY Email, FirstName, LastName, Department
LIMIT 10;

-- =====================================================
-- STEP 3: Check for Related Data
-- =====================================================

SELECT '=== CHECKING RELATED DATA ===' as Step;

-- Check if duplicate users have time entries
SELECT
    u.Id,
    u.Email,
    u.FirstName,
    u.LastName,
    COUNT(dte.Id) as time_entry_count
FROM Users u
LEFT JOIN DailyTimeEntries dte ON dte.UserId = u.Id
WHERE u.IsActive = 1
AND u.Id NOT IN (
    SELECT MIN(Id)
    FROM Users
    WHERE IsActive = 1
    GROUP BY Email
)
GROUP BY u.Id, u.Email, u.FirstName, u.LastName
HAVING COUNT(dte.Id) > 0
LIMIT 10;

-- Check if duplicate users have PTO requests
SELECT
    u.Id,
    u.Email,
    u.FirstName,
    u.LastName,
    COUNT(pto.Id) as pto_request_count
FROM Users u
LEFT JOIN PtoRequests pto ON pto.UserId = u.Id
WHERE u.IsActive = 1
AND u.Id NOT IN (
    SELECT MIN(Id)
    FROM Users
    WHERE IsActive = 1
    GROUP BY Email
)
GROUP BY u.Id, u.Email, u.FirstName, u.LastName
HAVING COUNT(pto.Id) > 0
LIMIT 10;

-- =====================================================
-- STEP 4: Migrate Related Data to Primary User
-- =====================================================

SELECT '=== MIGRATING RELATED DATA ===' as Step;

-- Create temporary table with mapping of old ID -> new ID
CREATE TEMPORARY TABLE user_id_mapping AS
SELECT
    u.Id as old_id,
    (SELECT MIN(Id) FROM Users u2 WHERE u2.Email = u.Email AND u2.IsActive = 1) as new_id
FROM Users u
WHERE u.IsActive = 1
AND u.Id NOT IN (
    SELECT MIN(Id)
    FROM Users
    WHERE IsActive = 1
    GROUP BY Email
);

-- Update DailyTimeEntries to point to primary user
UPDATE DailyTimeEntries dte
INNER JOIN user_id_mapping map ON dte.UserId = map.old_id
SET dte.UserId = map.new_id
WHERE dte.UserId = map.old_id;

SELECT ROW_COUNT() as daily_time_entries_updated;

-- Update PtoRequests to point to primary user
UPDATE PtoRequests pto
INNER JOIN user_id_mapping map ON pto.UserId = map.old_id
SET pto.UserId = map.new_id
WHERE pto.UserId = map.old_id;

SELECT ROW_COUNT() as pto_requests_updated;

-- Update PtoRequests approvedDeniedBy to point to primary user
UPDATE PtoRequests pto
INNER JOIN user_id_mapping map ON pto.ApprovedDeniedBy = map.old_id
SET pto.ApprovedDeniedBy = map.new_id
WHERE pto.ApprovedDeniedBy = map.old_id;

SELECT ROW_COUNT() as pto_approvers_updated;

-- =====================================================
-- STEP 5: Delete Duplicate Users
-- =====================================================

SELECT '=== DELETING DUPLICATE USERS ===' as Step;

-- Show count of users to be deleted
SELECT
    COUNT(*) as users_to_delete
FROM Users
WHERE IsActive = 1
AND Id NOT IN (
    SELECT MIN(Id)
    FROM Users
    WHERE IsActive = 1
    GROUP BY Email
);

-- Delete duplicate users (keep only lowest ID per email)
DELETE FROM Users
WHERE IsActive = 1
AND Id NOT IN (
    SELECT min_id FROM (
        SELECT MIN(Id) as min_id
        FROM Users
        WHERE IsActive = 1
        GROUP BY Email
    ) as users_to_keep
);

SELECT ROW_COUNT() as users_deleted;

-- =====================================================
-- STEP 6: Add Unique Constraint
-- =====================================================

SELECT '=== ADDING UNIQUE CONSTRAINT ===' as Step;

-- Check if unique index already exists
SELECT
    COUNT(*) as existing_unique_index_count
FROM information_schema.statistics
WHERE table_schema = 'afh_timesheets'
AND table_name = 'Users'
AND index_name = 'UK_Users_Email';

-- Add unique constraint on Email (if it doesn't exist)
-- Note: This will fail if the index already exists, which is fine
SET @add_constraint = '
ALTER TABLE Users
ADD UNIQUE INDEX UK_Users_Email (Email)';

-- Only execute if index doesn't exist
SET @index_exists = (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = 'afh_timesheets'
    AND table_name = 'Users'
    AND index_name = 'UK_Users_Email'
);

-- Execute constraint addition if needed
-- Note: This uses prepared statement to conditionally execute
SET @sql = IF(@index_exists = 0, @add_constraint, 'SELECT "Index already exists" as status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- STEP 7: Verify Final State
-- =====================================================

SELECT '=== FINAL STATE VERIFICATION ===' as Step;

-- Verify no duplicates remain
SELECT
    COUNT(*) as total_active_users,
    COUNT(DISTINCT Email) as unique_emails,
    COUNT(*) - COUNT(DISTINCT Email) as remaining_duplicates
FROM Users
WHERE IsActive = 1;

-- Show any remaining duplicates (should be 0)
SELECT
    Email,
    COUNT(*) as occurrence_count,
    GROUP_CONCAT(Id ORDER BY Id) as ids
FROM Users
WHERE IsActive = 1
GROUP BY Email
HAVING COUNT(*) > 1;

-- Show sample of cleaned data
SELECT
    Id,
    Email,
    FirstName,
    LastName,
    Department,
    IsActive
FROM Users
WHERE IsActive = 1
ORDER BY LastName, FirstName
LIMIT 10;

-- Verify unique constraint exists
SELECT
    INDEX_NAME,
    COLUMN_NAME,
    NON_UNIQUE
FROM information_schema.statistics
WHERE table_schema = 'afh_timesheets'
AND table_name = 'Users'
AND index_name = 'UK_Users_Email';

SELECT '=== CLEANUP COMPLETE ===' as Status;
