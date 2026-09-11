import React, { useState, useEffect } from "react";
import { RefreshCw, Filter, Info, X, CheckCircle, AlertTriangle, XCircle, Slash } from "lucide-react";
import { api } from "../services/api";

export const NotificationLogs = ({ refreshTrigger }) => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({
    trigger: "",
    channel: "",
    status: "",
  });
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.getLogs(filters);
      setLogs(data);
    } catch (err) {
      console.error("Failed to load logs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filters, refreshTrigger]);

  const getStatusBadge = (status) => {
    switch (status) {
      case "sent":
        return (
          <span className="badge badge-success">
            <CheckCircle size={12} /> SENT
          </span>
        );
      case "mock_delivered":
        return (
          <span className="badge badge-mock" title="Sandbox mode active: credentials missing or test sandbox">
            <AlertTriangle size={12} /> MOCK_DELIVERED
          </span>
        );
      case "failed":
        return (
          <span className="badge badge-danger">
            <XCircle size={12} /> FAILED
          </span>
        );
      case "skipped":
        return (
          <span className="badge badge-muted">
            <Slash size={12} /> SKIPPED
          </span>
        );
      default:
        return <span className="badge">{status}</span>;
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">Live Notification Logs</h3>
          <p className="card-subtitle">
            Auditing real-time dispatches, sandbox mocks, and provider API responses
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchLogs} disabled={isLoading}>
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          Refresh Logs
        </button>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "18px",
          background: "#0d1322",
          padding: "12px 16px",
          borderRadius: "8px",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#94a3b8", fontSize: "0.8rem" }}>
          <Filter size={14} /> Filter:
        </div>

        <select
          className="form-input"
          style={{ width: "auto", padding: "6px 12px", fontSize: "0.8rem" }}
          value={filters.trigger}
          onChange={(e) => setFilters({ ...filters, trigger: e.target.value })}
        >
          <option value="">All Triggers</option>
          <option value="login">Login</option>
          <option value="logout">Logout</option>
        </select>

        <select
          className="form-input"
          style={{ width: "auto", padding: "6px 12px", fontSize: "0.8rem" }}
          value={filters.channel}
          onChange={(e) => setFilters({ ...filters, channel: e.target.value })}
        >
          <option value="">All Channels</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="email">Email</option>
          <option value="webpush">Web Push</option>
        </select>

        <select
          className="form-input"
          style={{ width: "auto", padding: "6px 12px", fontSize: "0.8rem" }}
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">All Statuses</option>
          <option value="sent">Sent</option>
          <option value="mock_delivered">Mock Delivered</option>
          <option value="failed">Failed</option>
          <option value="skipped">Skipped</option>
        </select>

        {(filters.trigger || filters.channel || filters.status) && (
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setFilters({ trigger: "", channel: "", status: "" })}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Logs Table */}
      <div style={{ overflowX: "auto" }}>
        <table className="matrix-table" style={{ fontSize: "0.825rem" }}>
          <thead>
            <tr>
              <th>Time (UTC)</th>
              <th>Trigger</th>
              <th>Channel</th>
              <th>Recipient</th>
              <th>Status</th>
              <th>Mode</th>
              <th style={{ textAlign: "right" }}>Inspect</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", color: "#64748b", padding: "32px" }}>
                  No notification logs found matching criteria.
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const isMock =
                  log.status === "mock_delivered" ||
                  log.response_details?.mock === true ||
                  log.response_details?.mode === "Sandbox / Mock Delivery";

                return (
                  <tr key={log.id}>
                    <td style={{ color: "#94a3b8", whiteSpace: "nowrap" }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td>
                      <code style={{ background: "#1e293b", padding: "2px 6px", borderRadius: "4px" }}>
                        {log.trigger_key}
                      </code>
                    </td>
                    <td style={{ textTransform: "capitalize", fontWeight: "500" }}>
                      {log.channel}
                    </td>
                    <td style={{ color: "#cbd5e1", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {log.recipient}
                    </td>
                    <td>{getStatusBadge(log.status)}</td>
                    <td>
                      {isMock ? (
                        <span style={{ fontSize: "0.72rem", color: "#fbbf24", fontWeight: "500" }}>
                          Sandbox / Mock
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.72rem", color: "#34d399", fontWeight: "500" }}>
                          Live Provider
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelectedLog(log)}
                        title="View Payload and Response"
                      >
                        <Info size={13} />
                        Details
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "680px" }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: "1.1rem" }}>Notification Log #{selectedLog.id}</h3>
                <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                  {selectedLog.trigger_key} via {selectedLog.channel.toUpperCase()} &bull; {selectedLog.recipient}
                </p>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setSelectedLog(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: "16px", display: "flex", gap: "10px", alignItems: "center" }}>
                <span>Delivery Status:</span>
                {getStatusBadge(selectedLog.status)}
              </div>

              <div style={{ marginBottom: "16px" }}>
                <h4 style={{ fontSize: "0.85rem", color: "#cbd5e1", marginBottom: "6px" }}>Payload Sent:</h4>
                <pre
                  style={{
                    background: "#0d1322",
                    padding: "12px",
                    borderRadius: "8px",
                    fontSize: "0.78rem",
                    overflowX: "auto",
                    color: "#38bdf8",
                  }}
                >
                  {JSON.stringify(selectedLog.payload, null, 2)}
                </pre>
              </div>

              <div>
                <h4 style={{ fontSize: "0.85rem", color: "#cbd5e1", marginBottom: "6px" }}>Provider Response:</h4>
                <pre
                  style={{
                    background: "#0d1322",
                    padding: "12px",
                    borderRadius: "8px",
                    fontSize: "0.78rem",
                    overflowX: "auto",
                    color: "#34d399",
                  }}
                >
                  {JSON.stringify(selectedLog.response_details, null, 2)}
                </pre>
              </div>
            </div>
            <div className="modal-footer" style={{ justifyContent: "flex-end" }}>
              <button className="btn btn-primary" onClick={() => setSelectedLog(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
