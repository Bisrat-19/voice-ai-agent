import { useCallback, useEffect, useState } from "react";
import type { CallRecord } from "./types";
import "./App.css";

function formatDate(iso: string): string {
  return iso ? new Date(iso).toLocaleString() : "—";
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const n = new Date();
  return d.toDateString() === n.toDateString();
}

export default function App() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CallRecord | null>(null);
  const [lastUpdated, setLastUpdated] = useState("");

  const loadCalls = useCallback(async () => {
    try {
      const res = await fetch("/api/calls?limit=50");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load calls");
      setCalls(json.data ?? []);
      setError(null);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reach API");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCalls();
    const id = setInterval(loadCalls, 30000);
    return () => clearInterval(id);
  }, [loadCalls]);

  const emergencies = calls.filter((c) => c.isEmergency).length;
  const todayCount = calls.filter((c) => isToday(c.createdAt)).length;

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>ABC Home Services</h1>
          <p className="muted">Voice AI receptionist — call dashboard</p>
        </div>
        <span className={error ? "status error" : "status ok"}>
          {error ? "Offline" : "Connected"}
        </span>
      </header>

      <section className="stats">
        <div className="stat">
          <div className="stat-value">{calls.length}</div>
          <div className="stat-label">Total calls</div>
        </div>
        <div className="stat">
          <div className="stat-value">{emergencies}</div>
          <div className="stat-label">Emergencies</div>
        </div>
        <div className="stat">
          <div className="stat-value">{todayCount}</div>
          <div className="stat-label">Today</div>
        </div>
      </section>

      <main className="main">
        <div className="toolbar">
          <span className="muted">
            {lastUpdated ? `Updated ${lastUpdated}` : ""}
          </span>
          <button type="button" onClick={() => { setLoading(true); loadCalls(); }}>
            Refresh
          </button>
        </div>

        {loading && !calls.length ? (
          <p className="center muted">Loading calls…</p>
        ) : error ? (
          <p className="center error-msg">{error}</p>
        ) : calls.length === 0 ? (
          <p className="center muted">
            No calls yet. Make a phone call or send a test webhook.
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Phone</th>
                  <th>Intent</th>
                  <th>Service</th>
                  <th>City</th>
                  <th>Emergency</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((c) => (
                  <tr
                    key={c.id}
                    className={c.isEmergency ? "emergency" : ""}
                    onClick={() => setSelected(c)}
                  >
                    <td>{formatDate(c.createdAt)}</td>
                    <td>{c.callerPhone || "—"}</td>
                    <td>
                      <span className="badge badge-intent">{c.intent || "—"}</span>
                    </td>
                    <td>{c.serviceNeeded || "—"}</td>
                    <td>{c.addressOrCity || "—"}</td>
                    <td>
                      {c.isEmergency ? (
                        <span className="badge badge-emergency">Yes</span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <footer className="footer muted">
        API: GET /api/calls · Webhook: POST /vapi/call-ended
      </footer>

      {selected && (
        <div className="modal" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Call details</h2>
            <dl className="details">
              <dt>Call ID</dt>
              <dd>{selected.callId}</dd>
              <dt>Customer</dt>
              <dd>{selected.customerName || "—"}</dd>
              <dt>Preferred time</dt>
              <dd>{selected.preferredTime || "—"}</dd>
            </dl>
            <div className="detail-block">
              <span className="detail-label">Summary</span>
              <pre>{selected.summary || "—"}</pre>
            </div>
            <div className="detail-block">
              <span className="detail-label">Transcript</span>
              <pre>{selected.transcript || "—"}</pre>
            </div>
            <button type="button" className="secondary" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
