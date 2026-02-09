using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
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

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapGet("/health", () => Results.Ok("healthy"));

app.Run();
