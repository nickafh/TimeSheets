-- Create Notifications table for admin announcements
CREATE TABLE IF NOT EXISTS Notifications (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    Title VARCHAR(255) NOT NULL,
    Message TEXT NOT NULL,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ExpiresAt DATETIME NULL,
    IsActive TINYINT NOT NULL DEFAULT 1,
    CreatedByUserId INT NOT NULL,
    FOREIGN KEY (CreatedByUserId) REFERENCES Users(Id)
);

-- Add index for querying active notifications
CREATE INDEX IX_Notifications_IsActive_ExpiresAt ON Notifications(IsActive, ExpiresAt);
