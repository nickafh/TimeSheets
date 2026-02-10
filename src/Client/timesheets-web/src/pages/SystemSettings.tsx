import { useEffect, useState } from "react";
import { getSystemSettings, updateSystemSettings, type SystemSettingsDto } from "../api";

type SystemSettingsData = SystemSettingsDto;

const DEFAULT_SETTINGS: SystemSettingsData = {
  id: 1,
  companyName: "Atlanta Fine Homes Sotheby's International Realty",
  companyAddress: "3290 Northside Parkway NW, Suite 200, Atlanta, GA 30327",
  companyPhone: "(404) 237-5000",
  companyEmail: "hr@atlantafinehomes.com",
  standardWorkHoursPerDay: 8,
  workWeekStartDay: 1,
  fiscalYearStartMonth: 1,
  defaultPtoAllowance: 120,
  ptoAccrualEnabled: true,
  ptoAccrualRate: 4.62,
  maxPtoCarryover: 40,
  requirePtoApproval: true,
  minAdvanceNoticeDays: 3,
  allowFutureTimeEntries: false,
  maxPastEditDays: 14,
  requireDailyTimeEntry: false,
  lockEntriesAfterApproval: true,
  emailNotificationsEnabled: true,
  notifyManagerOnPtoRequest: true,
  notifyEmployeeOnPtoDecision: true,
  sendWeeklyReminders: true,
  reminderDayOfWeek: 5,
};

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function SystemSettings() {
  const [settings, setSettings] = useState<SystemSettingsData>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("company");

  useEffect(() => {
    let cancelled = false;
    getSystemSettings()
      .then((data) => {
        if (!cancelled) setSettings(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message ?? "Failed to load settings");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setLoadError(null);
    try {
      const updated = await updateSystemSettings(settings);
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset all settings to defaults? This only affects this form; save to apply.")) {
      setSettings({ ...DEFAULT_SETTINGS, id: settings.id });
    }
  };

  const updateSetting = <K extends keyof SystemSettingsData>(key: K, value: SystemSettingsData[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    fontSize: '14px',
    color: '#002349',
    border: '2px solid #e2e8f0',
    borderRadius: '6px',
    outline: 'none',
    backgroundColor: 'white',
    fontFamily: "'Montserrat', sans-serif",
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    color: '#002349',
  };

  const sectionStyle = (isActive: boolean) => ({
    padding: '12px 20px',
    fontSize: '13px',
    fontWeight: 600,
    color: isActive ? '#002349' : '#64748b',
    backgroundColor: isActive ? 'white' : 'transparent',
    border: 'none',
    borderLeft: isActive ? '3px solid #C29B40' : '3px solid transparent',
    cursor: 'pointer',
    textAlign: 'left' as const,
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    minHeight: '44px',
  });

  const sections = [
    { id: "company", label: "Company Information", icon: "business" },
    { id: "schedule", label: "Work Schedule", icon: "schedule" },
    { id: "pto", label: "PTO Configuration", icon: "beach_access" },
    { id: "timeentry", label: "Time Entry Rules", icon: "edit_calendar" },
    { id: "notifications", label: "Notifications", icon: "notifications" },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '36px', fontFamily: "'Playfair Display', serif", color: '#002349', marginBottom: '8px' }}>
            System Settings
          </h1>
          <p style={{ color: '#666666', fontSize: '15px' }}>
            Configure system-wide settings and preferences for the timesheet application.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleReset}
            style={{
              backgroundColor: 'white',
              color: '#64748b',
              padding: '12px 24px',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minHeight: '44px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>restart_alt</span>
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              backgroundColor: saved ? '#059669' : '#002349',
              color: 'white',
              padding: '12px 24px',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              borderRadius: '6px',
              border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minHeight: '44px',
            }}
          >
            {saving ? (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', animation: 'spin 1s linear infinite' }}>progress_activity</span>
                Saving...
              </>
            ) : saved ? (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                Saved!
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>save</span>
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {loadError && (
        <div style={{ padding: "12px 24px", marginBottom: "16px", backgroundColor: "#fef2f2", color: "#b91c1c", borderRadius: "8px", fontSize: "14px" }}>
          {loadError}
        </div>
      )}
      {loading && (
        <div style={{ padding: "24px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>
          Loading settings...
        </div>
      )}

      {/* Main Content */}
      {!loading && (
        <>
        {/* Mobile Section Dropdown */}
        <div className="settings-mobile-nav" style={{ marginBottom: '24px' }}>
          <select
            value={activeSection}
            onChange={(e) => setActiveSection(e.target.value as any)}
            style={{ width: '100%', padding: '12px 16px', fontSize: '16px', border: '2px solid #e2e8f0', borderRadius: '8px', backgroundColor: 'white', minHeight: '44px' }}
          >
            {sections.map(section => (
              <option key={section.id} value={section.id}>{section.label}</option>
            ))}
          </select>
        </div>

        <div className="settings-layout" style={{ gap: '24px' }}>
        {/* Sidebar Navigation */}
        <div className="settings-sidebar" style={{
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          overflow: 'hidden',
          height: 'fit-content',
        }}>
          <div style={{
            padding: '16px 20px',
            backgroundColor: '#002349',
          }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C29B40' }}>
              Settings
            </h2>
          </div>
          <div style={{ padding: '8px 0' }}>
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                style={sectionStyle(activeSection === section.id)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{section.icon}</span>
                {section.label}
              </button>
            ))}
          </div>
        </div>

        {/* Settings Content */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          {/* Company Information */}
          {activeSection === "company" && (
            <>
              <div style={{
                padding: '20px 24px',
                backgroundColor: '#002349',
              }}>
                <h2 style={{ fontSize: '18px', fontFamily: "'Playfair Display', serif", color: 'white', marginBottom: '4px' }}>
                  Company Information
                </h2>
                <p style={{ fontSize: '13px', color: '#C29B40' }}>
                  Basic information about your organization
                </p>
              </div>
              <div style={{ padding: '32px' }}>
                <div style={{ display: 'grid', gap: '24px' }}>
                  <div>
                    <label style={labelStyle}>Company Name</label>
                    <input
                      type="text"
                      value={settings.companyName}
                      onChange={(e) => updateSetting("companyName", e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Company Address</label>
                    <input
                      type="text"
                      value={settings.companyAddress}
                      onChange={(e) => updateSetting("companyAddress", e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div className="form-grid-2" style={{ gap: '16px' }}>
                    <div>
                      <label style={labelStyle}>Phone Number</label>
                      <input
                        type="text"
                        value={settings.companyPhone}
                        onChange={(e) => updateSetting("companyPhone", e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>System Email</label>
                      <input
                        type="email"
                        value={settings.companyEmail}
                        onChange={(e) => updateSetting("companyEmail", e.target.value)}
                        style={inputStyle}
                        placeholder="e.g. noreply@company.com"
                      />
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                        All email notifications from this app (PTO alerts, reminders, etc.) will be sent from this address.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Work Schedule */}
          {activeSection === "schedule" && (
            <>
              <div style={{
                padding: '20px 24px',
                backgroundColor: '#002349',
              }}>
                <h2 style={{ fontSize: '18px', fontFamily: "'Playfair Display', serif", color: 'white', marginBottom: '4px' }}>
                  Work Schedule
                </h2>
                <p style={{ fontSize: '13px', color: '#C29B40' }}>
                  Configure standard work hours and schedule settings
                </p>
              </div>
              <div style={{ padding: '32px' }}>
                <div style={{ display: 'grid', gap: '24px' }}>
                  <div className="form-grid-3" style={{ gap: '16px' }}>
                    <div>
                      <label style={labelStyle}>Standard Hours Per Day</label>
                      <input
                        type="number"
                        min={1}
                        max={24}
                        value={settings.standardWorkHoursPerDay}
                        onChange={(e) => updateSetting("standardWorkHoursPerDay", Number(e.target.value))}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Work Week Starts On</label>
                      <select
                        value={settings.workWeekStartDay}
                        onChange={(e) => updateSetting("workWeekStartDay", Number(e.target.value))}
                        style={{ ...inputStyle, cursor: 'pointer' }}
                      >
                        {DAYS_OF_WEEK.map((day, idx) => (
                          <option key={idx} value={idx}>{day}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Fiscal Year Starts</label>
                      <select
                        value={settings.fiscalYearStartMonth}
                        onChange={(e) => updateSetting("fiscalYearStartMonth", Number(e.target.value))}
                        style={{ ...inputStyle, cursor: 'pointer' }}
                      >
                        {MONTHS.map((month, idx) => (
                          <option key={idx} value={idx + 1}>{month}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '16px 20px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#C29B40' }}>info</span>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>
                        The standard work day of <strong style={{ color: '#002349' }}>{settings.standardWorkHoursPerDay} hours</strong> is used to calculate full-day PTO requests and time entry expectations.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* PTO Configuration */}
          {activeSection === "pto" && (
            <>
              <div style={{
                padding: '20px 24px',
                backgroundColor: '#002349',
              }}>
                <h2 style={{ fontSize: '18px', fontFamily: "'Playfair Display', serif", color: 'white', marginBottom: '4px' }}>
                  PTO Configuration
                </h2>
                <p style={{ fontSize: '13px', color: '#C29B40' }}>
                  Set up paid time off policies and accrual rules
                </p>
              </div>
              <div style={{ padding: '32px' }}>
                <div style={{ display: 'grid', gap: '24px' }}>
                  {/* Allowance Settings */}
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#002349', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Allowance Settings
                    </h3>
                    <div className="form-grid-2" style={{ gap: '16px' }}>
                      <div>
                        <label style={labelStyle}>Default Annual PTO (Hours)</label>
                        <input
                          type="number"
                          min={0}
                          value={settings.defaultPtoAllowance}
                          onChange={(e) => updateSetting("defaultPtoAllowance", Number(e.target.value))}
                          style={inputStyle}
                        />
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                          = {(settings.defaultPtoAllowance / settings.standardWorkHoursPerDay).toFixed(1)} days
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>Max Carryover (Hours)</label>
                        <input
                          type="number"
                          min={0}
                          value={settings.maxPtoCarryover}
                          onChange={(e) => updateSetting("maxPtoCarryover", Number(e.target.value))}
                          style={inputStyle}
                        />
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                          = {(settings.maxPtoCarryover / settings.standardWorkHoursPerDay).toFixed(1)} days
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Accrual Settings */}
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#002349', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Accrual Settings
                    </h3>
                    <div style={{ display: 'grid', gap: '16px' }}>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '16px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px',
                        cursor: 'pointer',
                      }}>
                        <input
                          type="checkbox"
                          checked={settings.ptoAccrualEnabled}
                          onChange={(e) => updateSetting("ptoAccrualEnabled", e.target.checked)}
                          style={{ width: '20px', height: '20px', accentColor: '#002349' }}
                        />
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#002349' }}>Enable PTO Accrual</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>PTO hours accumulate over time based on pay periods</div>
                        </div>
                      </label>

                      {settings.ptoAccrualEnabled && (
                        <div>
                          <label style={labelStyle}>Accrual Rate (Hours Per Pay Period)</label>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={settings.ptoAccrualRate}
                            onChange={(e) => updateSetting("ptoAccrualRate", Number(e.target.value))}
                            style={{ ...inputStyle, maxWidth: '200px' }}
                          />
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                            Bi-weekly: ~{(settings.ptoAccrualRate * 26 / settings.standardWorkHoursPerDay).toFixed(1)} days/year
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Request Settings */}
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#002349', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Request Settings
                    </h3>
                    <div style={{ display: 'grid', gap: '16px' }}>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '16px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px',
                        cursor: 'pointer',
                      }}>
                        <input
                          type="checkbox"
                          checked={settings.requirePtoApproval}
                          onChange={(e) => updateSetting("requirePtoApproval", e.target.checked)}
                          style={{ width: '20px', height: '20px', accentColor: '#002349' }}
                        />
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#002349' }}>Require Manager Approval</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>PTO requests must be approved by a manager before taking effect</div>
                        </div>
                      </label>

                      <div>
                        <label style={labelStyle}>Minimum Advance Notice (Days)</label>
                        <input
                          type="number"
                          min={0}
                          value={settings.minAdvanceNoticeDays}
                          onChange={(e) => updateSetting("minAdvanceNoticeDays", Number(e.target.value))}
                          style={{ ...inputStyle, maxWidth: '200px' }}
                        />
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                          Employees must request PTO at least this many days in advance
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Time Entry Rules */}
          {activeSection === "timeentry" && (
            <>
              <div style={{
                padding: '20px 24px',
                backgroundColor: '#002349',
              }}>
                <h2 style={{ fontSize: '18px', fontFamily: "'Playfair Display', serif", color: 'white', marginBottom: '4px' }}>
                  Time Entry Rules
                </h2>
                <p style={{ fontSize: '13px', color: '#C29B40' }}>
                  Configure rules for entering and editing time entries
                </p>
              </div>
              <div style={{ padding: '32px' }}>
                <div style={{ display: 'grid', gap: '24px' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}>
                    <input
                      type="checkbox"
                      checked={settings.allowFutureTimeEntries}
                      onChange={(e) => updateSetting("allowFutureTimeEntries", e.target.checked)}
                      style={{ width: '20px', height: '20px', accentColor: '#002349' }}
                    />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#002349' }}>Allow Future Time Entries</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Employees can enter time for dates in the future</div>
                    </div>
                  </label>

                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}>
                    <input
                      type="checkbox"
                      checked={settings.requireDailyTimeEntry}
                      onChange={(e) => updateSetting("requireDailyTimeEntry", e.target.checked)}
                      style={{ width: '20px', height: '20px', accentColor: '#002349' }}
                    />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#002349' }}>Require Daily Time Entry</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Employees are prompted to enter time each day</div>
                    </div>
                  </label>

                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}>
                    <input
                      type="checkbox"
                      checked={settings.lockEntriesAfterApproval}
                      onChange={(e) => updateSetting("lockEntriesAfterApproval", e.target.checked)}
                      style={{ width: '20px', height: '20px', accentColor: '#002349' }}
                    />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#002349' }}>Lock Entries After Approval</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Time entries cannot be edited after manager approval</div>
                    </div>
                  </label>

                  <div>
                    <label style={labelStyle}>Maximum Days to Edit Past Entries</label>
                    <input
                      type="number"
                      min={0}
                      value={settings.maxPastEditDays}
                      onChange={(e) => updateSetting("maxPastEditDays", Number(e.target.value))}
                      style={{ ...inputStyle, maxWidth: '200px' }}
                    />
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                      Employees can edit entries up to {settings.maxPastEditDays} days in the past (0 = unlimited)
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Notifications */}
          {activeSection === "notifications" && (
            <>
              <div style={{
                padding: '20px 24px',
                backgroundColor: '#002349',
              }}>
                <h2 style={{ fontSize: '18px', fontFamily: "'Playfair Display', serif", color: 'white', marginBottom: '4px' }}>
                  Notifications
                </h2>
                <p style={{ fontSize: '13px', color: '#C29B40' }}>
                  Configure email notifications and reminders
                </p>
              </div>
              <div style={{ padding: '32px' }}>
                <div style={{ display: 'grid', gap: '24px' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px',
                    backgroundColor: settings.emailNotificationsEnabled ? 'rgba(5, 150, 105, 0.05)' : '#f8fafc',
                    border: settings.emailNotificationsEnabled ? '1px solid rgba(5, 150, 105, 0.2)' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}>
                    <input
                      type="checkbox"
                      checked={settings.emailNotificationsEnabled}
                      onChange={(e) => updateSetting("emailNotificationsEnabled", e.target.checked)}
                      style={{ width: '20px', height: '20px', accentColor: '#059669' }}
                    />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#002349' }}>Enable Email Notifications</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Send email notifications for system events</div>
                    </div>
                  </label>

                  {settings.emailNotificationsEnabled && (
                    <>
                      <div>
                        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#002349', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          PTO Notifications
                        </h3>
                        <div style={{ display: 'grid', gap: '12px' }}>
                          <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 16px',
                            backgroundColor: '#f8fafc',
                            borderRadius: '8px',
                            cursor: 'pointer',
                          }}>
                            <input
                              type="checkbox"
                              checked={settings.notifyManagerOnPtoRequest}
                              onChange={(e) => updateSetting("notifyManagerOnPtoRequest", e.target.checked)}
                              style={{ width: '18px', height: '18px', accentColor: '#002349' }}
                            />
                            <div style={{ fontSize: '14px', color: '#002349' }}>
                              Notify managers when employees submit PTO requests
                            </div>
                          </label>

                          <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 16px',
                            backgroundColor: '#f8fafc',
                            borderRadius: '8px',
                            cursor: 'pointer',
                          }}>
                            <input
                              type="checkbox"
                              checked={settings.notifyEmployeeOnPtoDecision}
                              onChange={(e) => updateSetting("notifyEmployeeOnPtoDecision", e.target.checked)}
                              style={{ width: '18px', height: '18px', accentColor: '#002349' }}
                            />
                            <div style={{ fontSize: '14px', color: '#002349' }}>
                              Notify employees when their PTO request is approved or denied
                            </div>
                          </label>
                        </div>
                      </div>

                      <div>
                        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#002349', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Reminders
                        </h3>
                        <label style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px 16px',
                          backgroundColor: '#f8fafc',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          marginBottom: '16px',
                        }}>
                          <input
                            type="checkbox"
                            checked={settings.sendWeeklyReminders}
                            onChange={(e) => updateSetting("sendWeeklyReminders", e.target.checked)}
                            style={{ width: '18px', height: '18px', accentColor: '#002349' }}
                          />
                          <div style={{ fontSize: '14px', color: '#002349' }}>
                            Send weekly timesheet reminders
                          </div>
                        </label>

                        {settings.sendWeeklyReminders && (
                          <div>
                            <label style={labelStyle}>Reminder Day</label>
                            <select
                              value={settings.reminderDayOfWeek}
                              onChange={(e) => updateSetting("reminderDayOfWeek", Number(e.target.value))}
                              style={{ ...inputStyle, maxWidth: '200px', cursor: 'pointer' }}
                            >
                              {DAYS_OF_WEEK.map((day, idx) => (
                                <option key={idx} value={idx}>{day}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tips */}
      <div style={{
        marginTop: '24px',
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
            Settings Information
          </div>
          <div style={{ fontSize: '13px', color: '#666666' }}>
            Changes to these settings will apply to all users in the system. Some changes may require users to refresh their browser to see the updates.
            <strong style={{ color: '#002349' }}> Click "Save Changes"</strong> to apply your modifications.
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
