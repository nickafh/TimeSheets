import { useEffect, useState } from "react";
import {
  fetchHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  fetchEarlyClosures,
  createEarlyClosure,
  updateEarlyClosure,
  deleteEarlyClosure,
  type HolidayDto,
  type EarlyClosureDto,
} from "../api";

export default function ManageHolidays() {
  const [holidays, setHolidays] = useState<HolidayDto[]>([]);
  const [closures, setClosures] = useState<EarlyClosureDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Holiday modal state
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<HolidayDto | null>(null);
  const [holidayForm, setHolidayForm] = useState({
    name: "",
    holidayDate: "",
  });

  // Early closure modal state
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [editingClosure, setEditingClosure] = useState<EarlyClosureDto | null>(null);
  const [closureForm, setClosureForm] = useState({
    name: "",
    closureDate: "",
    closeTime: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [holidayData, closureData] = await Promise.all([
        fetchHolidays(),
        fetchEarlyClosures(),
      ]);
      setHolidays(holidayData);
      setClosures(closureData);
    } catch (error) {
      console.error("Failed to load data:", error);
      alert("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Holiday handlers
  const openAddHolidayModal = () => {
    setEditingHoliday(null);
    setHolidayForm({ name: "", holidayDate: "" });
    setShowHolidayModal(true);
  };

  const openEditHolidayModal = (holiday: HolidayDto) => {
    setEditingHoliday(holiday);
    setHolidayForm({
      name: holiday.name,
      holidayDate: new Date(holiday.holidayDate).toISOString().split("T")[0],
    });
    setShowHolidayModal(true);
  };

  const handleHolidaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayForm.name || !holidayForm.holidayDate) {
      alert("Name and Date are required");
      return;
    }

    try {
      if (editingHoliday) {
        await updateHoliday(editingHoliday.id, {
          id: editingHoliday.id,
          name: holidayForm.name,
          holidayDate: holidayForm.holidayDate,
        });
        alert("Holiday updated successfully!");
      } else {
        await createHoliday({
          name: holidayForm.name,
          holidayDate: holidayForm.holidayDate,
        });
        alert("Holiday created successfully!");
      }
      setShowHolidayModal(false);
      await loadData();
    } catch (error) {
      console.error("Failed to save holiday:", error);
      alert("Failed to save holiday. Please try again.");
    }
  };

  const handleDeleteHoliday = async (holiday: HolidayDto) => {
    if (!confirm(`Are you sure you want to delete "${holiday.name}"?`)) return;
    try {
      await deleteHoliday(holiday.id);
      await loadData();
      alert("Holiday deleted successfully!");
    } catch (error) {
      console.error("Failed to delete holiday:", error);
      alert("Failed to delete holiday. Please try again.");
    }
  };

  // Early closure handlers
  const openAddClosureModal = () => {
    setEditingClosure(null);
    setClosureForm({ name: "", closureDate: "", closeTime: "" });
    setShowClosureModal(true);
  };

  const openEditClosureModal = (closure: EarlyClosureDto) => {
    setEditingClosure(closure);
    setClosureForm({
      name: closure.name,
      closureDate: new Date(closure.closureDate).toISOString().split("T")[0],
      closeTime: closure.closeTime,
    });
    setShowClosureModal(true);
  };

  const handleClosureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closureForm.name || !closureForm.closureDate || !closureForm.closeTime) {
      alert("Name, Date, and Close Time are required");
      return;
    }

    try {
      if (editingClosure) {
        await updateEarlyClosure(editingClosure.id, {
          id: editingClosure.id,
          name: closureForm.name,
          closureDate: closureForm.closureDate,
          closeTime: closureForm.closeTime,
        });
        alert("Early closure updated successfully!");
      } else {
        await createEarlyClosure({
          name: closureForm.name,
          closureDate: closureForm.closureDate,
          closeTime: closureForm.closeTime,
        });
        alert("Early closure created successfully!");
      }
      setShowClosureModal(false);
      await loadData();
    } catch (error) {
      console.error("Failed to save early closure:", error);
      alert("Failed to save early closure. Please try again.");
    }
  };

  const handleDeleteClosure = async (closure: EarlyClosureDto) => {
    if (!confirm(`Are you sure you want to delete "${closure.name}"?`)) return;
    try {
      await deleteEarlyClosure(closure.id);
      await loadData();
      alert("Early closure deleted successfully!");
    } catch (error) {
      console.error("Failed to delete early closure:", error);
      alert("Failed to delete early closure. Please try again.");
    }
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

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F8F9FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#002349', animation: 'spin 1s linear infinite' }}>progress_activity</span>
        <span style={{ marginLeft: '12px', fontSize: '18px', fontWeight: 600, color: '#002349' }}>Loading...</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8F9FA', padding: '40px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '36px', fontFamily: "'Playfair Display', serif", color: '#002349', marginBottom: '8px' }}>
            Manage Holidays & Early Closures
          </h1>
          <p style={{ color: '#666666', fontSize: '15px' }}>
            Add, edit, and remove company holidays and early closures.
          </p>
        </div>

        {/* Year Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
              border: '2px solid #002349',
              borderRadius: '6px',
              backgroundColor: 'white',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {[2024, 2025, 2026, 2027, 2028].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ marginBottom: '24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '20px',
          textAlign: 'center',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'rgba(0, 35, 73, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#002349' }}>celebration</span>
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '4px' }}>
            Total Holidays
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#002349' }}>{filteredHolidays.length}</div>
        </div>

        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '20px',
          textAlign: 'center',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'rgba(5, 150, 105, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#059669' }}>event_available</span>
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '4px' }}>
            Upcoming Holidays
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#059669' }}>
            {filteredHolidays.filter(h => !isPast(h.holidayDate)).length}
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '20px',
          textAlign: 'center',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'rgba(194, 155, 64, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#C29B40' }}>schedule</span>
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '4px' }}>
            Total Early Closures
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#C29B40' }}>{filteredClosures.length}</div>
        </div>

        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '20px',
          textAlign: 'center',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'rgba(217, 119, 6, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#d97706' }}>timer</span>
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '4px' }}>
            Upcoming Closures
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#d97706' }}>
            {filteredClosures.filter(c => !isPast(c.closureDate)).length}
          </div>
        </div>
      </div>

      {/* Side-by-side layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Left: Holidays */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '16px 24px',
            backgroundColor: '#002349',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <h2 style={{ fontSize: '18px', fontFamily: "'Playfair Display', serif", color: 'white', marginBottom: '4px' }}>
                Company Holidays
              </h2>
              <span style={{ fontSize: '12px', color: '#C29B40' }}>
                {filteredHolidays.length} holidays in {selectedYear}
              </span>
            </div>
            <button
              onClick={openAddHolidayModal}
              style={{
                backgroundColor: 'white',
                color: '#002349',
                padding: '8px 16px',
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
              Add Holiday
            </button>
          </div>

          {filteredHolidays.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#e2e8f0' }}>celebration</span>
              <p style={{ fontSize: '14px', color: '#666666', marginTop: '12px', fontStyle: 'italic' }}>
                No holidays for {selectedYear}
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {filteredHolidays.map((holiday, index) => (
                  <tr key={holiday.id} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '14px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(0, 35, 73, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#002349' }}>celebration</span>
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 500, color: '#002349' }}>
                            {holiday.name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            {new Date(holiday.holidayDate).toLocaleDateString("en-US", { weekday: "long" })}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: '#002349' }}>
                        {new Date(holiday.holidayDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                      <span style={{
                        marginTop: '4px',
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        ...(isPast(holiday.holidayDate)
                          ? { backgroundColor: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }
                          : { backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }
                        ),
                      }}>
                        {isPast(holiday.holidayDate) ? "Past" : "Upcoming"}
                      </span>
                    </td>
                    <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          onClick={() => openEditHolidayModal(holiday)}
                          style={{
                            backgroundColor: '#002349',
                            color: 'white',
                            padding: '6px 10px',
                            fontSize: '10px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            borderRadius: '4px',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteHoliday(holiday)}
                          style={{
                            backgroundColor: 'white',
                            color: '#dc2626',
                            padding: '6px 10px',
                            fontSize: '10px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            borderRadius: '4px',
                            border: '1px solid #fecaca',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right: Early Closures */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '16px 24px',
            backgroundColor: '#C29B40',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <h2 style={{ fontSize: '18px', fontFamily: "'Playfair Display', serif", color: 'white', marginBottom: '4px' }}>
                Early Closures
              </h2>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
                {filteredClosures.length} early closures in {selectedYear}
              </span>
            </div>
            <button
              onClick={openAddClosureModal}
              style={{
                backgroundColor: 'white',
                color: '#C29B40',
                padding: '8px 16px',
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
              Add Closure
            </button>
          </div>

          {filteredClosures.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#e2e8f0' }}>schedule</span>
              <p style={{ fontSize: '14px', color: '#666666', marginTop: '12px', fontStyle: 'italic' }}>
                No early closures for {selectedYear}
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {filteredClosures.map((closure, index) => (
                  <tr key={closure.id} style={{ backgroundColor: index % 2 === 0 ? 'white' : 'rgba(194, 155, 64, 0.05)', borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '14px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(194, 155, 64, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#C29B40' }}>schedule</span>
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 500, color: '#002349' }}>
                            {closure.name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            {new Date(closure.closureDate).toLocaleDateString("en-US", { weekday: "long" })}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: '#002349' }}>
                        {new Date(closure.closureDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#C29B40', marginTop: '2px' }}>
                        Close at {closure.closeTime}
                      </div>
                      <span style={{
                        marginTop: '4px',
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        ...(isPast(closure.closureDate)
                          ? { backgroundColor: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }
                          : { backgroundColor: 'rgba(194, 155, 64, 0.1)', color: '#C29B40', border: '1px solid rgba(194, 155, 64, 0.3)' }
                        ),
                      }}>
                        {isPast(closure.closureDate) ? "Past" : "Upcoming"}
                      </span>
                    </td>
                    <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          onClick={() => openEditClosureModal(closure)}
                          style={{
                            backgroundColor: '#C29B40',
                            color: 'white',
                            padding: '6px 10px',
                            fontSize: '10px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            borderRadius: '4px',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteClosure(closure)}
                          style={{
                            backgroundColor: 'white',
                            color: '#dc2626',
                            padding: '6px 10px',
                            fontSize: '10px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            borderRadius: '4px',
                            border: '1px solid #fecaca',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            Holiday Management
          </div>
          <div style={{ fontSize: '13px', color: '#666666' }}>
            <strong style={{ color: '#002349' }}>Holidays</strong> are full-day office closures.
            <strong style={{ color: '#C29B40' }}> Early Closures</strong> indicate days when the office closes earlier than usual. Both will appear on the team calendar.
          </div>
        </div>
      </div>

      {/* Holiday Modal */}
      {showHolidayModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}>
          <div style={{
            width: '100%',
            maxWidth: '480px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              backgroundColor: '#002349',
            }}>
              <h2 style={{ fontSize: '20px', fontFamily: "'Playfair Display', serif", color: 'white', marginBottom: '4px' }}>
                {editingHoliday ? "Edit Holiday" : "Add Holiday"}
              </h2>
              <p style={{ fontSize: '13px', color: '#C29B40' }}>
                {editingHoliday ? "Update holiday details" : "Create a new company holiday"}
              </p>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleHolidaySubmit} style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>
                  Holiday Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={holidayForm.name}
                  onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                  placeholder="e.g., Christmas Day"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>
                  Date <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="date"
                  required
                  value={holidayForm.holidayDate}
                  onChange={(e) => setHolidayForm({ ...holidayForm, holidayDate: e.target.value })}
                  style={inputStyle}
                />
              </div>

              {holidayForm.holidayDate && (
                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '20px',
                }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '4px' }}>
                    Preview
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#002349' }}>
                    {formatDate(holidayForm.holidayDate)}
                  </div>
                </div>
              )}

              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
                paddingTop: '16px',
                borderTop: '1px solid #e2e8f0',
              }}>
                <button
                  type="button"
                  onClick={() => setShowHolidayModal(false)}
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
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    backgroundColor: '#002349',
                    color: 'white',
                    padding: '12px 24px',
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
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                    {editingHoliday ? "save" : "add"}
                  </span>
                  {editingHoliday ? "Update Holiday" : "Add Holiday"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Early Closure Modal */}
      {showClosureModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}>
          <div style={{
            width: '100%',
            maxWidth: '480px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              backgroundColor: '#C29B40',
            }}>
              <h2 style={{ fontSize: '20px', fontFamily: "'Playfair Display', serif", color: 'white', marginBottom: '4px' }}>
                {editingClosure ? "Edit Early Closure" : "Add Early Closure"}
              </h2>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
                {editingClosure ? "Update early closure details" : "Create a new early closure"}
              </p>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleClosureSubmit} style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>
                  Event Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={closureForm.name}
                  onChange={(e) => setClosureForm({ ...closureForm, name: e.target.value })}
                  placeholder="e.g., Christmas Eve Early Close"
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={labelStyle}>
                    Date <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={closureForm.closureDate}
                    onChange={(e) => setClosureForm({ ...closureForm, closureDate: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>
                    Close Time <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={closureForm.closeTime}
                    onChange={(e) => setClosureForm({ ...closureForm, closeTime: e.target.value })}
                    placeholder="e.g., 2:00 PM"
                    style={inputStyle}
                  />
                </div>
              </div>

              {closureForm.closureDate && (
                <div style={{
                  backgroundColor: 'rgba(194, 155, 64, 0.05)',
                  border: '1px solid rgba(194, 155, 64, 0.2)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '20px',
                }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '4px' }}>
                    Preview
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#002349' }}>
                    {formatDate(closureForm.closureDate)}
                    {closureForm.closeTime && (
                      <span style={{ color: '#C29B40', marginLeft: '8px' }}>
                        (Close at {closureForm.closeTime})
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
                paddingTop: '16px',
                borderTop: '1px solid #e2e8f0',
              }}>
                <button
                  type="button"
                  onClick={() => setShowClosureModal(false)}
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
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    backgroundColor: '#C29B40',
                    color: 'white',
                    padding: '12px 24px',
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
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                    {editingClosure ? "save" : "add"}
                  </span>
                  {editingClosure ? "Update Closure" : "Add Closure"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
