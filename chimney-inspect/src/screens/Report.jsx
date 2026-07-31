import React, { useMemo, useState } from 'react';
import { templateById, allItems } from '../data/checklists.js';
import { buildReport } from '../lib/pdf.js';
import { savePdf } from '../lib/native.js';

export default function Report({ job, settings, update, onBack, onDone }) {
  const tpl = useMemo(() => templateById(job.templateId), [job.templateId]);
  const items = useMemo(() => allItems(tpl), [tpl]);
  const [making, setMaking] = useState(false);
  const [error, setError] = useState(null);

  const tally = { ok: 0, monitor: 0, defect: 0, skipped: 0 };
  const skipped = [];
  items.forEach((it) => {
    const v = job.results[it.id] && job.results[it.id].verdict;
    if (v) tally[v]++;
    else {
      tally.skipped++;
      skipped.push(it);
    }
  });

  const quote = job.quote && job.quote.length ? job.quote : [{ desc: '', amount: '' }];
  const total = quote.reduce((t, l) => t + (Number(l.amount) || 0), 0);

  function setLine(idx, patch) {
    const next = quote.map((l, n) => (n === idx ? { ...l, ...patch } : l));
    update({ quote: next });
  }

  async function generate() {
    setMaking(true);
    setError(null);
    try {
      const blob = await buildReport(job, settings);
      const safe = (job.customer.name || 'inspection').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      const date = new Date(job.createdAt).toISOString().slice(0, 10);
      await savePdf(`${safe}-${date}.pdf`, blob);
      update({ done: true });
    } catch (e) {
      setError(e && e.message ? e.message : 'Could not build the PDF.');
    } finally {
      setMaking(false);
    }
  }

  return (
    <div className="app">
      <div className="topbar">
        <button className="iconbtn" onClick={onBack}>‹</button>
        <div style={{ flex: 1 }}>
          <h1>Report</h1>
          <div className="sub">{job.customer.name || 'Unnamed job'}</div>
        </div>
        <button className="iconbtn" onClick={onDone}>DONE</button>
      </div>

      <div className="screen">
        <div className="tally">
          <div>
            <div className="n" style={{ color: 'var(--defect)' }}>{tally.defect}</div>
            <div className="l">Defects</div>
          </div>
          <div>
            <div className="n" style={{ color: 'var(--monitor)' }}>{tally.monitor}</div>
            <div className="l">Monitor</div>
          </div>
          <div>
            <div className="n" style={{ color: 'var(--ok)' }}>{tally.ok}</div>
            <div className="l">OK</div>
          </div>
          <div>
            <div className="n" style={{ color: 'var(--muted)' }}>{tally.skipped}</div>
            <div className="l">Skipped</div>
          </div>
        </div>

        {skipped.length > 0 && (
          <div className="card" style={{ borderLeft: '3px solid var(--monitor)' }}>
            <div className="eyebrow">Not inspected yet</div>
            <div style={{ fontSize: 14, marginBottom: 10 }}>
              These print on the report as “not inspected”. Go back if any of them should be answered.
            </div>
            {skipped.slice(0, 6).map((it) => (
              <div key={it.id} style={{ fontSize: 14, color: 'var(--muted)' }}>
                · {it.label}
              </div>
            ))}
            {skipped.length > 6 && (
              <div style={{ fontSize: 14, color: 'var(--muted)' }}>· and {skipped.length - 6} more</div>
            )}
          </div>
        )}

        <div className="card">
          <div className="eyebrow">Summary for the customer</div>
          <div className="field" style={{ marginBottom: 0 }}>
            <textarea
              value={job.summary || ''}
              onChange={(e) => update({ summary: e.target.value })}
              placeholder="Two or three sentences: what you found, what it means, what happens next."
            />
          </div>
        </div>

        <div className="card">
          <div className="eyebrow">Recommended work</div>
          {quote.map((l, idx) => (
            <div className="row" key={idx} style={{ marginBottom: 10 }}>
              <input
                style={{ flex: 3, minHeight: 48, padding: '11px 12px', border: '1px solid var(--rule)', borderRadius: 6 }}
                placeholder="Description"
                value={l.desc}
                onChange={(e) => setLine(idx, { desc: e.target.value })}
              />
              <input
                style={{ flex: 1, minHeight: 48, padding: '11px 12px', border: '1px solid var(--rule)', borderRadius: 6 }}
                placeholder="0.00"
                inputMode="decimal"
                value={l.amount}
                onChange={(e) => setLine(idx, { amount: e.target.value })}
              />
            </div>
          ))}
          <button
            className="btn btn-ghost btn-wide"
            onClick={() => update({ quote: [...quote, { desc: '', amount: '' }] })}
          >
            Add line
          </button>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 14,
              fontWeight: 700,
              fontSize: 18,
            }}
          >
            <span>Total</span>
            <span style={{ fontFamily: 'var(--mono)' }}>${total.toFixed(2)}</span>
          </div>
        </div>

        {!settings.logo && (
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
            No logo set yet — add one in company details and it prints on every report from then on.
          </div>
        )}

        {error && (
          <div className="card" style={{ borderLeft: '3px solid var(--defect)' }}>
            <div style={{ fontWeight: 650, marginBottom: 4 }}>The PDF did not build</div>
            <div style={{ fontSize: 14, color: 'var(--muted)' }}>{error}</div>
          </div>
        )}
      </div>

      <div className="bottombar">
        <button className="btn btn-ghost" onClick={onBack}>
          Back to checks
        </button>
        <button className="btn btn-primary" onClick={generate} disabled={making}>
          {making ? 'Building…' : 'Create PDF'}
        </button>
      </div>
    </div>
  );
}
