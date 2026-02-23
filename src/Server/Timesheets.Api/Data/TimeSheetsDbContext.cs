using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using TimeSheets.Api.Models;

namespace TimeSheets.Api.Data;

public class TimeSheetsDbContext : DbContext
{
    public TimeSheetsDbContext(DbContextOptions<TimeSheetsDbContext> options)
        : base(options) { }

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        // MySQL DATETIME columns lose DateTimeKind info. Mark all as UTC so
        // System.Text.Json serializes them with the "Z" suffix and browsers
        // correctly convert to local time.
        configurationBuilder.Properties<DateTime>()
            .HaveConversion<UtcDateTimeConverter>();
        configurationBuilder.Properties<DateTime?>()
            .HaveConversion<NullableUtcDateTimeConverter>();
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<UserManager> UserManagers => Set<UserManager>();
    public DbSet<PtoType> PtoTypes => Set<PtoType>();
    public DbSet<PtoRequest> PtoRequests => Set<PtoRequest>();
    public DbSet<DailyTimeEntry> DailyTimeEntries => Set<DailyTimeEntry>();
    public DbSet<Holiday> Holidays => Set<Holiday>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<EarlyClosure> EarlyClosures => Set<EarlyClosure>();
    public DbSet<SystemSettings> SystemSettings => Set<SystemSettings>();
    public DbSet<ClockPunch> ClockPunches => Set<ClockPunch>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>().ToTable("Users");

        // Add unique constraint on Email to prevent duplicate users
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique()
            .HasDatabaseName("UK_Users_Email");

        modelBuilder.Entity<UserManager>().ToTable("UserManagers");
        modelBuilder.Entity<UserManager>().HasKey(um => new { um.UserId, um.ManagerId });
        modelBuilder.Entity<UserManager>()
            .HasOne(um => um.User)
            .WithMany()
            .HasForeignKey(um => um.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<UserManager>()
            .HasOne(um => um.Manager)
            .WithMany()
            .HasForeignKey(um => um.ManagerId)
            .OnDelete(DeleteBehavior.Cascade);

        // --- DailyTimeEntry ---
        modelBuilder.Entity<DailyTimeEntry>().ToTable("DailyTimeEntries");
        modelBuilder.Entity<DailyTimeEntry>()
            .HasOne(d => d.User)
            .WithMany()
            .HasForeignKey(d => d.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<DailyTimeEntry>()
            .HasIndex(d => new { d.UserId, d.WorkDate })
            .IsUnique()
            .HasDatabaseName("UK_DailyTimeEntries_UserId_WorkDate");

        // --- PtoRequest ---
        modelBuilder.Entity<PtoRequest>().ToTable("PtoRequests");
        modelBuilder.Entity<PtoRequest>()
            .HasOne(p => p.User)
            .WithMany()
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<PtoRequest>()
            .HasOne(p => p.PtoType)
            .WithMany()
            .HasForeignKey(p => p.PtoTypeId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<PtoRequest>()
            .HasOne(p => p.ApproverUser)
            .WithMany()
            .HasForeignKey(p => p.ApprovedDeniedBy)
            .OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<PtoRequest>()
            .HasIndex(p => p.UserId)
            .HasDatabaseName("IX_PtoRequests_UserId");
        modelBuilder.Entity<PtoRequest>()
            .HasIndex(p => p.Status)
            .HasDatabaseName("IX_PtoRequests_Status");

        // --- PtoType ---
        modelBuilder.Entity<PtoType>().ToTable("PtoTypes");

        // --- Notification ---
        modelBuilder.Entity<Notification>().ToTable("Notifications");
        modelBuilder.Entity<Notification>()
            .HasOne(n => n.CreatedByUser)
            .WithMany()
            .HasForeignKey(n => n.CreatedByUserId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<Notification>()
            .HasIndex(n => n.IsActive)
            .HasDatabaseName("IX_Notifications_IsActive");

        modelBuilder.Entity<Holiday>().ToTable("Holidays");
        modelBuilder.Entity<EarlyClosure>().ToTable("EarlyClosures");
        modelBuilder.Entity<SystemSettings>().ToTable("SystemSettings");

        // --- ClockPunch ---
        modelBuilder.Entity<ClockPunch>().ToTable("ClockPunches");
        modelBuilder.Entity<ClockPunch>()
            .HasOne(cp => cp.User)
            .WithMany()
            .HasForeignKey(cp => cp.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<ClockPunch>()
            .HasIndex(cp => new { cp.UserId, cp.PunchDate })
            .HasDatabaseName("IX_ClockPunches_UserId_PunchDate");
    }
}

internal class UtcDateTimeConverter : ValueConverter<DateTime, DateTime>
{
    public UtcDateTimeConverter()
        : base(d => d, d => DateTime.SpecifyKind(d, DateTimeKind.Utc)) { }
}

internal class NullableUtcDateTimeConverter : ValueConverter<DateTime?, DateTime?>
{
    public NullableUtcDateTimeConverter()
        : base(d => d, d => d.HasValue ? DateTime.SpecifyKind(d.Value, DateTimeKind.Utc) : d) { }
}