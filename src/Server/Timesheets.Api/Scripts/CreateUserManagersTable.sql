-- Run this script to create the UserManagers table (for multiple managers per user).
-- If you use EF migrations instead, run: dotnet ef migrations add AddUserManagers
-- then: dotnet ef database update

CREATE TABLE IF NOT EXISTS UserManagers (
    UserId INT NOT NULL,
    ManagerId INT NOT NULL,
    PRIMARY KEY (UserId, ManagerId),
    CONSTRAINT FK_UserManagers_User FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
    CONSTRAINT FK_UserManagers_Manager FOREIGN KEY (ManagerId) REFERENCES Users(Id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS IX_UserManagers_UserId ON UserManagers(UserId);
CREATE INDEX IF NOT EXISTS IX_UserManagers_ManagerId ON UserManagers(ManagerId);
