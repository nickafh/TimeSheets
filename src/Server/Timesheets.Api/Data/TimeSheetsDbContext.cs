using Microsoft.EntityFrameworkCore;
using TimeSheets.Api.Models;

namespace TimeSheets.Api.Data;

public class TimeSheetsDbContext : DbContext
{
    public TimeSheetsDbContext(DbContextOptions<TimeSheetsDbContext> options)
        : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<UserManager> UserManagers => Set<UserManager>();
    public DbSet<PtoType> PtoTypes => Set<PtoType>();
    public DbSet<PtoRequest> PtoRequests => Set<PtoRequest>();
    public DbSet<DailyTimeEntry> DailyTimeEntries => Set<DailyTimeEntry>();
    public DbSet<Holiday> Holidays => Set<Holiday>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<EarlyClosure> EarlyClosures => Set<EarlyClosure>();
    public DbSet<SystemSettings> SystemSettings => Set<SystemSettings>();

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

        modelBuilder.Entity<PtoType>().ToTable("PtoTypes");
        modelBuilder.Entity<PtoRequest>().ToTable("PtoRequests");
        modelBuilder.Entity<DailyTimeEntry>().ToTable("DailyTimeEntries");
        modelBuilder.Entity<Holiday>().ToTable("Holidays");
        modelBuilder.Entity<Notification>().ToTable("Notifications");
        modelBuilder.Entity<EarlyClosure>().ToTable("EarlyClosures");
        modelBuilder.Entity<SystemSettings>().ToTable("SystemSettings");
    }
}