/* ────────────────────────────────────────────────────────────
   Builds the customer-facing PDF with jsPDF.
   Letter portrait, 0.6in margins, everything measured in points.
   ──────────────────────────────────────────────────────────── */

import { jsPDF } from 'jspdf';
import { templateById, allItems, VERDICTS } from '../data/checklists.js';

const M = 43;            // margin
const W = 612;           // letter width
const H = 792;           // letter height
const CONTENT = W - M * 2;

const INK = [26, 22, 20];
const MUTED = [122, 116, 110];
const RULE = [214, 208, 200];
const SEV = {
  defect: [176, 61, 39],
  monitor: [186, 134, 42],
  ok: [74, 118, 88],
};

export async function buildReport(job, settings) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const tpl = templateById(job.templateId);
  const items = allItems(tpl);

  let y = M;

  /* ── Header ─────────────────────────────────────────── */
  if (settings.logo) {
    try {
      doc.addImage(settings.logo, 'JPEG', M, y, 96, 96 * 0.42, undefined, 'FAST');
    } catch (e) {
      /* a bad logo should never stop a report going out */
    }
  }
  doc.setFont('helvetica', 'bold').setFontSize(15).setTextColor(...INK);
  doc.text(settings.company || 'Chimney Inspection', M + (settings.logo ? 110 : 0), y + 14);
  doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(...MUTED);
  const contact = [settings.phone, settings.email, settings.address, settings.license && `Lic. ${settings.license}`]
    .filter(Boolean)
    .join('   ·   ');
  doc.text(contact, M + (settings.logo ? 110 : 0), y + 28, { maxWidth: CONTENT - 110 });

  y += settings.logo ? 58 : 44;
  doc.setDrawColor(...RULE).setLineWidth(1).line(M, y, W - M, y);
  y += 22;

  /* ── Title and customer ─────────────────────────────── */
  doc.setFont('helvetica', 'bold').setFontSize(19).setTextColor(...INK);
  doc.text('Chimney Inspection Report', M, y);
  y += 18;
  doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(...MUTED);
  doc.text(tpl.name + '  ·  ' + new Date(job.createdAt).toLocaleDateString(), M, y);
  y += 24;

  const cust = [
    ['Customer', job.customer.name || '—'],
    ['Address', job.customer.address || '—'],
    ['Phone', job.customer.phone || '—'],
  ];
  cust.forEach(([k, v]) => {
    doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...MUTED);
    doc.text(k.toUpperCase(), M, y);
    doc.setFont('helvetica', 'normal').setFontSize(10.5).setTextColor(...INK);
    doc.text(String(v), M + 78, y);
    y += 16;
  });
  y += 10;

  /* ── Verdict tally ──────────────────────────────────── */
  const tally = { ok: 0, monitor: 0, defect: 0, skipped: 0 };
  items.forEach((it) => {
    const v = job.results[it.id] && job.results[it.id].verdict;
    if (v && tally[v] !== undefined) tally[v]++;
    else tally.skipped++;
  });

  doc.setFillColor(246, 243, 238).rect(M, y, CONTENT, 46, 'F');
  const cells = [
    ['Defects', tally.defect, SEV.defect],
    ['Monitor', tally.monitor, SEV.monitor],
    ['Satisfactory', tally.ok, SEV.ok],
    ['Not inspected', tally.skipped, MUTED],
  ];
  cells.forEach(([label, n, color], i) => {
    const cx = M + 14 + i * (CONTENT / 4);
    doc.setFont('helvetica', 'bold').setFontSize(20).setTextColor(...color);
    doc.text(String(n), cx, y + 24);
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...MUTED);
    doc.text(label.toUpperCase(), cx, y + 37);
  });
  y += 62;

  if (job.summary) {
    y = wrapped(doc, job.summary, M, y, CONTENT, 10.5, INK);
    y += 12;
  }

  /* ── Findings, worst first ──────────────────────────── */
  const order = ['defect', 'monitor', 'ok'];
  for (const sev of order) {
    const group = items.filter((it) => job.results[it.id] && job.results[it.id].verdict === sev);
    if (!group.length) continue;

    y = ensure(doc, y, 60);
    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...SEV[sev]);
    doc.text(labelFor(sev, group.length).toUpperCase(), M, y);
    y += 6;
    doc.setDrawColor(...SEV[sev]).setLineWidth(2).line(M, y, M + 46, y);
    y += 18;

    for (const it of group) {
      const r = job.results[it.id] || {};
      y = ensure(doc, y, 86);

      doc.setFont('helvetica', 'bold').setFontSize(10.5).setTextColor(...INK);
      y = wrapped(doc, it.label, M, y, CONTENT, 10.5, INK, 'bold');

      doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...MUTED);
      doc.text(`${it.stageName}${it.ref ? '  ·  ' + it.ref : ''}`, M, y);
      y += 13;

      if (r.note) y = wrapped(doc, r.note, M, y, CONTENT, 10, INK) + 4;

      const photos = Object.values(r.photos || {}).filter(Boolean);
      if (photos.length) {
        const pw = (CONTENT - 12) / 3;
        const ph = pw * 0.72;
        y = ensure(doc, y, ph + 12);
        photos.slice(0, 3).forEach((src, i) => {
          try {
            doc.addImage(src, 'JPEG', M + i * (pw + 6), y, pw, ph, undefined, 'FAST');
          } catch (e) {
            /* skip an image that will not decode */
          }
        });
        y += ph + 10;
      }
      y += 8;
    }
    y += 6;
  }

  /* ── Quote ──────────────────────────────────────────── */
  const lines = (job.quote || []).filter((l) => l.desc);
  if (lines.length) {
    y = ensure(doc, y, 90);
    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...INK);
    doc.text('RECOMMENDED WORK', M, y);
    y += 6;
    doc.setDrawColor(...INK).setLineWidth(2).line(M, y, M + 46, y);
    y += 18;

    let total = 0;
    lines.forEach((l) => {
      y = ensure(doc, y, 22);
      const amount = Number(l.amount) || 0;
      total += amount;
      doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...INK);
      doc.text(String(l.desc), M, y, { maxWidth: CONTENT - 90 });
      doc.text(money(amount), W - M, y, { align: 'right' });
      y += 15;
      doc.setDrawColor(...RULE).setLineWidth(0.5).line(M, y - 5, W - M, y - 5);
    });
    y += 6;
    doc.setFont('helvetica', 'bold').setFontSize(11.5).setTextColor(...INK);
    doc.text('Total', M, y);
    doc.text(money(total), W - M, y, { align: 'right' });
    y += 20;
  }

  /* ── Footer on every page ───────────────────────────── */
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...MUTED);
    doc.text(
      `${settings.company || ''}   ·   ${job.customer.name || ''}   ·   ${new Date(job.createdAt).toLocaleDateString()}`,
      M,
      H - 24
    );
    doc.text(`${p} / ${pages}`, W - M, H - 24, { align: 'right' });
  }

  return doc.output('blob');

  /* ── helpers ────────────────────────────────────────── */
  function ensure(d, cursor, need) {
    if (cursor + need > H - 52) {
      d.addPage();
      return M;
    }
    return cursor;
  }
}

function wrapped(doc, text, x, y, width, size, color, weight = 'normal') {
  doc.setFont('helvetica', weight).setFontSize(size).setTextColor(...color);
  const lines = doc.splitTextToSize(String(text), width);
  lines.forEach((ln) => {
    if (y > H - 60) {
      doc.addPage();
      y = M;
    }
    doc.text(ln, x, y);
    y += size * 1.32;
  });
  return y;
}

function labelFor(sev, n) {
  if (sev === 'defect') return `Defects — action needed (${n})`;
  if (sev === 'monitor') return `Monitor (${n})`;
  return `Satisfactory (${n})`;
}

function money(n) {
  return '$' + (Number(n) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export { VERDICTS };
