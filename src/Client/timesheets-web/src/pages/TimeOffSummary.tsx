import { useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import {
  fetchHolidays,
  fetchEarlyClosures,
  fetchUserPtoSummary,
  getSystemSettings,
  type HolidayDto,
  type EarlyClosureDto,
  type UserPtoSummary,
  type SystemSettingsDto,
} from "../api";
import { useToast } from "../components/Toast";
import { LoadingSpinner } from "../components/LoadingSpinner";

const TimeOffSummary = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [holidays, setHolidays] = useState<HolidayDto[]>([]);
  const [closures, setClosures] = useState<EarlyClosureDto[]>([]);
  const [ptoSummary, setPtoSummary] = useState<UserPtoSummary | null>(null);
  const [sysSettings, setSysSettings] = useState<SystemSettingsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPto, setLoadingPto] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadPtoSummary();
  }, [user?.id, selectedYear]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [holidayData, closureData, settingsData] = await Promise.all([
        fetchHolidays(),
        fetchEarlyClosures(),
        getSystemSettings(),
      ]);
      setHolidays(holidayData);
      setClosures(closureData);
      setSysSettings(settingsData);
    } catch (error) {
      console.error("Failed to load data:", error);
      showToast("Failed to load time off data.", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadPtoSummary = async () => {
    if (!user?.id) return;
    try {
      setLoadingPto(true);
      const summary = await fetchUserPtoSummary(user.id, selectedYear);
      setPtoSummary(summary);
    } catch (error) {
      console.error("Failed to load PTO summary:", error);
      showToast("Failed to load PTO summary.", "error");
    } finally {
      setLoadingPto(false);
    }
  };

  const filteredHolidays = holidays.filter(h => {
    const year = new Date(h.holidayDate).getFullYear();
    return year === selectedYear;
  });

  const filteredClosures = closures.filter(c => {
    const year = new Date(c.closureDate).getFullYear();
    return year === selectedYear;
  });

  const isPast = (date: string) => {
    return new Date(date) < new Date(new Date().toDateString());
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '36px', fontFamily: "'Playfair Display', serif", color: '#002349', marginBottom: '8px' }}>
          Time Off Summary
        </h1>
        <p style={{ color: '#666666', fontSize: '15px' }}>
          View your PTO balances, company holidays, and early closures.
        </p>
      </div>

      {/* Overview Stats Cards */}
      <div className="stats-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '32px' }}>
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
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#059669' }}>event_available</span>
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '8px' }}>
            Available PTO
          </div>
          <div style={{ fontSize: '36px', fontWeight: 700, color: '#059669' }}>
            {loadingPto ? '—' : ptoSummary?.paidTimeOffRemaining.toFixed(1) ?? '0.0'}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>hours (Paid Time Off only)</div>
        </div>

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
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#002349' }}>check_circle</span>
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '8px' }}>
            Used YTD
          </div>
          <div style={{ fontSize: '36px', fontWeight: 700, color: '#002349' }}>
            {loadingPto ? '—' : ptoSummary?.totalApproved.toFixed(1) ?? '0.0'}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>hours</div>
        </div>

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
            backgroundColor: 'rgba(194, 155, 64, 0.1)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#C29B40' }}>calendar_month</span>
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '8px' }}>
            Total Allowed
          </div>
          <div style={{ fontSize: '36px', fontWeight: 700, color: '#C29B40' }}>
            {loadingPto ? '—' : ptoSummary?.totalAllowed.toFixed(1) ?? '0.0'}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>hours in {selectedYear}</div>
        </div>

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
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#002349' }}>celebration</span>
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '8px' }}>
            Company Holidays
          </div>
          <div style={{ fontSize: '36px', fontWeight: 700, color: '#002349' }}>
            {loading ? '—' : filteredHolidays.length}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>in {selectedYear}</div>
        </div>
      </div>

      {/* Time Off Balances Table */}
      <div className="table-scroll" style={{
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '32px',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#002349' }}>
              <th style={{
                padding: '16px 24px',
                textAlign: 'left',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#C29B40',
              }}>
                Type of Time Off
              </th>
              <th style={{
                padding: '16px 24px',
                textAlign: 'right',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#C29B40',
              }}>
                {selectedYear} Hours Allowed
              </th>
              <th style={{
                padding: '16px 24px',
                textAlign: 'right',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#C29B40',
              }}>
                Hours Approved
              </th>
              <th style={{
                padding: '16px 24px',
                textAlign: 'right',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#C29B40',
              }}>
                Remaining Hours
              </th>
            </tr>
          </thead>
          <tbody>
            {loadingPto ? (
              <tr>
                <td colSpan={4} style={{ padding: '32px', textAlign: 'center' }}>
                  <LoadingSpinner size="sm" />
                </td>
              </tr>
            ) : ptoSummary?.balances.map((balance, index) => (
              <tr key={balance.typeName} style={{ backgroundColor: index % 2 === 0 ? '#f8fafc' : 'white', borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: 600, color: '#002349' }}>
                  {balance.typeName}
                </td>
                <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: '14px', color: '#64748b' }}>
                  {balance.hoursAllowed.toFixed(1)}
                </td>
                <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: '14px', color: '#64748b' }}>
                  {balance.hoursApproved.toFixed(1)}
                </td>
                <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: '14px', fontWeight: 700, color: balance.hoursRemaining > 0 ? '#059669' : '#002349' }}>
                  {balance.hoursRemaining.toFixed(1)}
                </td>
              </tr>
            ))}
            {/* Totals row */}
            {!loadingPto && ptoSummary && (
              <tr style={{ backgroundColor: '#002349' }}>
                <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: 700, color: 'white' }}>
                  Total
                </td>
                <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: '14px', fontWeight: 700, color: '#C29B40' }}>
                  {ptoSummary.totalAllowed.toFixed(1)}
                </td>
                <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: '14px', fontWeight: 700, color: '#C29B40' }}>
                  {ptoSummary.totalApproved.toFixed(1)}
                </td>
                <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: '14px', fontWeight: 700, color: '#C29B40' }}>
                  {ptoSummary.totalRemaining.toFixed(1)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* First-Year Accrual Banner */}
      {ptoSummary?.isFirstYearAccrual && (
        <div style={{
          backgroundColor: 'rgba(194, 155, 64, 0.05)',
          border: '1px solid rgba(194, 155, 64, 0.3)',
          borderLeft: '4px solid #C29B40',
          borderRadius: '0 8px 8px 0',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <span className="material-symbols-outlined" style={{ color: '#C29B40', fontSize: '24px' }}>info</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#002349', marginBottom: '2px' }}>
              First-Year PTO Accrual
            </div>
            <div style={{ fontSize: '13px', color: '#666666' }}>
              As a first-year employee, your PTO accrues each pay period. You have accrued <strong style={{ color: '#002349' }}>{ptoSummary.accruedHours.toFixed(1)} hours</strong> of your <strong style={{ color: '#002349' }}>{ptoSummary.annualAllowanceHours.toFixed(0)} hour</strong> annual allowance so far.
            </div>
          </div>
        </div>
      )}

      {/* PTO Policy Section */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '32px',
        marginBottom: '32px',
      }}>
        <h2 style={{ fontSize: '24px', fontFamily: "'Playfair Display', serif", color: '#002349', marginBottom: '12px' }}>
          Paid Time Off (PTO) Policy
        </h2>
        <p style={{ fontSize: '14px', color: '#666666', marginBottom: '24px', lineHeight: 1.6 }}>
          PTO is an all-purpose time off policy for employees to use for vacation, illness or personal business.
        </p>
        <div className="policy-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {[
            {
              label: `Years 1–${sysSettings?.ptoTier1MaxYears ?? 5}`,
              days: sysSettings?.ptoTier1AnnualDays ?? 18,
              tier: 1,
            },
            {
              label: `Years ${(sysSettings?.ptoTier1MaxYears ?? 5) + 1}–${sysSettings?.ptoTier2MaxYears ?? 10}`,
              days: sysSettings?.ptoTier2AnnualDays ?? 23,
              tier: 2,
            },
            {
              label: `Years ${(sysSettings?.ptoTier2MaxYears ?? 10)}+`,
              days: sysSettings?.ptoTier3AnnualDays ?? 28,
              tier: 3,
            },
          ].map((t) => {
            const isCurrentTier = ptoSummary?.currentTier === t.tier;
            return (
              <div key={t.tier} style={{
                backgroundColor: isCurrentTier ? 'rgba(194, 155, 64, 0.05)' : '#f8fafc',
                border: isCurrentTier ? '2px solid #C29B40' : '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '24px',
                textAlign: 'center',
                position: 'relative',
              }}>
                {isCurrentTier && (
                  <div style={{
                    position: 'absolute',
                    top: '-10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#C29B40',
                    color: 'white',
                    fontSize: '9px',
                    fontWeight: 700,
                    padding: '2px 10px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    Your Tier
                  </div>
                )}
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '8px' }}>
                  {t.label}
                </div>
                <div style={{ fontSize: '36px', fontFamily: "'Playfair Display', serif", fontWeight: 700, color: '#002349' }}>
                  {t.days}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>days per year</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Year Filter */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <label style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#002349' }}>
          Year:
        </label>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          style={{
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: 600,
            color: '#002349',
            border: '2px solid #e2e8f0',
            borderRadius: '6px',
            outline: 'none',
            cursor: 'pointer',
            backgroundColor: 'white',
          }}
        >
          {[2024, 2025, 2026, 2027, 2028].map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {/* Side-by-side: Holidays and Early Closures */}
      <div className="split-panels" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        {/* Left: Company Holidays */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <div style={{
            backgroundColor: '#002349',
            padding: '20px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h2 style={{ fontSize: '18px', fontFamily: "'Playfair Display', serif", color: 'white' }}>
              Company Holidays
            </h2>
            <span style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              fontSize: '10px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {filteredHolidays.filter(h => !isPast(h.holidayDate)).length} Upcoming
            </span>
          </div>

          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <LoadingSpinner size="sm" />
            </div>
          ) : filteredHolidays.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#e2e8f0' }}>event_busy</span>
              <div style={{ fontSize: '14px', color: '#666666', marginTop: '12px', fontStyle: 'italic' }}>
                No holidays found for {selectedYear}
              </div>
            </div>
          ) : (
            <div style={{ padding: '16px', maxHeight: '400px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredHolidays.map((holiday) => {
                  const date = new Date(holiday.holidayDate);
                  const past = isPast(holiday.holidayDate);

                  return (
                    <div
                      key={holiday.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '16px',
                        borderRadius: '8px',
                        border: past ? '1px solid #e2e8f0' : '1px solid rgba(194, 155, 64, 0.2)',
                        backgroundColor: past ? '#f8fafc' : 'rgba(194, 155, 64, 0.05)',
                        opacity: past ? 0.6 : 1,
                      }}
                    >
                      <div style={{
                        width: '44px',
                        height: '44px',
                        backgroundColor: 'white',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '12px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        border: '1px solid #f1f5f9',
                        fontSize: '20px',
                      }}>
                        🎉
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: past ? '#64748b' : '#002349' }}>
                          {holiday.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666666' }}>
                          {date.toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                          })}
                        </div>
                      </div>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: past ? '#94a3b8' : '#059669',
                      }}>
                        {past ? "Past" : "Upcoming"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid #f1f5f9',
            backgroundColor: '#f8fafc',
          }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: '#999999', letterSpacing: '0.1em' }}>
              Total: {filteredHolidays.length} holidays in {selectedYear}
            </span>
          </div>
        </div>

        {/* Right: Early Closures */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <div style={{
            backgroundColor: '#C29B40',
            padding: '20px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h2 style={{ fontSize: '18px', fontFamily: "'Playfair Display', serif", color: 'white' }}>
              Early Closures
            </h2>
            <span style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              fontSize: '10px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {filteredClosures.filter(c => !isPast(c.closureDate)).length} Upcoming
            </span>
          </div>

          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <LoadingSpinner size="sm" />
            </div>
          ) : filteredClosures.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#e2e8f0' }}>event_busy</span>
              <div style={{ fontSize: '14px', color: '#666666', marginTop: '12px', fontStyle: 'italic' }}>
                No early closures found for {selectedYear}
              </div>
            </div>
          ) : (
            <div style={{ padding: '16px', maxHeight: '400px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredClosures.map((closure) => {
                  const date = new Date(closure.closureDate);
                  const past = isPast(closure.closureDate);

                  return (
                    <div
                      key={closure.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '16px',
                        borderRadius: '8px',
                        border: past ? '1px solid #e2e8f0' : '1px solid rgba(194, 155, 64, 0.2)',
                        backgroundColor: past ? '#f8fafc' : 'rgba(194, 155, 64, 0.05)',
                        opacity: past ? 0.6 : 1,
                      }}
                    >
                      <div style={{
                        width: '44px',
                        height: '44px',
                        backgroundColor: 'white',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '12px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        border: '1px solid #f1f5f9',
                      }}>
                        <span className="material-symbols-outlined" style={{ color: '#C29B40', fontSize: '20px' }}>schedule</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: past ? '#64748b' : '#002349' }}>
                          {closure.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666666' }}>
                          {date.toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                          })}
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#C29B40', marginTop: '2px' }}>
                          Close at {closure.closeTime}
                        </div>
                      </div>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: past ? '#94a3b8' : '#C29B40',
                      }}>
                        {past ? "Past" : "Upcoming"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid #f1f5f9',
            backgroundColor: '#f8fafc',
          }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: '#999999', letterSpacing: '0.1em' }}>
              Total: {filteredClosures.length} early closures in {selectedYear}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeOffSummary;
