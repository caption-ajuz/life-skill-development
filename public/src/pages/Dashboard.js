import api from '../services/api.js';
import { currentUser } from '../store/auth.js';
import { formatCurrency, formatNumber, formatDate } from '../utils/format.js';

const html = window.html;
const { useState, useEffect } = window.hooks;

export default function Dashboard() {
  const user = currentUser.value;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = async () => {
    if (!user) return;
    try {
      if (['super_admin', 'usthad'].includes(user.role)) {
        const res = await api.get('/api/dashboard/admin');
        if (res && res.success) setData(res.data);
      } else if (user.role === 'team_leader') {
        const teamId = user.teamId ? (user.teamId._id || user.teamId) : null;
        if (teamId) {
          const res = await api.get(`/api/dashboard/team/${teamId}`);
          if (res && res.success) setData(res.data);
        }
      } else {
        // team_member
        const res = await api.get(`/api/dashboard/member/${user._id}`);
        if (res && res.success) setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      if (window.showToast) window.showToast('Could not refresh dashboard. Displaying offline view.', 'warning');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [user]);

  if (loading) {
    return html`
      <div class="page">
        <div style="height: 120px; margin-bottom: 16px;" class="skeleton"></div>
        <div class="stats-grid">
          <div style="height: 80px;" class="skeleton"></div>
          <div style="height: 80px;" class="skeleton"></div>
          <div style="height: 80px;" class="skeleton"></div>
          <div style="height: 80px;" class="skeleton"></div>
        </div>
      </div>
    `;
  }

  // Super Admin & Usthad Dashboard View
  if (['super_admin', 'usthad'].includes(user.role)) {
    const d = data || {};
    return html`
      <div class="page">
        <!-- Welcome Card -->
        <div class="card" style="background: linear-gradient(135deg, #0891b2, #1d4ed8); color: white; border: none;">
          <div style="font-size: 13px; opacity: 0.9;">Campaign Overview</div>
          <div style="font-size: 18px; font-weight: 700; margin-top: 2px;">Markazul Hidayathil Islamiyya</div>
          <div style="font-size: 12px; opacity: 0.8; margin-top: 4px;">Logged in as: <b>${user.fullName}</b> (${user.role === 'super_admin' ? 'Super Admin' : 'Supervisor Usthad'})</div>
        </div>

        <!-- Campaign Stats Grid -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${formatNumber(d.totalDistributed || 0)}</div>
            <div class="stat-label">Distributed Calendars</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="color: #059669;">${formatCurrency(d.totalCollected || 0)}</div>
            <div class="stat-label">Total Collections</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="color: #2563eb;">${formatCurrency(d.confirmedTransfers || 0)}</div>
            <div class="stat-label">Confirmed In Bank</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="color: #d97706;">${formatCurrency(d.pendingTransfers || 0)}</div>
            <div class="stat-label">Transfers Pending</div>
          </div>
        </div>

        <!-- Stock & Teams Stats -->
        <div class="card">
          <div class="card-title">Stock Summary</div>
          <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border); font-size: 14px;">
            <span>Total Stock Registered:</span>
            <b>${formatNumber(d.totalStock || 0)}</b>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border); font-size: 14px;">
            <span>Allocated to Teams:</span>
            <b>${formatNumber(d.allocatedToTeams || 0)}</b>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
            <span>Distributed by Teams:</span>
            <b style="color: var(--primary);">${formatNumber(d.totalDistributed || 0)}</b>
          </div>
        </div>

        <!-- Financial Summary (Clear non-distorted calculation) -->
        <div class="card">
          <div class="card-title">Financial Summary</div>
          <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
            <span>Total Collected Income:</span>
            <b style="color: #059669;">${formatCurrency(d.totalCollected || 0)}</b>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
            <span>Initial Investment:</span>
            <span>${formatCurrency(d.initialInvestment || 0)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
            <span>Printing Costs:</span>
            <span>${formatCurrency(d.printingCost || 0)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
            <span>Other Operating Expenses:</span>
            <span>${formatCurrency(d.otherExpenses || 0)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-top: 2px solid var(--border); margin-top: 4px; font-size: 15px; font-weight: 700;">
            <span>Net Financial Balance:</span>
            <span style="color: ${(d.netProfitOrLoss || 0) >= 0 ? '#059669' : '#dc2626'};">${formatCurrency(d.netProfitOrLoss || 0)}</span>
          </div>
        </div>

        <!-- Quick Action Buttons -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;">
          <a href="#/teams" class="btn btn-secondary text-center" style="font-size: 13px;">Manage Teams (${d.totalTeams || 0})</a>
          <a href="#/stock" class="btn btn-secondary text-center" style="font-size: 13px;">Stock Allocation</a>
          <a href="#/transfers" class="btn btn-secondary text-center" style="font-size: 13px;">
            Verify Transfers ${d.pendingTransfersCount > 0 ? html`<span class="badge badge-error" style="margin-left: 4px;">${d.pendingTransfersCount}</span>` : ''}
          </a>
          <a href="#/reports" class="btn btn-primary text-center" style="font-size: 13px;">Generate Reports</a>
        </div>

        <!-- Team Rankings -->
        ${d.teamRankings && d.teamRankings.length > 0 ? html`
          <div class="card">
            <div class="card-title">Top Performing Teams</div>
            ${d.teamRankings.map((t, idx) => html`
              <div class="list-item" key=${t._id}>
                <div style="width: 28px; height: 28px; border-radius: 50%; background: ${idx === 0 ? '#fef08a' : idx === 1 ? '#e2e8f0' : '#ffedd5'}; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; color: #1e293b;">
                  ${idx + 1}
                </div>
                <div class="list-content">
                  <div class="list-title">${t.name}</div>
                  <div class="list-subtitle">${formatNumber(t.distributed)} calendars distributed</div>
                </div>
                <div style="font-weight: 600; color: #059669; font-size: 14px;">
                  ${formatCurrency(t.collected)}
                </div>
              </div>
            `)}
          </div>
        ` : ''}
      </div>
    `;
  }

  // Team Leader Dashboard View
  if (user.role === 'team_leader') {
    const d = data || {};
    return html`
      <div class="page">
        <!-- Team Header Card -->
        <div class="card" style="background: linear-gradient(135deg, #0891b2, #1d4ed8); color: white; border: none;">
          <div style="font-size: 13px; opacity: 0.9;">Team Leader Dashboard</div>
          <div style="font-size: 19px; font-weight: 700; margin-top: 2px;">${d.team ? d.team.name : 'My Team'}</div>
          <div style="font-size: 12px; opacity: 0.8; margin-top: 4px;">Leader: ${user.fullName}</div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${formatNumber(d.stockAllocatedToTeam || 0)}</div>
            <div class="stat-label">Team Total Stock</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="color: #0891b2;">${formatNumber(d.totalDistributed || 0)}</div>
            <div class="stat-label">Distributed</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="color: #059669;">${formatCurrency(d.totalCollected || 0)}</div>
            <div class="stat-label">Team Collections</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="color: #d97706;">${formatCurrency(d.outstandingCollections || 0)}</div>
            <div class="stat-label">Pending Handover</div>
          </div>
        </div>

        <div style="display: flex; gap: 10px; margin-bottom: 16px;">
          <a href="#/stock" class="btn btn-secondary" style="flex: 1; font-size: 13px;">Allocate Stock</a>
          <a href="#/transfers" class="btn btn-secondary" style="flex: 1; font-size: 13px;">Team Transfers</a>
        </div>

        <!-- Member Progress Table -->
        <div class="card">
          <div class="card-title">Member Progress (${d.memberProgress ? d.memberProgress.length : 0})</div>
          ${(d.memberProgress || []).map((m) => {
            const pct = m.allocated > 0 ? Math.min(100, Math.round((m.distributed / m.allocated) * 100)) : 0;
            return html`
              <div class="list-item" key=${m._id}>
                <div class="list-avatar">
                  ${m.profilePhoto ? html`<img src="${m.profilePhoto}" alt="" />` : m.fullName.charAt(0)}
                </div>
                <div class="list-content">
                  <div class="list-title">${m.fullName}</div>
                  <div style="height: 6px; background: #e2e8f0; border-radius: 3px; margin: 4px 0; overflow: hidden;">
                    <div style="height: 100%; width: ${pct}%; background: var(--primary);"></div>
                  </div>
                  <div class="list-subtitle">${m.distributed} / ${m.allocated} calendars (${pct}%)</div>
                </div>
                <div style="text-align: right;">
                  <div style="font-weight: 600; font-size: 14px; color: #059669;">${formatCurrency(m.collected)}</div>
                </div>
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }

  // Team Member Dashboard View
  const d = data || {};
  return html`
    <div class="page">
      <!-- Member Profile Header -->
      <div class="card" style="background: linear-gradient(135deg, #0891b2, #1d4ed8); color: white; border: none;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="list-avatar" style="width: 50px; height: 50px; font-size: 20px; background: white; color: var(--primary);">
            ${user.profilePhoto ? html`<img src="${user.profilePhoto}" alt="" />` : user.fullName.charAt(0)}
          </div>
          <div>
            <div style="font-size: 17px; font-weight: 700;">${user.fullName}</div>
            <div style="font-size: 13px; opacity: 0.9;">${d.member ? d.member.team : 'Participant'}</div>
          </div>
        </div>
      </div>

      <!-- Quick Action Buttons for fast mobile entry -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;">
        <a href="#/distribution" class="btn btn-primary" style="padding: 12px 10px; font-size: 14px;">
          📦 + Distribute
        </a>
        <a href="#/collections" class="btn btn-success" style="padding: 12px 10px; font-size: 14px;">
          💰 + Collect Money
        </a>
      </div>

      <!-- Personal Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${formatNumber(d.allocatedStock || 0)}</div>
          <div class="stat-label">My Stock Allocated</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color: var(--primary);">${formatNumber(d.distributedStock || 0)}</div>
          <div class="stat-label">Calendars Given</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color: #059669;">${formatCurrency(d.collectedAmount || 0)}</div>
          <div class="stat-label">Collected Amount</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color: #d97706;">${formatCurrency(d.untransferredAmount || 0)}</div>
          <div class="stat-label">In-Hand to Transfer</div>
        </div>
      </div>

      <a href="#/transfers" class="btn btn-secondary btn-full" style="margin-bottom: 16px;">
        🤝 Handover Collected Money (${formatCurrency(d.untransferredAmount || 0)})
      </a>

      <!-- Recent Distributions -->
      ${d.recentDistributions && d.recentDistributions.length > 0 ? html`
        <div class="card">
          <div class="card-title">Recent Distributions</div>
          ${d.recentDistributions.map((dist) => html`
            <div class="list-item" key=${dist._id}>
              <div class="list-content">
                <div class="list-title">${dist.areaId ? dist.areaId.name : 'Unspecified Area'}</div>
                <div class="list-subtitle">${formatDate(dist.date)} • ${dist.notes || 'Routine entry'}</div>
              </div>
              <div class="badge badge-success" style="font-size: 13px; font-weight: 700;">
                +${dist.quantity}
              </div>
            </div>
          `)}
        </div>
      ` : ''}

      <!-- Recent Collections -->
      ${d.recentCollections && d.recentCollections.length > 0 ? html`
        <div class="card">
          <div class="card-title">Recent Collections</div>
          ${d.recentCollections.map((col) => html`
            <div class="list-item" key=${col._id}>
              <div class="list-content">
                <div class="list-title">${col.areaId ? col.areaId.name : 'Area Collection'}</div>
                <div class="list-subtitle">${formatDate(col.date)}</div>
              </div>
              <div style="font-weight: 700; color: #059669;">
                ${formatCurrency(col.amount)}
              </div>
            </div>
          `)}
        </div>
      ` : ''}
    </div>
  `;
}
