import { useState, useEffect } from "react";

const emptyForm = { name: "", age: "", sex: "Female", time: "", diagnosis: "", passage: "" };
const wardItems = ["Electricity", "Plumbing", "Water supply", "Equipments", "Accidents", "Incidents"];
const emptyWard = Object.fromEntries(wardItems.map((item) => [item, "Good"]));

const API = "https://wardnotes-api.onrender.com";

// ---------- Entry card (with addendum support) ----------
function EntryCard({ entry, canAddAddendum, onAddAddendum }) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!text.trim()) return;
    setBusy(true);
    await onAddAddendum(entry.id, text.trim());
    setBusy(false);
    setText("");
    setAdding(false);
  }

  return (
    <article className="card">
      <div className="entry-head">
        <div className="avatar">{entry.name.charAt(0).toUpperCase()}</div>
        <div>
          <div className="entry-name">{entry.name}</div>
          <div className="chips">
            <span className="chip">{entry.age} yrs</span>
            <span className="chip">{entry.sex}</span>
            {entry.time_seen && <span className="chip">{entry.time_seen}</span>}
          </div>
        </div>
      </div>
      <div className="dx-badge">{entry.diagnosis}</div>
      <p className="passage">{entry.passage}</p>
      <div className="saved">
        🔒 Saved {new Date(entry.saved_at).toLocaleString()} by {entry.saved_by}. Cannot be edited or deleted.
      </div>

      {(entry.addenda || []).map((a) => (
        <div className="addendum" key={a.id}>
          <b>Addendum:</b> {a.text}
          <div className="addendum-meta">
            {a.added_by} · {new Date(a.added_at).toLocaleString()}
          </div>
        </div>
      ))}

      {canAddAddendum && (
        <div className="addendum-form">
          {!adding ? (
            <button className="btn-small" onClick={() => setAdding(true)}>
              Add addendum
            </button>
          ) : (
            <>
              <textarea
                rows={2}
                placeholder="Correction or extra information (the original stays visible)"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <button className="btn-small" onClick={submit} disabled={busy}>
                {busy ? "Saving..." : "Save addendum"}
              </button>
            </>
          )}
        </div>
      )}
    </article>
  );
}

