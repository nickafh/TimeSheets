-- Find PTO rows with invalid/missing dates (corrupt data that breaks calendar feeds).
-- The calendar feed skips these at runtime; this script helps identify and fix them.
--
-- Column names: DateOfLeave (start), EndDate (optional, for multi-day).
-- Adjust if your schema uses different names (e.g. StartDate vs DateOfLeave).

-- 1) Inspect specific IDs if you have them from logs:
-- SELECT Id, DateOfLeave, EndDate, UserId, Status, RequestedAt
-- FROM PtoRequests
-- WHERE Id IN (36766, 36767, 36768, 34098, 34101, 14547, 778, 779, ...);

-- 2) Find all PTO rows with invalid dates:
SELECT Id, DateOfLeave, EndDate, UserId, Status, RequestedAt
FROM PtoRequests
WHERE DateOfLeave IS NULL
   OR DateOfLeave < '1900-01-01'
   OR DateOfLeave > '2100-12-31'
   OR (EndDate IS NOT NULL AND (EndDate < '1900-01-01' OR EndDate > '2100-12-31'))
   OR (EndDate IS NOT NULL AND EndDate < DateOfLeave);

-- Options to fix:
-- A) Delete junk/drafts (e.g. never completed requests):
--    DELETE FROM PtoRequests WHERE Id IN (...);

-- B) Set to real dates if legitimate:
--    UPDATE PtoRequests SET DateOfLeave = '2025-01-15', EndDate = NULL WHERE Id = ...;

-- C) If you have a Draft status, mark invalid ones as Draft and exclude Drafts from the feed.
