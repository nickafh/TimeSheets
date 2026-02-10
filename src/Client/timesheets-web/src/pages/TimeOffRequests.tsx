import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface RequestRow {
  id: number;
  date: string;
  hours: number;
  type: string;
  status: "Pending" | "Approved" | "Denied";
  comment?: string;
}

const initialRequests: RequestRow[] = [
  {
    id: 1,
    date: "11/22/2025",
    hours: 8,
    type: "Paid Time Off",
    status: "Approved",
    comment: "Family event",
  },
];

const TimeOffRequests = () => {
  const [requests] = useState<RequestRow[]>(initialRequests);
  const navigate = useNavigate();

  const approvedRequests = requests.filter(r => r.status === "Approved" || r.status === "Denied");
  const pendingRequests = requests.filter(r => r.status === "Pending");

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Approved":
        return { backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' };
      case "Denied":
        return { backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' };
      case "Pending":
        return { backgroundColor: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' };
      default:
        return { backgroundColor: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' };
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8F9FA' , padding: '40px' }}>
      {/* Header */}
      <div className="page-header-row" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '36px', fontFamily: "'Playfair Display', serif", color: '#002349', marginBottom: '8px' }}>
            Time Off Requests
          </h1>
          <p style={{ color: '#666666', fontSize: '15px' }}>
            View and manage your time off requests.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/timeoff/new")}
          className="request-time-off-btn"
          style={{
            backgroundColor: '#C29B40',
            color: 'white',
            padding: '14px 28px',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            borderRadius: '2px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 14px -3px rgba(194, 155, 64, 0.4)',
            transition: 'all 0.2s ease',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add_circle</span>
          Request Time Off
        </button>
      </div>

      {/* Approved/Denied Requests */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '32px',
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ fontSize: '18px', fontFamily: "'Playfair Display', serif", color: '#002349' }}>
            Approved / Denied Requests
          </h2>
          <span style={{
            backgroundColor: '#002349',
            color: 'white',
            fontSize: '10px',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {approvedRequests.length} Request{approvedRequests.length !== 1 ? 's' : ''}
          </span>
        </div>

        {approvedRequests.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#e2e8f0' }}>event_busy</span>
            <div style={{ fontSize: '14px', color: '#666666', marginTop: '12px', fontStyle: 'italic' }}>
              No approved or denied requests found.
            </div>
          </div>
        ) : (
          <div className="table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#002349' }}>
                <th style={{
                  padding: '14px 24px',
                  textAlign: 'left',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#C29B40',
                }}>
                  Date
                </th>
                <th style={{
                  padding: '14px 24px',
                  textAlign: 'right',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#C29B40',
                }}>
                  Hours
                </th>
                <th style={{
                  padding: '14px 24px',
                  textAlign: 'left',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#C29B40',
                }}>
                  Type
                </th>
                <th style={{
                  padding: '14px 24px',
                  textAlign: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#C29B40',
                }}>
                  Status
                </th>
                <th style={{
                  padding: '14px 24px',
                  textAlign: 'left',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#C29B40',
                }}>
                  Comment
                </th>
              </tr>
            </thead>
            <tbody>
              {approvedRequests.map((r, idx) => (
                <tr key={r.id} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: '#002349', fontWeight: 500 }}>
                    {r.date}
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: '14px', color: '#002349', fontWeight: 600 }}>
                    {r.hours.toFixed(1)}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: '#64748b' }}>
                    {r.type}
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                    <span style={{
                      ...getStatusStyle(r.status),
                      padding: '4px 12px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: '#64748b' }}>
                    {r.comment || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Pending Requests */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: 'rgba(194, 155, 64, 0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ fontSize: '18px', fontFamily: "'Playfair Display', serif", color: '#002349' }}>
            Pending Requests
          </h2>
          <span style={{
            backgroundColor: '#C29B40',
            color: 'white',
            fontSize: '10px',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {pendingRequests.length} Pending
          </span>
        </div>

        {pendingRequests.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#C29B40', opacity: 0.3 }}>hourglass_empty</span>
            <div style={{ fontSize: '14px', color: '#666666', marginTop: '12px', fontStyle: 'italic' }}>
              No pending requests. Your submitted requests will appear here while awaiting manager approval.
            </div>
          </div>
        ) : (
          <div className="table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#C29B40' }}>
                <th style={{
                  padding: '14px 24px',
                  textAlign: 'left',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'white',
                }}>
                  Date
                </th>
                <th style={{
                  padding: '14px 24px',
                  textAlign: 'right',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'white',
                }}>
                  Hours
                </th>
                <th style={{
                  padding: '14px 24px',
                  textAlign: 'left',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'white',
                }}>
                  Type
                </th>
                <th style={{
                  padding: '14px 24px',
                  textAlign: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'white',
                }}>
                  Status
                </th>
                <th style={{
                  padding: '14px 24px',
                  textAlign: 'left',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'white',
                }}>
                  Reason
                </th>
                <th style={{
                  padding: '14px 24px',
                  textAlign: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'white',
                }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {pendingRequests.map((r, idx) => (
                <tr key={r.id} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#fffbeb', borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: '#002349', fontWeight: 500 }}>
                    {r.date}
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: '14px', color: '#002349', fontWeight: 600 }}>
                    {r.hours.toFixed(1)}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: '#64748b' }}>
                    {r.type}
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                    <span style={{
                      ...getStatusStyle(r.status),
                      padding: '4px 12px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: '#64748b' }}>
                    {r.comment || '—'}
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                    <button
                      style={{
                        backgroundColor: 'white',
                        color: '#dc2626',
                        padding: '6px 12px',
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderRadius: '4px',
                        border: '1px solid #fecaca',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
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
            How It Works
          </div>
          <div style={{ fontSize: '13px', color: '#666666' }}>
            Submit a time off request and your manager will be notified. Once approved, the time will appear on the team calendar.
            <strong style={{ color: '#002349' }}> Pending requests</strong> can be cancelled before approval.
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeOffRequests;