// ---------- Login / Register screen ----------
function AuthScreen({ onLoggedIn }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Nurse");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  async function submit() {
    setError("");
    setNote("");
    if (!name || !password) {
      setError("Enter your name and password.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "register") {
        const res = await fetch(`${API}/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, password, role }),
        });
        const data = await res.json();
        setBusy(false);
        if (!res.ok) {
          setError(data.error);
          return;
        }
        setMode("login");
        setPassword("");
        setNote("Account created. Now log in.");
        return;
      }

      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });
      const data = await res.json();
      setBusy(false);
      if (!res.ok) {
        setError(data.error);
        return;
      }
      onLoggedIn({ token: data.token, name: data.name, role: data.role });
    } catch (err) {
      setBusy(false);
      setError("Cannot reach the server. Is the backend running?");
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">R</div>
        <h1 className="auth-title">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="auth-subtitle">
          {mode === "login" ? "Log in to Report Book" : "Register to start writing shift reports"}
        </p>

        {error && <div className="auth-error">{error}</div>}
        {note && <div className="auth-note">{note}</div>}

        <div className="auth-field">
          <label className="field-label">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
        </div>

        {mode === "register" && (
          <div className="auth-field">
            <label className="field-label">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option>Nurse</option>
              <option>Physician</option>
              <option>Doctor</option>
            </select>
          </div>
        )}

        <div className="auth-field">
          <label className="field-label">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>

        <button className="auth-submit" onClick={submit} disabled={busy}>
          {busy ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
        </button>

        <p className="auth-switch">
          {mode === "login" ? "No account yet? " : "Already have an account? "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setMode(mode === "login" ? "register" : "login");
              setError("");
              setNote("");
            }}
          >
            {mode === "login" ? "Create one" : "Log in"}
          </a>
        </p>

        <p className="auth-disclaimer">Use fake / test data only while this app is in development.</p>
      </div>
    </div>
  );
}

// ---------- History screen: list past shift reports ----------
function HistoryScreen({ authHeader, onOpenReport, onBack }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API}/shift-reports`, { headers: authHeader });
        const data = await res.json();
        setReports(data);
      } catch (err) {
        alert("Cannot reach the server.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="page">
      <button className="btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>
        ← Back to current shift
      </button>
      <h2 className="section-title">Past shift reports</h2>
      {loading && <div className="empty">Loading...</div>}
      {!loading && reports.length === 0 && <div className="empty">No reports yet.</div>}
      {reports.map((r) => (
        <div className="history-item" key={r.id} onClick={() => onOpenReport(r.id)}>
          <div>
            <div className="history-main">
              {r.shift} Report — {new Date(r.report_date).toLocaleDateString()}
            </div>
            <div className="history-sub">
              {r.locked ? `Locked · SOD: ${r.sod} · POD: ${r.pod} · DOD: ${r.dod}` : "Still open"}
            </div>
          </div>
          <span className={r.locked ? "pill pill-locked" : "pill"}>{r.locked ? "Locked" : "Open"}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- Read-only viewer for one past report ----------
function ReportViewer({ reportId, authHeader, onBack, onAddAddendum }) {
  const [data, setData] = useState(null);

  async function load() {
    const res = await fetch(`${API}/shift-reports/${reportId}/full`, { headers: authHeader });
    const json = await res.json();
    setData(json);
  }

  useEffect(() => {
    load();
  }, [reportId]);

  if (!data) return <div className="page"><div className="empty">Loading...</div></div>;

  const { report, entries } = data;

  async function handleAddendum(entryId, text) {
    await onAddAddendum(entryId, text);
    await load(); // refresh so the new addendum shows immediately
  }

  return (
    <div className="page">
      <button className="btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>
        ← Back to history
      </button>
      <h2 className="section-title">
        {report.shift} Report — {new Date(report.report_date).toLocaleDateString()}
      </h2>

      {entries.length === 0 && <div className="empty">No entries in this report.</div>}
      {entries.map((entry) => (
        <EntryCard key={entry.id} entry={entry} canAddAddendum onAddAddendum={handleAddendum} />
      ))}

      <div className="card">
        <h2>Ward Status</h2>
        <div className="ward-grid">
          {wardItems.map((item) => (
            <div key={item}>
              <label className="field-label">{item}</label>
              <b>{(report.ward_status || {})[item] || "—"}</b>
            </div>
          ))}
        </div>
      </div>

      {report.locked && (
        <div className="locked">
          🔒 Locked at {new Date(report.locked_at).toLocaleString()}.
          <br />
          Staff on Duty: {report.sod} · Physician on Duty: {report.pod} · Doctor on Duty: {report.dod}
        </div>
      )}
    </div>
  );
}

// ---------- Main report screen ----------
function ReportScreen({ user, onLogout }) {
  const [view, setView] = useState("current"); // "current" | "history" | "viewer"
  const [viewingReportId, setViewingReportId] = useState(null);

  const [shift, setShift] = useState("Morning");
  const [reportId, setReportId] = useState(null);
  const [loadingShift, setLoadingShift] = useState(true);

  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [ward, setWard] = useState(emptyWard);

  const [sod, setSod] = useState(user.role === "Nurse" ? user.name : "");
  const [pod, setPod] = useState(user.role === "Physician" ? user.name : "");
  const [dod, setDod] = useState(user.role === "Doctor" ? user.name : "");
  const [signoff, setSignoff] = useState(null);

  const authHeader = { Authorization: `Bearer ${user.token}` };

  async function openShift(selectedShift) {
    setLoadingShift(true);
    try {
      const res = await fetch(`${API}/shift-reports/open`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ shift: selectedShift }),
      });
      if (res.status === 401) {
        alert("Session expired. Please log in again.");
        onLogout();
        return;
      }
      const report = await res.json();
      setReportId(report.id);

      if (report.locked) {
        setSignoff({
          shift: report.shift,
          sod: report.sod,
          pod: report.pod,
          dod: report.dod,
          at: new Date(report.locked_at).toLocaleString(),
        });
        setWard(report.ward_status || emptyWard);
      } else {
        setSignoff(null);
        setWard(emptyWard);
      }

      const entriesRes = await fetch(`${API}/shift-reports/${report.id}/entries`, { headers: authHeader });
      const entriesData = await entriesRes.json();
      setEntries(entriesData);
    } catch (err) {
      alert("Cannot reach the server. Is the backend running?");
    } finally {
      setLoadingShift(false);
    }
  }

  useEffect(() => {
    openShift(shift);
  }, []);

  function handleShiftChange(newShift) {
    setShift(newShift);
    setSod(user.role === "Nurse" ? user.name : "");
    setPod(user.role === "Physician" ? user.name : "");
    setDod(user.role === "Doctor" ? user.name : "");
    openShift(newShift);
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function saveEntry() {
    if (!form.name || !form.diagnosis || !form.passage) {
      alert("Enter the name, diagnosis and the passage.");
      return;
    }
    try {
      const res = await fetch(`${API}/shift-reports/${reportId}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify(form),
      });
      if (res.status === 401) {
        alert("Session expired. Please log in again.");
        onLogout();
        return;
      }
      if (!res.ok) {
        const err = await res.json();
        alert(err.error);
        return;
      }
      const saved = await res.json();
      setEntries([...entries, saved]);
      setForm(emptyForm);
    } catch (err) {
      alert("Could not save. Is the backend running?");
    }
  }

  // Shared addendum handler, used by both the current view and the history viewer
  async function addAddendum(entryId, text) {
    try {
      const res = await fetch(`${API}/entries/${entryId}/addenda`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error);
        return;
      }
      const addendum = await res.json();
      setEntries((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, addenda: [...(e.addenda || []), addendum] } : e))
      );
    } catch (err) {
      alert("Could not save addendum. Is the backend running?");
    }
  }

  async function lockReport() {
    if (!sod || !pod || !dod) {
      alert("Staff on Duty, Physician on Duty and Doctor on Duty must all sign.");
      return;
    }
    if (!window.confirm("After signing off, this report is locked. Continue?")) return;

    try {
      const res = await fetch(`${API}/shift-reports/${reportId}/signoff`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ wardStatus: ward, sod, pod, dod }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error);
        return;
      }
      const report = await res.json();
      setSignoff({
        shift: report.shift,
        sod: report.sod,
        pod: report.pod,
        dod: report.dod,
        at: new Date(report.locked_at).toLocaleString(),
      });
    } catch (err) {
      alert("Could not sign off. Is the backend running?");
    }
  }

  function startNewShift() {
    const order = ["Morning", "Afternoon", "Night"];
    const next = order[(order.indexOf(shift) + 1) % order.length];
    setShift(next);
    setForm(emptyForm);
    setSod(user.role === "Nurse" ? user.name : "");
    setPod(user.role === "Physician" ? user.name : "");
    setDod(user.role === "Doctor" ? user.name : "");
    openShift(next);
  }

  const locked = signoff !== null;

  if (view === "history") {
    return (
      <div>
        <TopBar user={user} shift={shift} locked={locked} onLogout={onLogout} onHistory={null} hideShiftPicker />
        <HistoryScreen
          authHeader={authHeader}
          onBack={() => setView("current")}
          onOpenReport={(id) => {
            setViewingReportId(id);
            setView("viewer");
          }}
        />
      </div>
    );
  }

  if (view === "viewer") {
    return (
      <div>
        <TopBar user={user} shift={shift} locked={locked} onLogout={onLogout} onHistory={null} hideShiftPicker />
        <ReportViewer
          reportId={viewingReportId}
          authHeader={authHeader}
          onBack={() => setView("history")}
          onAddAddendum={addAddendum}
        />
      </div>
    );
  }

  if (loadingShift && entries.length === 0 && !reportId) {
    return <div className="page"><div className="empty">Loading shift report...</div></div>;
  }

  return (
    <div>
      <TopBar
        user={user}
        shift={shift}
        locked={locked}
        onLogout={onLogout}
        onHistory={() => setView("history")}
        onShiftChange={handleShiftChange}
      />

      <div className="page">
        {!locked && (
          <div className="card">
            <h2>New entry</h2>
            <div className="row">
              <input name="name" placeholder="Name (fake only)" value={form.name} onChange={handleChange} />
              <input name="age" placeholder="Age" value={form.age} onChange={handleChange} />
              <select name="sex" value={form.sex} onChange={handleChange}>
                <option>Female</option>
                <option>Male</option>
              </select>
              <input name="time" placeholder="Time e.g. 4:20pm" value={form.time} onChange={handleChange} />
            </div>
            <input name="diagnosis" placeholder="Diagnosis" value={form.diagnosis} onChange={handleChange} />
            <textarea
              name="passage"
              placeholder="Write the report here, like in the notebook..."
              rows={9}
              value={form.passage}
              onChange={handleChange}
            />
            <button onClick={saveEntry}>Save entry</button>
          </div>
        )}

        <h2 className="section-title">Entries ({entries.length})</h2>
        {entries.length === 0 && <div className="empty">No entries yet. Write the first one above.</div>}
        {entries.map((entry) => (
          <EntryCard key={entry.id} entry={entry} canAddAddendum onAddAddendum={addAddendum} />
        ))}

        <div className="card">
          <h2>Ward Status</h2>
          <div className="ward-grid">
            {wardItems.map((item) => (
              <div key={item}>
                <label className="field-label">{item}</label>
                {locked ? (
                  <b>{ward[item]}</b>
                ) : (
                  <select value={ward[item]} onChange={(e) => setWard({ ...ward, [item]: e.target.value })}>
                    <option>Good</option>
                    <option>Fair</option>
                    <option>Poor</option>
                    <option>Nil</option>
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>

        {!locked ? (
          <div className="card">
            <h2>Sign-off</h2>
            <div className="row">
              <div>
                <label className="field-label">Staff on Duty (SOD)</label>
                <input placeholder="Nurse name" value={sod} onChange={(e) => setSod(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Physician on Duty (POD)</label>
                <input placeholder="Physician name" value={pod} onChange={(e) => setPod(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Doctor on Duty (DOD)</label>
                <input placeholder="Doctor name" value={dod} onChange={(e) => setDod(e.target.value)} />
              </div>
            </div>
            <button onClick={lockReport}>Sign off and lock report</button>
          </div>
        ) : (
          <div className="locked">
            🔒 {signoff.shift} Report locked at {signoff.at}.
            <br />
            Staff on Duty: {signoff.sod} · Physician on Duty: {signoff.pod} · Doctor on Duty: {signoff.dod}
            <br />
            <button onClick={startNewShift}>Start next shift</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Shared top bar ----------
function TopBar({ user, shift, locked, onLogout, onHistory, onShiftChange, hideShiftPicker }) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="logo">R</div>
        <div>
          <div className="brand-name">Report Book</div>
          <div className="brand-sub">
            {shift} Report, {new Date().toLocaleDateString()} · {user.name} ({user.role})
          </div>
        </div>
      </div>
      <div className="topbar-actions">
        {!hideShiftPicker && !locked && onShiftChange && (
          <select className="shift-select" value={shift} onChange={(e) => onShiftChange(e.target.value)}>
            <option>Morning</option>
            <option>Afternoon</option>
            <option>Night</option>
          </select>
        )}
        {!hideShiftPicker && (
          <span className={locked ? "pill pill-locked" : "pill"}>{locked ? "Locked" : "Open"}</span>
        )}
        {onHistory && (
          <button className="btn-ghost" onClick={onHistory}>
            History
          </button>
        )}
        <button className="btn-ghost" onClick={onLogout}>
          Log out
        </button>
      </div>
    </header>
  );
}

// ---------- Root ----------
export default function App() {
  const [user, setUser] = useState(null);

  if (!user) {
    return <AuthScreen onLoggedIn={setUser} />;
  }

  return <ReportScreen user={user} onLogout={() => setUser(null)} />;
}