using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using TimeSheets.Api.Data;
using TimeSheets.Api.Models;
using TimeSheets.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient();
builder.Services.AddScoped<IAppEmailSender, AppEmailSender>();

// CORS — configurable origins via Cors:AllowedOrigins, defaults to Vite dev server
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:5173" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowConfigured", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// JWT Authentication
var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("Jwt:Secret configuration is required");
var jwtKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = jwtKey,
        };
    });

// DbContext
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

builder.Services.AddDbContext<TimeSheetsDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

// Rate limiting
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Strict limiter for login: 5 attempts per 15 minutes per IP
    options.AddFixedWindowLimiter("login", opt =>
    {
        opt.PermitLimit = 5;
        opt.Window = TimeSpan.FromMinutes(15);
        opt.QueueLimit = 0;
    });

    // General limiter: 100 requests per minute per IP
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 100,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
            }));
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Forward headers so the API sees real client IPs behind Nginx
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

var app = builder.Build();

// Auto-create database schema on first startup (no-op if tables already exist)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<TimeSheetsDbContext>();
    db.Database.EnsureCreated();

    // EnsureCreated doesn't alter existing tables, so add missing columns/tables
    {
        var conn = db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open) await conn.OpenAsync();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Users' AND column_name = 'PasswordHash'";
        var exists = Convert.ToInt32(await cmd.ExecuteScalarAsync()) > 0;
        if (!exists)
        {
            await db.Database.ExecuteSqlRawAsync(
                "ALTER TABLE Users ADD COLUMN PasswordHash VARCHAR(255) NULL");
        }
    }

    // Add CalendarToken column if missing
    {
        var conn2 = db.Database.GetDbConnection();
        if (conn2.State != System.Data.ConnectionState.Open) await conn2.OpenAsync();
        using var cmd2 = conn2.CreateCommand();
        cmd2.CommandText = "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'Users' AND column_name = 'CalendarToken'";
        var ctExists = Convert.ToInt32(await cmd2.ExecuteScalarAsync()) > 0;
        if (!ctExists)
        {
            await db.Database.ExecuteSqlRawAsync(
                "ALTER TABLE Users ADD COLUMN CalendarToken VARCHAR(64) NULL");
        }
    }

    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS UserManagers (
                UserId INT NOT NULL,
                ManagerId INT NOT NULL,
                PRIMARY KEY (UserId, ManagerId),
                FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
                FOREIGN KEY (ManagerId) REFERENCES Users(Id) ON DELETE CASCADE
            )");
    }
    catch
    {
        // Table already exists — ignore
    }

    // Add foreign keys and indexes for existing tables
    async Task RunIfNotExists(TimeSheetsDbContext dbCtx, string checkSql, string alterSql)
    {
        var conn = dbCtx.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open) await conn.OpenAsync();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = checkSql;
        var exists = Convert.ToInt32(await cmd.ExecuteScalarAsync()) > 0;
        if (!exists)
            await dbCtx.Database.ExecuteSqlRawAsync(alterSql);
    }

    // Unique index: DailyTimeEntries(UserId, WorkDate)
    try
    {
        await RunIfNotExists(db,
            "SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'DailyTimeEntries' AND index_name = 'UK_DailyTimeEntries_UserId_WorkDate'",
            "CREATE UNIQUE INDEX UK_DailyTimeEntries_UserId_WorkDate ON DailyTimeEntries (UserId, WorkDate)");
    }
    catch { /* index may already exist */ }

    // Index: PtoRequests(UserId)
    try
    {
        await RunIfNotExists(db,
            "SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'PtoRequests' AND index_name = 'IX_PtoRequests_UserId'",
            "CREATE INDEX IX_PtoRequests_UserId ON PtoRequests (UserId)");
    }
    catch { /* index may already exist */ }

    // Index: PtoRequests(Status)
    try
    {
        await RunIfNotExists(db,
            "SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'PtoRequests' AND index_name = 'IX_PtoRequests_Status'",
            "CREATE INDEX IX_PtoRequests_Status ON PtoRequests (Status)");
    }
    catch { /* index may already exist */ }

    // Index: Notifications(IsActive)
    try
    {
        await RunIfNotExists(db,
            "SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Notifications' AND index_name = 'IX_Notifications_IsActive'",
            "CREATE INDEX IX_Notifications_IsActive ON Notifications (IsActive)");
    }
    catch { /* index may already exist */ }

    // FK: DailyTimeEntries.UserId -> Users.Id
    try
    {
        await RunIfNotExists(db,
            "SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'DailyTimeEntries' AND constraint_name = 'FK_DailyTimeEntries_UserId'",
            "ALTER TABLE DailyTimeEntries ADD CONSTRAINT FK_DailyTimeEntries_UserId FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE");
    }
    catch { /* constraint may already exist */ }

    // FK: PtoRequests.UserId -> Users.Id
    try
    {
        await RunIfNotExists(db,
            "SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'PtoRequests' AND constraint_name = 'FK_PtoRequests_UserId'",
            "ALTER TABLE PtoRequests ADD CONSTRAINT FK_PtoRequests_UserId FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE");
    }
    catch { /* constraint may already exist */ }

    // FK: PtoRequests.PtoTypeId -> PtoTypes.Id
    try
    {
        await RunIfNotExists(db,
            "SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'PtoRequests' AND constraint_name = 'FK_PtoRequests_PtoTypeId'",
            "ALTER TABLE PtoRequests ADD CONSTRAINT FK_PtoRequests_PtoTypeId FOREIGN KEY (PtoTypeId) REFERENCES PtoTypes(Id) ON DELETE RESTRICT");
    }
    catch { /* constraint may already exist */ }

    // FK: PtoRequests.ApprovedDeniedBy -> Users.Id
    try
    {
        await RunIfNotExists(db,
            "SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'PtoRequests' AND constraint_name = 'FK_PtoRequests_ApprovedDeniedBy'",
            "ALTER TABLE PtoRequests ADD CONSTRAINT FK_PtoRequests_ApprovedDeniedBy FOREIGN KEY (ApprovedDeniedBy) REFERENCES Users(Id) ON DELETE SET NULL");
    }
    catch { /* constraint may already exist */ }

    // FK: Notifications.CreatedByUserId -> Users.Id
    try
    {
        await RunIfNotExists(db,
            "SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND table_name = 'Notifications' AND constraint_name = 'FK_Notifications_CreatedByUserId'",
            "ALTER TABLE Notifications ADD CONSTRAINT FK_Notifications_CreatedByUserId FOREIGN KEY (CreatedByUserId) REFERENCES Users(Id) ON DELETE CASCADE");
    }
    catch { /* constraint may already exist */ }

    // Add AnnualAllowance column to PtoTypes if missing
    try
    {
        await RunIfNotExists(db,
            "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'PtoTypes' AND column_name = 'AnnualAllowance'",
            "ALTER TABLE PtoTypes ADD COLUMN AnnualAllowance DECIMAL(10,2) NOT NULL DEFAULT 0");

        // Seed default allowances for existing PTO types that haven't been configured
        await db.Database.ExecuteSqlRawAsync(@"
            UPDATE PtoTypes SET AnnualAllowance = 120 WHERE Id = 1 AND AnnualAllowance = 0;
            UPDATE PtoTypes SET AnnualAllowance = 40  WHERE Id = 2 AND AnnualAllowance = 0;
            UPDATE PtoTypes SET AnnualAllowance = 8   WHERE Id = 3 AND AnnualAllowance = 0;
            UPDATE PtoTypes SET AnnualAllowance = 24  WHERE Id = 4 AND AnnualAllowance = 0;
            UPDATE PtoTypes SET AnnualAllowance = 0   WHERE Id = 5 AND AnnualAllowance = 0;
        ");

        // Sync PtoType(1) allowance from SystemSettings so they stay consistent
        var settings = await db.SystemSettings.FindAsync(1);
        if (settings != null)
        {
            var ptoType1 = await db.PtoTypes.FindAsync(1);
            if (ptoType1 != null && ptoType1.AnnualAllowance != settings.DefaultPtoAllowance)
            {
                ptoType1.AnnualAllowance = settings.DefaultPtoAllowance;
                await db.SaveChangesAsync();
            }
        }
    }
    catch { /* column may already exist */ }

    // Add tenure-based PTO tier columns to SystemSettings if missing
    try
    {
        await RunIfNotExists(db,
            "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'SystemSettings' AND column_name = 'PtoTier1MaxYears'",
            "ALTER TABLE SystemSettings ADD COLUMN PtoTier1MaxYears INT NOT NULL DEFAULT 5");
        await RunIfNotExists(db,
            "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'SystemSettings' AND column_name = 'PtoTier1AnnualDays'",
            "ALTER TABLE SystemSettings ADD COLUMN PtoTier1AnnualDays INT NOT NULL DEFAULT 18");
        await RunIfNotExists(db,
            "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'SystemSettings' AND column_name = 'PtoTier2MaxYears'",
            "ALTER TABLE SystemSettings ADD COLUMN PtoTier2MaxYears INT NOT NULL DEFAULT 10");
        await RunIfNotExists(db,
            "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'SystemSettings' AND column_name = 'PtoTier2AnnualDays'",
            "ALTER TABLE SystemSettings ADD COLUMN PtoTier2AnnualDays INT NOT NULL DEFAULT 23");
        await RunIfNotExists(db,
            "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'SystemSettings' AND column_name = 'PtoTier3AnnualDays'",
            "ALTER TABLE SystemSettings ADD COLUMN PtoTier3AnnualDays INT NOT NULL DEFAULT 28");
    }
    catch { /* columns may already exist */ }

    // Seed users with passwords
    var hash = BCrypt.Net.BCrypt.HashPassword("Invest123");

    // Update Nick's existing record (id=1) with a password hash if missing
    var nick = await db.Users.FirstOrDefaultAsync(u => u.Email == "nick@atlantafinehomes.com");
    if (nick != null && nick.PasswordHash == null)
    {
        nick.PasswordHash = hash;
        nick.Role = "Admin";
    }

    // Create testuser1 (Employee)
    if (!await db.Users.AnyAsync(u => u.Email == "testuser1@atlantafinehomes.com"))
    {
        db.Users.Add(new User
        {
            FirstName = "Test",
            LastName = "User1",
            Email = "testuser1@atlantafinehomes.com",
            Role = "Employee",
            PasswordHash = hash,
            IsActive = 1,
            HireDate = DateTime.UtcNow,
        });
    }

    // Create testuser2 (Manager)
    if (!await db.Users.AnyAsync(u => u.Email == "testuser2@atlantafinehomes.com"))
    {
        db.Users.Add(new User
        {
            FirstName = "Test",
            LastName = "User2",
            Email = "testuser2@atlantafinehomes.com",
            Role = "Manager",
            PasswordHash = hash,
            IsActive = 1,
            HireDate = DateTime.UtcNow,
        });
    }

    await db.SaveChangesAsync();

    // Generate CalendarToken for any user that doesn't have one
    var usersWithoutToken = await db.Users.Where(u => u.CalendarToken == null).ToListAsync();
    foreach (var u in usersWithoutToken)
    {
        u.CalendarToken = Guid.NewGuid().ToString("N"); // 32-char hex string
    }
    if (usersWithoutToken.Count > 0)
    {
        await db.SaveChangesAsync();
    }

    // Set testuser2 as testuser1's manager
    var testUser1 = await db.Users.FirstOrDefaultAsync(u => u.Email == "testuser1@atlantafinehomes.com");
    var testUser2 = await db.Users.FirstOrDefaultAsync(u => u.Email == "testuser2@atlantafinehomes.com");
    if (testUser1 != null && testUser2 != null)
    {
        var exists = await db.UserManagers.AnyAsync(
            um => um.UserId == testUser1.Id && um.ManagerId == testUser2.Id);
        if (!exists)
        {
            db.UserManagers.Add(new UserManager
            {
                UserId = testUser1.Id,
                ManagerId = testUser2.Id,
            });
            await db.SaveChangesAsync();
        }
    }
}

app.UseForwardedHeaders();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseHttpsRedirection();
}

app.UseCors("AllowConfigured");

app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapGet("/health", () => Results.Ok("healthy"));

app.Run();
