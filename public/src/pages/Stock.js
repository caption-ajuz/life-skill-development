import api from '../services/api.js';
import { currentUser } from '../store/auth.js';
import { formatNumber, formatCurrency } from '../utils/format.js';

const html = window.html;
const { useState, useEffect } = window.hooks;

export default function Stock() {
  const user = currentUser.value;
  const isSuperAdmin = user && user.role === 'super_admin';
  const isLeader = user && user.role === 'team_leader';

  const [summary, setSummary] = useState(null);
  const [config, setConfig] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Allocation to team
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [teamAllocQty, setTeamAllocQty] = useState('');
  const [submittingTeam, setSubmittingTeam] = useState(false);

  // Campaign config edit
  const [editConfig, setEditConfig] = useState(false);
  const [totalStockInput, setTotalStockInput] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  const loadStockData = async () => {
    try {
      const [sumRes, cfgRes, teamsRes] = await Promise.all([
        api.get('/api/stock/summary'),
        api.get('/api/stock/campaign'),
        api.get('/api/teams')
      ]);

      if (sumRes && sumRes.success) setSummary(sumRes.data);
      if (cfgRes && cfgRes.success) {
        setConfig(cfgRes.data);
        setTotalStockInput(cfgRes.data.totalStock);
        setPriceInput(cfgRes.data.calendarPrice);
      }
      if (teamsRes && teamsRes.success) setTeams(teamsRes.data);
    } catch (err) {
      console.warn('Failed to load stock data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStockData();
  }, []);

  const handleAllocateTeam = async (e) => {
    e.preventDefault();
    const qty = parseInt(teamAllocQty, 10);
    if (!selectedTeamId || isNaN(qty) || qty < 0) {
      if (window.showToast) window.showToast('Please select a team and enter a valid quantity.', 'error');
      return;
    }

    setSubmittingTeam(true);
    try {
      await api.post('/api/stock/allocate-team', {
        teamId: selectedTeamId,
        quantity: qty
      });

      if (window.showToast) window.showToast(`Stock allocated to team successfully! ✓`, 'success');
      setTeamAllocQty('');
      loadStockData();
    } catch (err) {
      if (window.showToast) window.showToast(err.message || 'Allocation failed.', 'error');
    } finally {
      setSubmittingTeam(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await api.put('/api/stock/campaign', {
        totalStock: parseInt(totalStockInput, 10),
        calendarPrice: parseFloat(priceInput)
      });
      if (window.showToast) window.showToast('Campaign stock config updated! ✓', 'success');
      setEditConfig(false);
      loadStockData();
    } catch (err) {
      if (window.showToast) window.showToast(err.message || 'Failed to update configuration.', 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  if (loading) {
    return html`<div class="page"><div style="height: 140px;" class="skeleton"></div></div>`;
  }

  const s = summary || {};

  return html`
    <div class="page">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <div>
          <h2 style="font-size: 19px; font-weight: 700;">Stock Management</h2>
          <p style="font-size: 12px; color: var(--text-secondary);">Campaign calendars and team allocations</p>
        </div>
      </div>

      <!-- Campaign Stock Overview Card -->
      <div class="card" style="background: linear-gradient(135deg, #0891b2, #1d4ed8); color: white; border: none;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="font-size: 13px; opacity: 0.9;">Total Campaign Stock</div>
            <div style="font-size: 26px; font-weight: 700;">${formatNumber(s.totalCampaignStock || 0)}</div>
            <div style="font-size: 12px; opacity: 0.85; margin-top: 2px;">Calendar Price: ${formatCurrency(s.calendarPrice || 100)}</div>
          </div>
          ${isSuperAdmin
            ? html`
                <button
                  class="btn btn-sm"
                  style="background: rgba(255,255,255,0.2); color: white; border: none;"
                  onClick=${() => setEditConfig(!editConfig)}
                >
                  ${editConfig ? 'Cancel' : 'Edit Stock'}
                </button>
              `
            : ''}
        </div>
      </div>

      <!-- Edit Stock Config Form -->
      ${editConfig
        ? html`
            <div class="card" style="border: 2px solid var(--primary);">
              <div class="card-title">Configure Campaign Stock & Price</div>
              <form onSubmit=${handleSaveConfig}>
                <div class="form-group">
                  <label class="form-label">Total Campaign Stock</label>
                  <input
                    type="tel"
                    class="form-input"
                    value=${totalStockInput}
                    onInput=${(e) => setTotalStockInput(e.target.value)}
                    required
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">Unit Calendar Price (₹)</label>
                  <input
                    type="tel"
                    class="form-input"
                    value=${priceInput}
                    onInput=${(e) => setPriceInput(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" class="btn btn-primary btn-full" disabled=${savingConfig}>
                  ${savingConfig ? 'Saving...' : 'Save Configuration'}
                </button>
              </form>
            </div>
          `
        : ''}

      <!-- Stock Metrics Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value" style="color: var(--primary);">${formatNumber(s.totalAllocatedToTeams || 0)}</div>
          <div class="stat-label">Allocated to Teams</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color: #059669;">${formatNumber(s.unallocatedCampaignStock || 0)}</div>
          <div class="stat-label">Stock in Central Store</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color: #2563eb;">${formatNumber(s.totalAllocatedToMembers || 0)}</div>
          <div class="stat-label">Allocated to Members</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color: #d97706;">${formatNumber(s.remainingWithMembers || 0)}</div>
          <div class="stat-label">Remaining with Members</div>
        </div>
      </div>

      <!-- Super Admin Allocate Stock to Team -->
      ${isSuperAdmin
        ? html`
            <div class="card">
              <div class="card-title">Allocate Stock to a Team</div>
              <form onSubmit=${handleAllocateTeam}>
                <div class="form-group">
                  <label class="form-label">Select Team</label>
                  <select
                    class="form-input"
                    value=${selectedTeamId}
                    onChange=${(e) => setSelectedTeamId(e.target.value)}
                    required
                  >
                    <option value="">Choose team...</option>
                    ${teams.map((t) => html`<option key=${t._id} value=${t._id}>${t.name} (Currently: ${t.allocatedStock || 0})</option>`)}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Quantity to Allocate</label>
                  <input
                    type="tel"
                    pattern="[0-9]*"
                    class="form-input"
                    placeholder="e.g. 500"
                    value=${teamAllocQty}
                    onInput=${(e) => setTeamAllocQty(e.target.value)}
                    required
                    style="font-size: 20px; font-weight: 700; color: var(--primary);"
                  />
                  <div class="form-hint">
                    Maximum available in central store: <b>${formatNumber(s.unallocatedCampaignStock || 0)}</b>
                  </div>
                </div>
                <button type="submit" class="btn btn-primary btn-full" disabled=${submittingTeam}>
                  ${submittingTeam ? 'Allocating...' : 'Allocate to Team ✓'}
                </button>
              </form>
            </div>
          `
        : ''}

      <!-- Team Allocations Breakdown Table -->
      <div class="card">
        <div class="card-title">Team Stock Breakdown</div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Team</th>
                <th class="text-right">Allocated</th>
                <th class="text-right">Given</th>
                <th class="text-right">Left</th>
              </tr>
            </thead>
            <tbody>
              ${teams.map(
                (t) => html`
                  <tr key=${t._id}>
                    <td><b>${t.name}</b></td>
                    <td class="text-right">${formatNumber(t.allocatedStock || 0)}</td>
                    <td class="text-right" style="color: var(--primary); font-weight: 600;">${formatNumber(t.totalDistributed || 0)}</td>
                    <td class="text-right" style="color: #059669;">${formatNumber(Math.max(0, (t.allocatedStock || 0) - (t.totalDistributed || 0)))}</td>
                  </tr>
                `
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}
