import { useEffect, useState } from "react";
import {
  fetchUsers,
  fetchPtoHistory,
  fetchHolidays,
  formatPtoRequestDateDisplay,
  type UserDto,
  type PtoRequestWithUserDto,
  type HolidayDto,
} from "../api";

// CSV Export utility
function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) {
    alert("No data to export");
    return;
  }

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma or quote
        const stringValue = String(value ?? "");
        if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(",")
    ),
  ];

  const csvString = csvRows.join("\n");
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

interface ReportStats {
  // User stats
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  usersByDepartment: { department: string; count: number }[];

  // PTO stats
  totalPtoRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  deniedRequests: number;
  ptoByMonth: { month: string; count: number; hours: number }[];
  ptoByDepartment: { department: string; count: number; hours: number }[];

  // Holiday stats
  totalHolidays: number;
  upcomingHolidays: HolidayDto[];
}

export default function SystemReports() {
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [recentPtoRequests, setRecentPtoRequests] = useState<PtoRequestWithUserDto[]>([]);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Raw data for exports
  const [allUsers, setAllUsers] = useState<UserDto[]>([]);
  const [allPtoRequests, setAllPtoRequests] = useState<PtoRequestWithUserDto[]>([]);
  const [allHolidays, setAllHolidays] = useState<HolidayDto[]>([]);

  useEffect(() => {
    loadReportData();
  }, [selectedYear]);

  const loadReportData = async () => {
    try {
      setLoading(true);

      const [users, ptoRequests, holidays] = await Promise.all([
        fetchUsers(true), // Include inactive
        fetchPtoHistory(), // Returns all statuses (pending, approved, denied)
        fetchHolidays(),
      ]);

      // Store raw data for exports
      setAllUsers(users);
      setAllPtoRequests(ptoRequests);
      setAllHolidays(holidays);

      // User statistics
      const activeUsers = users.filter(u => u.isActive === 1);
      const inactiveUsers = users.filter(u => u.isActive === 0);

      // Group users by department
      const deptMap = new Map<string, number>();
      activeUsers.forEach(u => {
        const dept = u.department || "Unassigned";
        deptMap.set(dept, (deptMap.get(dept) || 0) + 1);
      });
      const usersByDepartment = Array.from(deptMap.entries())
        .map(([department, count]) => ({ department, count }))
        .sort((a, b) => b.count - a.count);

      // PTO statistics
      const yearRequests = ptoRequests.filter(r => {
        const reqYear = new Date(r.dateOfLeave).getFullYear();
        return reqYear === selectedYear;
      });

      const pendingRequests = yearRequests.filter(r => r.status === 0);
      const approvedRequests = yearRequests.filter(r => r.status === 1);
      const deniedRequests = yearRequests.filter(r => r.status === 2);

      // PTO by month
      const monthMap = new Map<string, { count: number; hours: number }>();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      monthNames.forEach(m => monthMap.set(m, { count: 0, hours: 0 }));

      yearRequests.forEach(r => {
        const month = monthNames[new Date(r.dateOfLeave).getMonth()];
        const current = monthMap.get(month)!;
        monthMap.set(month, { count: current.count + 1, hours: current.hours + r.hours });
      });

      const ptoByMonth = monthNames.map(month => ({
        month,
        count: monthMap.get(month)!.count,
        hours: monthMap.get(month)!.hours,
      }));

      // PTO by department
      const ptoDeptMap = new Map<string, { count: number; hours: number }>();
      yearRequests.forEach(r => {
        const dept = r.department || "Unassigned";
        const current = ptoDeptMap.get(dept) || { count: 0, hours: 0 };
        ptoDeptMap.set(dept, { count: current.count + 1, hours: current.hours + r.hours });
      });
      const ptoByDepartment = Array.from(ptoDeptMap.entries())
        .map(([department, data]) => ({ department, ...data }))
        .sort((a, b) => b.hours - a.hours);

      // Holiday statistics
      const today = new Date();
      const upcomingHolidays = holidays
        .filter(h => new Date(h.holidayDate) >= today)
        .sort((a, b) => new Date(a.holidayDate).getTime() - new Date(b.holidayDate).getTime())
        .slice(0, 5);

      // Recent PTO requests
      const recent = [...ptoRequests]
        .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())
        .slice(0, 10);
      setRecentPtoRequests(recent);

      setStats({
        totalUsers: users.length,
        activeUsers: activeUsers.length,
        inactiveUsers: inactiveUsers.length,
        usersByDepartment,
        totalPtoRequests: yearRequests.length,
        pendingRequests: pendingRequests.length,
        approvedRequests: approvedRequests.length,
        deniedRequests: deniedRequests.length,
        ptoByMonth,
        ptoByDepartment,
        totalHolidays: holidays.length,
        upcomingHolidays,
      });
    } catch (error) {
      console.error("Failed to load report data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: number) => {
    const baseStyle = {
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    };

    switch (status) {
      case 0:
        return <span style={{ ...baseStyle, backgroundColor: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' }}>Pending</span>;
      case 1:
        return <span style={{ ...baseStyle, backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>Approved</span>;
      case 2:
        return <span style={{ ...baseStyle, backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>Denied</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F8F9FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#C29B40', animation: 'spin 1s linear infinite' }}>progress_activity</span>
          <div style={{ marginTop: '16px', fontSize: '18px', fontWeight: 600, color: '#002349' }}>Loading reports...</div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F8F9FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#dc2626' }}>error</span>
          <div style={{ marginTop: '16px', fontSize: '18px', fontWeight: 600, color: '#dc2626' }}>Failed to load report data</div>
        </div>
      </div>
    );
  }

  const maxPtoHours = Math.max(...stats.ptoByMonth.map(m => m.hours), 1);

  // Export handlers
  const exportUsers = () => {
    const data = allUsers.map(u => ({
      ID: u.id,
      "First Name": u.firstName,
      "Last Name": u.lastName,
      Email: u.email,
      Department: u.department || "",
      Category: u.category || "",
      "Manager(s)": u.managerIds?.length
        ? u.managerIds
            .map((id) => {
              const m = allUsers.find((x) => x.id === id);
              return m ? `${m.firstName} ${m.lastName}` : String(id);
            })
            .join(", ")
        : u.managerName || "",
      "Hire Date": u.hireDate ? new Date(u.hireDate).toLocaleDateString() : "",
      "Termination Date": u.terminationDate ? new Date(u.terminationDate).toLocaleDateString() : "",
      Status: u.isActive === 1 ? "Active" : "Inactive",
    }));
    exportToCSV(data, "users_report");
    setShowExportMenu(false);
  };

  const exportPtoRequests = () => {
    const yearRequests = allPtoRequests.filter(r => {
      const reqYear = new Date(r.dateOfLeave).getFullYear();
      return reqYear === selectedYear;
    });
    const data = yearRequests.map(r => ({
      ID: r.id,
      Employee: r.userName,
      Department: r.department || "",
      "Date of Leave": formatPtoRequestDateDisplay(r),
      Hours: r.hours,
      Reason: r.reason || "",
      Status: r.status === 0 ? "Pending" : r.status === 1 ? "Approved" : "Denied",
      "Requested At": new Date(r.requestedAt).toLocaleDateString(),
      "Approved/Denied At": r.approvedDeniedAt ? new Date(r.approvedDeniedAt).toLocaleDateString() : "",
      "Deny Reason": r.denyReason || "",
    }));
    exportToCSV(data, `pto_requests_${selectedYear}`);
    setShowExportMenu(false);
  };

  const exportHolidays = () => {
    const data = allHolidays.map(h => ({
      ID: h.id,
      Name: h.name,
      Date: new Date(h.holidayDate).toLocaleDateString(),
    }));
    exportToCSV(data, "holidays_report");
    setShowExportMenu(false);
  };

  const exportPtoByDepartment = () => {
    const data = stats.ptoByDepartment.map(d => ({
      Department: d.department,
      "Total Requests": d.count,
      "Total Hours": d.hours.toFixed(1),
    }));
    exportToCSV(data, `pto_by_department_${selectedYear}`);
    setShowExportMenu(false);
  };

  const exportPtoByMonth = () => {
    const data = stats.ptoByMonth.map(m => ({
      Month: m.month,
      "Total Requests": m.count,
      "Total Hours": m.hours.toFixed(1),
    }));
    exportToCSV(data, `pto_by_month_${selectedYear}`);
    setShowExportMenu(false);
  };

  const thStyle = {
    padding: '14px 24px',
    textAlign: 'left' as const,
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    color: '#C29B40',
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '36px', fontFamily: "'Playfair Display', serif", color: '#002349', marginBottom: '8px' }}>
            System Reports
          </h1>
          <p style={{ color: '#666666', fontSize: '15px' }}>
            Analytics and insights across the organization
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#002349' }}>Year:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={{
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#002349',
                border: '2px solid #002349',
                borderRadius: '6px',
                outline: 'none',
                backgroundColor: 'white',
                cursor: 'pointer',
              }}
            >
              {[2024, 2025, 2026, 2027].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              style={{
                backgroundColor: '#002349',
                color: 'white',
                padding: '12px 20px',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minHeight: '44px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
              Export CSV
            </button>
            {showExportMenu && (
              <div className="export-dropdown" style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                marginTop: '8px',
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                zIndex: 50,
                minWidth: '200px',
                overflow: 'hidden',
              }}>
                <button
                  onClick={exportUsers}
                  style={{ width: '100%', padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#002349', backgroundColor: 'white', border: 'none', cursor: 'pointer', borderBottom: '1px solid #e2e8f0' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  All Users
                </button>
                <button
                  onClick={exportPtoRequests}
                  style={{ width: '100%', padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#002349', backgroundColor: 'white', border: 'none', cursor: 'pointer', borderBottom: '1px solid #e2e8f0' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  PTO Requests ({selectedYear})
                </button>
                <button
                  onClick={exportPtoByMonth}
                  style={{ width: '100%', padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#002349', backgroundColor: 'white', border: 'none', cursor: 'pointer', borderBottom: '1px solid #e2e8f0' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  PTO by Month ({selectedYear})
                </button>
                <button
                  onClick={exportPtoByDepartment}
                  style={{ width: '100%', padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#002349', backgroundColor: 'white', border: 'none', cursor: 'pointer', borderBottom: '1px solid #e2e8f0' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  PTO by Department ({selectedYear})
                </button>
                <button
                  onClick={exportHolidays}
                  style={{ width: '100%', padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#002349', backgroundColor: 'white', border: 'none', cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  All Holidays
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="stats-grid-4" style={{ gap: '24px', marginBottom: '32px' }}>
        {/* Total Users */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            backgroundColor: 'rgba(0, 35, 73, 0.1)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#002349' }}>group</span>
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '8px' }}>
            Total Users
          </div>
          <div style={{ fontSize: '36px', fontWeight: 700, color: '#002349' }}>{stats.totalUsers}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            {stats.activeUsers} active / {stats.inactiveUsers} inactive
          </div>
        </div>

        {/* Approved PTO */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            backgroundColor: 'rgba(5, 150, 105, 0.1)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#059669' }}>check_circle</span>
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '8px' }}>
            Approved PTO
          </div>
          <div style={{ fontSize: '36px', fontWeight: 700, color: '#059669' }}>{stats.approvedRequests}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>in {selectedYear}</div>
        </div>

        {/* Pending PTO */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            backgroundColor: 'rgba(217, 119, 6, 0.1)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#d97706' }}>hourglass_empty</span>
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '8px' }}>
            Pending PTO
          </div>
          <div style={{ fontSize: '36px', fontWeight: 700, color: '#d97706' }}>{stats.pendingRequests}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>awaiting approval</div>
        </div>

        {/* Denied PTO */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#dc2626' }}>cancel</span>
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '8px' }}>
            Denied PTO
          </div>
          <div style={{ fontSize: '36px', fontWeight: 700, color: '#dc2626' }}>{stats.deniedRequests}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>in {selectedYear}</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="split-panels" style={{ gap: '24px', marginBottom: '32px' }}>
        {/* PTO by Month Chart */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#002349',
          }}>
            <h2 style={{ fontSize: '18px', fontFamily: "'Playfair Display', serif", color: 'white' }}>
              PTO Hours by Month ({selectedYear})
            </h2>
          </div>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stats.ptoByMonth.map((month) => (
                <div key={month.month} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', fontSize: '13px', fontWeight: 600, color: '#002349' }}>{month.month}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ height: '24px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${(month.hours / maxPtoHours) * 100}%`,
                          backgroundColor: '#C29B40',
                          borderRadius: '4px',
                          transition: 'width 0.5s ease',
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ width: '60px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: '#002349' }}>
                    {month.hours.toFixed(1)}h
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Users by Department */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#002349',
          }}>
            <h2 style={{ fontSize: '18px', fontFamily: "'Playfair Display', serif", color: 'white' }}>
              Active Users by Department
            </h2>
          </div>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stats.usersByDepartment.slice(0, 8).map((dept, index) => (
                <div key={dept.department} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '12px',
                  borderBottom: index < Math.min(stats.usersByDepartment.length, 8) - 1 ? '1px solid #e2e8f0' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      backgroundColor: '#002349',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'white',
                    }}>
                      {index + 1}
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#002349' }}>{dept.department}</span>
                  </div>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: '#C29B40' }}>{dept.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Second Row */}
      <div className="split-panels" style={{ gap: '24px', marginBottom: '32px' }}>
        {/* PTO by Department */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#002349',
          }}>
            <h2 style={{ fontSize: '18px', fontFamily: "'Playfair Display', serif", color: 'white' }}>
              PTO Hours by Department ({selectedYear})
            </h2>
          </div>
          {stats.ptoByDepartment.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#e2e8f0' }}>analytics</span>
              <div style={{ fontSize: '14px', color: '#666666', marginTop: '12px', fontStyle: 'italic' }}>
                No PTO data for this year
              </div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <th style={{ ...thStyle, color: '#002349' }}>Department</th>
                  <th style={{ ...thStyle, color: '#002349', textAlign: 'center' }}>Requests</th>
                  <th style={{ ...thStyle, color: '#002349', textAlign: 'right' }}>Hours</th>
                </tr>
              </thead>
              <tbody>
                {stats.ptoByDepartment.slice(0, 6).map((dept, index) => (
                  <tr key={dept.department} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '14px 24px', fontSize: '14px', fontWeight: 600, color: '#002349' }}>{dept.department}</td>
                    <td style={{ padding: '14px 24px', fontSize: '14px', color: '#64748b', textAlign: 'center' }}>{dept.count}</td>
                    <td style={{ padding: '14px 24px', fontSize: '14px', fontWeight: 700, color: '#C29B40', textAlign: 'right' }}>{dept.hours.toFixed(1)}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Upcoming Holidays */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#C29B40',
          }}>
            <h2 style={{ fontSize: '18px', fontFamily: "'Playfair Display', serif", color: 'white' }}>
              Upcoming Holidays
            </h2>
          </div>
          {stats.upcomingHolidays.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#e2e8f0' }}>celebration</span>
              <div style={{ fontSize: '14px', color: '#666666', marginTop: '12px', fontStyle: 'italic' }}>
                No upcoming holidays
              </div>
            </div>
          ) : (
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {stats.upcomingHolidays.map((holiday) => (
                  <div key={holiday.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#C29B40' }}>celebration</span>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#002349' }}>{holiday.name}</span>
                    </div>
                    <span style={{
                      backgroundColor: '#002349',
                      color: 'white',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}>
                      {new Date(holiday.holidayDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent PTO Requests */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '24px',
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#002349',
        }}>
          <h2 style={{ fontSize: '18px', fontFamily: "'Playfair Display', serif", color: 'white' }}>
            Recent PTO Requests
          </h2>
        </div>

        {/* Desktop Table */}
        <div className="admin-table-desktop">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th style={{ ...thStyle, color: '#002349' }}>Employee</th>
                <th style={{ ...thStyle, color: '#002349' }}>Department</th>
                <th style={{ ...thStyle, color: '#002349', textAlign: 'center' }}>Date</th>
                <th style={{ ...thStyle, color: '#002349', textAlign: 'center' }}>Hours</th>
                <th style={{ ...thStyle, color: '#002349', textAlign: 'center' }}>Status</th>
                <th style={{ ...thStyle, color: '#002349' }}>Requested</th>
              </tr>
            </thead>
            <tbody>
              {recentPtoRequests.map((request, index) => (
                <tr key={request.id} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: 600, color: '#002349' }}>{request.userName}</td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: '#64748b' }}>{request.department || "N/A"}</td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: '#64748b', textAlign: 'center' }}>
                    {formatPtoRequestDateDisplay(request)}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: 600, color: '#002349', textAlign: 'center' }}>{request.hours}h</td>
                  <td style={{ padding: '16px 24px', textAlign: 'center' }}>{getStatusBadge(request.status)}</td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: '#64748b' }}>
                    {new Date(request.requestedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="admin-cards-mobile">
          {recentPtoRequests.map((request) => (
            <div key={request.id} className="admin-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#002349' }}>{request.userName}</div>
                {getStatusBadge(request.status)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Date:</span>
                  <span style={{ color: '#002349', fontWeight: 600 }}>{formatPtoRequestDateDisplay(request)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Hours:</span>
                  <span style={{ color: '#002349', fontWeight: 600 }}>{request.hours}h</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Department:</span>
                  <span style={{ color: '#002349' }}>{request.department || "N/A"}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Requested:</span>
                  <span style={{ color: '#002349' }}>{new Date(request.requestedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderLeft: '4px solid #C29B40',
        borderRadius: '0 12px 12px 0',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
      }}>
        <span className="material-symbols-outlined" style={{ color: '#C29B40', fontSize: '20px' }}>info</span>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#002349', marginBottom: '4px' }}>
            Report Export Options
          </div>
          <div style={{ fontSize: '13px', color: '#666666', lineHeight: 1.6 }}>
            Use the <strong style={{ color: '#002349' }}>Export CSV</strong> button to download reports in spreadsheet-compatible format.
            Reports are filtered by the selected year. User reports include all employees (active and inactive).
          </div>
        </div>
      </div>
    </div>
  );
}
