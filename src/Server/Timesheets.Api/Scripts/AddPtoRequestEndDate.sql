-- Add EndDate to PtoRequests for multi-day time off (one request = date range).
-- If EndDate is NULL, request is single day (DateOfLeave only).

ALTER TABLE PtoRequests ADD COLUMN EndDate DATE NULL;
