import React, { useEffect, useState, useCallback } from 'react';
import { TEMPLATES, templateById, allItems } from './data/checklists.js';
import { listJobs, getJob, saveJob, deleteJob, newJob, loadSettings, saveSettings } from './lib/store.js';
import { pickImage } from './lib/native.js';
import Inspect from './screens/Inspect.jsx';
import Report from './screens/Report.jsx';

export default function App() {
  const [view, setView] = useState('home');
  const [jobs, setJobs] = useState([]);
  const [job, setJob] = useState(null);
  const [settings, setSettings] = useState(loadSettings);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setJobs(await listJobs());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Autosave: any change to the open job is written straight away.
  const update = useCallback((patch) => {
    setJob((prev) => {
      if (!prev) return prev;
      const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch };
      saveJob(next);
      return next;
    });
  }, []);

  async function startJob(templateId) {
    const j = newJob(templateId);
    await saveJob(j);
    setJob(j);
    setView('inspect');
  }

  async function openJob(id) {
    const j = await getJob(id);
    if (j) {
      setJob(j);
      setView(j.done ? 'report' : 'inspect');
    }
  }

  async function backHome() {
    setJob(null);
    setView('home');
    await refresh();
  }

  if (view === 'inspect' && job)
    return <Inspect job={job} update={update} onBack={backHome} onFinish={() => setView('report')} />;

  if (view === 'report' && job)
    return (
      <Report
        job={job}
        settings={settings}
        update={update}
        onBack={() => setView('inspect')}
        onDone={backHome}
      />
    );

  if (view === 'settings')
    return (
      <Settings
        settings={settings}
        onChange={(s) => setSettings(saveSettings(s))}
        onBack={() => setView('home')}
      />
    );

  return (
    <Home
      jobs={jobs}
      loading={loading}
      onStart={startJob}
      onOpen={openJob}
      onDelete={async (id) => {
        await deleteJob(id);
        refresh();
      }}
      onSettings={() => setView('settings')}
    />
  );
}

/* ══════════════════════════════════════════════════════════ */

function Home({ jobs, loading, onStart, onOpen, onDelete, onSettings }) {
  const [picking, setPicking] = useState(false);

  return (
    <div className="app">
      <div className="topbar">
        <div style={{ flex: 1 }}>
          <h1>AIO Pro Inspect</h1>
          <div className="sub">field inspections</div>
        </div>
        <button className="iconbtn" onClick={onSettings} aria-label="Settings">SET</button>
      </div>

      <div className="screen">
        {picking ? (
          <>
            <div className="eyebrow">What are you inspecting?</div>
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                className="card card-tap"
                style={{ display: 'block', width: '100%', textAlign: 'left' }}
                onClick={() => onStart(t.id)}
              >
                <div style={{ fontWeight: 700, fontSize: 18 }}>{t.name}</div>
                <div style={{ color: 'var(--muted)', fontSize: 14 }}>{t.blurb}</div>
                <div className="eyebrow" style={{ marginTop: 8, marginBottom: 0 }}>
                  {t.stages.length} stages · {allItems(t).length} checkpoints
                </div>
              </button>
            ))}
            <button className="btn btn-ghost btn-wide" onClick={() => setPicking(false)}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <div className="eyebrow">Jobs</div>
            {loading && <div className="empty">Loading…</div>}
            {!loading && jobs.length === 0 && (
              <div className="empty">
                No inspections yet.
                <br />
                Start one and it saves as you go.
              </div>
            )}
            {jobs.map((j) => {
              const tpl = templateById(j.templateId);
              const items = allItems(tpl);
              const filled = items.filter((it) => j.results[it.id] && j.results[it.id].verdict).length;
              const defects = items.filter((it) => j.results[it.id] && j.results[it.id].verdict === 'defect').length;
              return (
                <div key={j.id} className="card joblist-item">
                  <button
                    className="meta"
                    style={{ textAlign: 'left' }}
                    onClick={() => onOpen(j.id)}
                  >
                    <div className="name">{j.customer.name || 'Unnamed job'}</div>
                    <div className="sub">
                      {tpl.name} · {filled}/{items.length} checked ·{' '}
                      {new Date(j.createdAt).toLocaleDateString()}
                    </div>
                  </button>
                  {j.done ? (
                    <span className="pill done">DONE</span>
                  ) : defects ? (
                    <span className="pill defect">{defects} DEF</span>
                  ) : (
                    <span className="pill">OPEN</span>
                  )}
                  <button
                    className="iconbtn"
                    style={{ color: 'var(--muted)' }}
                    onClick={() => {
                      if (confirm('Delete this job and its photos?')) onDelete(j.id);
                    }}
                    aria-label="Delete job"
                  >
                    DEL
                  </button>
                </div>
              );
            })}
          </>
        )}
      </div>

      {!picking && (
        <div className="bottombar">
          <button className="btn btn-primary" onClick={() => setPicking(true)}>
            Start inspection
          </button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */

function Settings({ settings, onChange, onBack }) {
  const [s, setS] = useState(settings);
  const set = (k) => (e) => setS({ ...s, [k]: e.target.value });

  async function chooseLogo() {
    try {
      setS({ ...s, logo: await pickImage() });
    } catch (e) {
      /* cancelled */
    }
  }

  return (
    <div className="app">
      <div className="topbar">
        <button className="iconbtn" onClick={onBack}>‹</button>
        <h1>Company details</h1>
      </div>

      <div className="screen">
        <div className="card">
          <div className="eyebrow">Logo on the report</div>
          {s.logo ? (
            <img
              src={s.logo}
              alt="Logo"
              style={{ maxWidth: 200, maxHeight: 90, objectFit: 'contain', display: 'block', marginBottom: 12 }}
            />
          ) : (
            <div style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 12 }}>
              No logo yet. It prints at the top of every report.
            </div>
          )}
          <div className="row">
            <button className="btn btn-ghost" onClick={chooseLogo}>
              {s.logo ? 'Replace' : 'Choose image'}
            </button>
            {s.logo && (
              <button className="btn btn-ghost" onClick={() => setS({ ...s, logo: null })}>
                Remove
              </button>
            )}
          </div>
        </div>

        <div className="card">
          <div className="field">
            <label>Company name</label>
            <input value={s.company || ''} onChange={set('company')} />
          </div>
          <div className="field">
            <label>Phone</label>
            <input value={s.phone || ''} onChange={set('phone')} inputMode="tel" />
          </div>
          <div className="field">
            <label>Email</label>
            <input value={s.email || ''} onChange={set('email')} inputMode="email" />
          </div>
          <div className="field">
            <label>Service area or address</label>
            <input value={s.address || ''} onChange={set('address')} />
          </div>
          <div className="field">
            <label>Licence number</label>
            <input value={s.license || ''} onChange={set('license')} />
          </div>
        </div>
      </div>

      <div className="bottombar">
        <button
          className="btn btn-primary"
          onClick={() => {
            onChange(s);
            onBack();
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
}
