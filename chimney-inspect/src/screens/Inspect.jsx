import React, { useMemo, useState } from 'react';
import { templateById, allItems } from '../data/checklists.js';
import { takePhoto } from '../lib/native.js';

export default function Inspect({ job, update, onBack, onFinish }) {
  const tpl = useMemo(() => templateById(job.templateId), [job.templateId]);
  const items = useMemo(() => allItems(tpl), [tpl]);
  const [i, setI] = useState(() => {
    const firstBlank = items.findIndex((it) => !(job.results[it.id] && job.results[it.id].verdict));
    return firstBlank === -1 ? 0 : firstBlank;
  });
  const [showCustomer, setShowCustomer] = useState(!job.customer.name);
  const [busy, setBusy] = useState(null);

  const item = items[i];
  const res = job.results[item.id] || { verdict: null, note: '', photos: {} };
  const answered = items.filter((it) => job.results[it.id] && job.results[it.id].verdict).length;

  function setResult(patch) {
    update((prev) => ({
      ...prev,
      results: {
        ...prev.results,
        [item.id]: { verdict: null, note: '', photos: {}, ...prev.results[item.id], ...patch },
      },
    }));
  }

  async function shoot(slotId) {
    setBusy(slotId);
    try {
      const dataUrl = await takePhoto();
      setResult({ photos: { ...(res.photos || {}), [slotId]: dataUrl } });
    } catch (e) {
      /* cancelled or no camera — leave the slot empty */
    } finally {
      setBusy(null);
    }
  }

  /* ── Customer details, asked once at the start ────────── */
  if (showCustomer) {
    const c = job.customer;
    const setC = (k) => (e) => update({ customer: { ...c, [k]: e.target.value } });
    return (
      <div className="app">
        <div className="topbar">
          <button className="iconbtn" onClick={onBack}>‹</button>
          <div style={{ flex: 1 }}>
            <h1>New inspection</h1>
            <div className="sub">{tpl.name}</div>
          </div>
        </div>
        <div className="screen">
          <div className="card">
            <div className="field">
              <label>Customer name</label>
              <input value={c.name} onChange={setC('name')} autoFocus />
            </div>
            <div className="field">
              <label>Service address</label>
              <input value={c.address} onChange={setC('address')} />
            </div>
            <div className="field">
              <label>Phone</label>
              <input value={c.phone} onChange={setC('phone')} inputMode="tel" />
            </div>
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 14 }}>
            {items.length} checkpoints across {tpl.stages.length} stages. Everything saves as you go — you can
            close the app and come back to it.
          </div>
        </div>
        <div className="bottombar">
          <button className="btn btn-primary" onClick={() => setShowCustomer(false)}>
            Start
          </button>
        </div>
      </div>
    );
  }

  /* ── Checkpoint ───────────────────────────────────────── */
  const stageIndex = tpl.stages.findIndex((s) => s.id === item.stageId);

  return (
    <div className="app">
      <div className="topbar">
        <button className="iconbtn" onClick={onBack}>‹</button>
        <div style={{ flex: 1 }}>
          <h1>{job.customer.name || 'Inspection'}</h1>
          <div className="sub">
            {i + 1} / {items.length} · {answered} checked
          </div>
        </div>
        <button className="iconbtn" onClick={onFinish} aria-label="Go to report">RPT</button>
      </div>

      <div className="screen">
        <div className="flue">
          {/* the spine: one segment per stage, filling as the job moves up the system */}
          <div className="flue-rail" aria-hidden="true">
            {tpl.stages.map((s, n) => (
              <div
                key={s.id}
                className={'flue-seg ' + (n < stageIndex ? 'done' : n === stageIndex ? 'here' : '')}
              />
            ))}
          </div>

          <div className="flue-body">
            <div className="stage-head">
              <span className="n">{String(stageIndex + 1).padStart(2, '0')}</span>
              <h2>{item.stageName}</h2>
            </div>

            <div className="item-title">{item.label}</div>
            <div className="item-help">{item.help}</div>
            {item.ref && <div className="item-ref">{item.ref}</div>}

            <div className="verdicts">
              {['ok', 'monitor', 'defect'].map((v) => (
                <button
                  key={v}
                  className={'verdict ' + v}
                  data-on={res.verdict === v}
                  onClick={() => setResult({ verdict: res.verdict === v ? null : v })}
                >
                  {v === 'ok' ? 'OK' : v === 'monitor' ? 'Monitor' : 'Defect'}
                </button>
              ))}
            </div>

            <div className="eyebrow">Photos</div>
            <div className="photos">
              {item.photos.map((p) => {
                const src = res.photos && res.photos[p.id];
                return (
                  <button
                    key={p.id}
                    className={'slot' + (src ? ' filled' : '')}
                    onClick={() => shoot(p.id)}
                    disabled={busy === p.id}
                  >
                    {src ? (
                      <>
                        <img src={src} alt={p.label} />
                        <span className="retake">RETAKE</span>
                      </>
                    ) : (
                      <>
                        <span className="plus">{busy === p.id ? '…' : '+'}</span>
                        <span className="cap">{p.label}</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="field">
              <label>What you found</label>
              <textarea
                value={res.note || ''}
                onChange={(e) => setResult({ note: e.target.value })}
                placeholder="Plain language — this goes on the customer's report."
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bottombar">
        <button className="btn btn-ghost" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}>
          ‹
        </button>
        {i + 1 < items.length ? (
          <button className="btn btn-primary" onClick={() => setI(i + 1)}>
            Next checkpoint
          </button>
        ) : (
          <button className="btn btn-primary" onClick={onFinish}>
            Finish and review
          </button>
        )}
      </div>
    </div>
  );
}
