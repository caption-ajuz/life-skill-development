import api from '../services/api.js';
import { currentUser } from '../store/auth.js';
import { formatCurrency, formatDate, formatNumber } from '../utils/format.js';

const html = window.html;
const { useState, useEffect } = window.hooks;

export default function Reports() {
  const user = currentUser.value;

  const [type, setType] = useState('distribution');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const params = { type };
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (status) params.status = status;

      const res = await api.get('/api/reports/data', params);
      if (res && res.success && res.data) {
        setRecords(res.data);
      }
    } catch (err) {
      if (window.showToast) window.showToast('Failed to load report data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [type, status]);

  // Client-side Excel export using SheetJS
  const exportExcel = async () => {
    if (!records.length) {
      if (window.showToast) window.showToast('No records to export.', 'warning');
      return;
    }

    setExporting(true);
    try {
      const XLSX = await import('https://esm.sh/xlsx@0.18.5?bundle');

      const rows = records.map((r, idx) => {
        if (type === 'distribution') {
          return {
            '#': idx + 1,
            Date: formatDate(r.date),
            Member: r.memberId ? r.memberId.fullName : '',
            Team: r.teamId ? r.teamId.name : '',
            Area: r.areaId ? r.areaId.name : '',
            Quantity: r.quantity,
            Status: r.status,
            Notes: r.notes || ''
          };
        } else if (type === 'collection') {
          return {
            '#': idx + 1,
            Date: formatDate(r.date),
            Member: r.memberId ? r.memberId.fullName : '',
            Team: r.teamId ? r.teamId.name : '',
            Area: r.areaId ? r.areaId.name : '',
            'Amount (₹)': r.amount,
            Status: r.status,
            Notes: r.notes || ''
          };
        } else {
          return {
            '#': idx + 1,
            Date: formatDate(r.transferDate),
            'From Member': r.fromUserId ? r.fromUserId.fullName : '',
            Team: r.teamId ? r.teamId.name : '',
            'Handed To': r.toDescription,
            'Amount (₹)': r.amount,
            Status: r.status,
            'Confirmed By': r.confirmedBy ? r.confirmedBy.fullName : '',
            Notes: r.notes || ''
          };
        }
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, type.toUpperCase());
      XLSX.writeFile(wb, `LifeSkill_${type}_Report_${new Date().toISOString().split('T')[0]}.xlsx`);

      if (window.showToast) window.showToast('Excel file downloaded! ✓', 'success');
    } catch (err) {
      console.error('Export Excel error:', err);
      if (window.showToast) window.showToast('Failed to export Excel file.', 'error');
    } finally {
      setExporting(false);
    }
  };

  // WhatsApp share summary
  const shareWhatsApp = async () => {
    try {
      const res = await api.get('/api/reports/whatsapp-summary');
      if (res && res.success && res.text) {
        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(res.text)}`;
        window.open(url, '_blank');
      }
    } catch (err) {
      if (window.showToast) window.showToast('Failed to prepare WhatsApp summary.', 'error');
    }
  };

  const totalQuantity = type === 'distribution' ? records.reduce((s, r) => s + (r.quantity || 0), 0) : null;
  const totalAmount = type !== 'distribution' ? records.reduce((s, r) => s + (r.amount || 0), 0) : null;

  return html`
    <div class="page">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <div>
          <h2 style="font-size: 19px; font-weight: 700;">Reports & Exports</h2>
          <p style="font-size: 12px; color: var(--text-secondary);">Filtered data records and summaries</p>
        </div>
      </div>

      <!-- Filter Controls -->
      <div class="card">
        <div class="tabs" style="margin-bottom: 10px;">
          <button class="tab ${type === 'distribution' ? 'active' : ''}" onClick=${() => setType('distribution')}>Distributions</button>
          <button class="tab ${type === 'collection' ? 'active' : ''}" onClick=${() => setType('collection')}>Collections</button>
          <button class="tab ${type === 'transfer' ? 'active' : ''}" onClick=${() => setType('transfer')}>Transfers</button>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
          <div>
            <label class="form-label" style="font-size: 12px;">From Date</label>
            <input type="date" class="form-input" style="padding: 8px;" value=${dateFrom} onInput=${(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label class="form-label" style="font-size: 12px;">To Date</label>
            <input type="date" class="form-input" style="padding: 8px;" value=${dateTo} onInput=${(e) => setDateTo(e.target.value)} />
          </div>
        </div>

        <div style="display: flex; gap: 8px;">
          <button class="btn btn-primary btn-sm" style="flex: 1;" onClick=${loadReportData}>
            Apply Filters
          </button>
          <button class="btn btn-secondary btn-sm" onClick=${shareWhatsApp} style="background: #25D366; color: white; border: none;">
            WhatsApp Share
          </button>
          <button class="btn btn-secondary btn-sm" onClick=${exportExcel} disabled=${exporting}>
            📥 Excel
          </button>
        </div>
      </div>

      <!-- Summary Stat -->
      <div class="card" style="background: #f1f5f9; padding: 12px 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 13px; font-weight: 600; color: var(--text-secondary);">
            Total Records Found: <b>${records.length}</b>
          </span>
          <span style="font-size: 15px; font-weight: 700; color: var(--primary);">
            ${type === 'distribution' ? `${formatNumber(totalQuantity)} Calendars` : formatCurrency(totalAmount)}
          </span>
        </div>
      </div>

      <!-- Scrollable Data Table -->
      <div class="card" style="padding: 0; overflow: hidden;">
        ${loading
          ? html`<div style="height: 120px;" class="skeleton"></div>`
          : records.length === 0
          ? html`<div class="empty-state"><p>No records found for the selected filter.</p></div>`
          : html`
              <div class="table-wrap" style="margin: 0; padding: 0;">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Member</th>
                      <th>Team</th>
                      ${type !== 'transfer' ? html`<th>Area</th>` : html`<th>To</th>`}
                      <th class="text-right">${type === 'distribution' ? 'Qty' : 'Amount'}</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${records.map(
                      (r) => html`
                        <tr key=${r._id}>
                          <td style="white-space: nowrap; font-size: 12px;">
                            ${formatDate(type === 'transfer' ? r.transferDate : r.date)}
                          </td>
                          <td style="font-weight: 500; font-size: 13px;">
                            ${(type === 'transfer' ? (r.fromUserId && r.fromUserId.fullName) : (r.memberId && r.memberId.fullName)) || '-'}
                          </td>
                          <td style="font-size: 12px; color: var(--text-secondary);">
                            ${r.teamId ? r.teamId.name : '-'}
                          </td>
                          <td style="font-size: 12px;">
                            ${type === 'transfer' ? r.toDescription : (r.areaId ? r.areaId.name : '-')}
                          </td>
                          <td class="text-right" style="font-weight: 700; color: ${type === 'distribution' ? 'var(--primary)' : '#059669'};">
                            ${type === 'distribution' ? r.quantity : formatCurrency(r.amount)}
                          </td>
                          <td>
                            <span class="badge badge-${r.status === 'confirmed' || r.status === 'active' ? 'success' : r.status === 'disputed' ? 'error' : 'warning'}" style="font-size: 10px;">
                              ${r.status}
                            </span>
                          </td>
                        </tr>
                      `
                    )}
                  </tbody>
                </table>
              </div>
            `}
      </div>
    </div>
  `;
}
