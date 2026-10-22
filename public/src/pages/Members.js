import api from '../services/api.js';
import { currentUser } from '../store/auth.js';
import { formatCurrency, formatNumber } from '../utils/format.js';

const html = window.html;
const { useState, useEffect } = window.hooks;

export default function Members() {
  const user = currentUser.value;
  const isSuperAdmin = user && user.role === 'super_admin';
  const isLeader = user && user.role === 'team_leader';

  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);

  // New User Form State
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [newRole, setNewRole] = useState('team_member');
  const [newTeamId, setNewTeamId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Stock Allocation Modal
  const [selectedMember, setSelectedMember] = useState(null);
  const [allocQty, setAllocQty] = useState('');
  const [allocating, setAllocating] = useState(false);

  const loadData = async () => {
    try {
      const [usersRes, teamsRes] = await Promise.all([
        api.get('/api/users'),
        api.get('/api/teams')
      ]);

      if (usersRes && usersRes.success) {
        setMembers(usersRes.data.users || []);
      }
      if (teamsRes && teamsRes.success) {
        setTeams(teamsRes.data || []);
      }
    } catch (err) {
      console.warn('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (newRole === 'usthad' && (!/^\d{6}$/.test(newPin) || newPin !== confirmPin)) {
      if (window.showToast) window.showToast('Enter and confirm the same 6-digit Usthad PIN.', 'error');
      return;
    }
    setSubmitting(true);

    try {
      await api.post('/api/users', {
        username: newUsername.trim(),
        password: newPassword,
        fullName: newFullName.trim(),
        phone: newPhone.trim(),
        pin: newRole === 'usthad' ? newPin : undefined,
        role: newRole,
        teamId: newTeamId || null
      });

      if (window.showToast) window.showToast(`User "${newFullName}" created!`, 'success');
      setShowAddUser(false);
      setNewUsername('');
      setNewPassword('');
      setNewFullName('');
      setNewPhone('');
      setNewPin('');
      setConfirmPin('');
      loadData();
    } catch (err) {
      if (window.showToast) window.showToast(err.message || 'Failed to create user.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAllocateMember = async (e) => {
    e.preventDefault();
    const qty = parseInt(allocQty, 10);
    if (isNaN(qty) || qty < 0) return;

    setAllocating(true);
    try {
      await api.post('/api/stock/allocate-member', {
        memberId: selectedMember._id,
        quantity: qty
      });

      if (window.showToast) window.showToast(`Allocated ${qty} calendars to ${selectedMember.fullName}`, 'success');
      setSelectedMember(null);
      setAllocQty('');
      loadData();
    } catch (err) {
      if (window.showToast) window.showToast(err.message || 'Allocation failed.', 'error');
    } finally {
      setAllocating(false);
    }
  };

  return html`
    <div class="page">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
        <div>
          <h2 style="font-size: 19px; font-weight: 700;">Participants & Members</h2>
          <p style="font-size: 12px; color: var(--text-secondary);">Manage camp participants and assignments</p>
        </div>
        ${isSuperAdmin
          ? html`
              <button
                class="btn btn-primary btn-sm"
                onClick=${() => setShowAddUser(true)}
              >
                + New User
              </button>
            `
          : ''}
      </div>

      <!-- Create User Modal -->
      ${showAddUser
        ? html`
            <div class="modal-overlay" onClick=${() => setShowAddUser(false)}>
              <div class="modal" onClick=${(e) => e.stopPropagation()}>
                <div class="modal-header">
                  <div class="modal-title">Create Account</div>
                  <button onClick=${() => setShowAddUser(false)} style="background: none; border: none; font-size: 18px; cursor: pointer;">✕</button>
                </div>
                <form onSubmit=${handleCreateUser}>
                  <div class="form-group">
                    <label class="form-label">Full Name</label>
                    <input type="text" class="form-input" placeholder="e.g. Abdulla K." value=${newFullName} onInput=${(e) => setNewFullName(e.target.value)} required />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Username (Login ID)</label>
                    <input type="text" class="form-input" placeholder="e.g. abdulla123" value=${newUsername} onInput=${(e) => setNewUsername(e.target.value)} required />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Password</label>
                    <input type="password" class="form-input" placeholder="Min 6 characters" value=${newPassword} onInput=${(e) => setNewPassword(e.target.value)} required />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Role</label>
                    <select class="form-input" value=${newRole} onChange=${(e) => setNewRole(e.target.value)}>
                      <option value="team_member">Team Member</option>
                      <option value="team_leader">Team Leader</option>
                      <option value="usthad">Supervisor Usthad</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Phone Number ${newRole === 'usthad' ? '(required for PIN sign-in)' : ''}</label>
                    <input type="tel" class="form-input" placeholder="10-digit mobile number" value=${newPhone} onInput=${(e) => setNewPhone(e.target.value)} required=${newRole === 'usthad'} autocomplete="tel" inputmode="tel" />
                  </div>
                  ${newRole === 'usthad' ? html`
                    <div style="padding: 12px; margin-bottom: 14px; border-radius: 10px; background: #f0f9ff; border: 1px solid #bae6fd;">
                      <div style="font-size: 13px; font-weight: 700; color: #0e7490; margin-bottom: 4px;">Usthad quick sign-in</div>
                      <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 10px;">This account can sign in with either username/password or phone/PIN.</div>
                      <div class="form-group">
                        <label class="form-label">Set 6-digit PIN</label>
                        <input type="password" class="form-input" placeholder="Six digits" value=${newPin} onInput=${(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))} required inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="new-password" />
                      </div>
                      <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label">Confirm PIN</label>
                        <input type="password" class="form-input" placeholder="Re-enter PIN" value=${confirmPin} onInput=${(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))} required inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="new-password" />
                      </div>
                    </div>
                  ` : ''}
                  <div class="form-group">
                    <label class="form-label">Assign to Team</label>
                    <select class="form-input" value=${newTeamId} onChange=${(e) => setNewTeamId(e.target.value)}>
                      <option value="">No Team Assigned</option>
                      ${teams.map((t) => html`<option key=${t._id} value=${t._id}>${t.name}</option>`)}
                    </select>
                  </div>
                  <button type="submit" class="btn btn-primary btn-full" disabled=${submitting}>
                    ${submitting ? 'Creating...' : 'Create Account'}
                  </button>
                </form>
              </div>
            </div>
          `
        : ''}

      <!-- Allocate Stock Modal -->
      ${selectedMember
        ? html`
            <div class="modal-overlay" onClick=${() => setSelectedMember(null)}>
              <div class="modal" onClick=${(e) => e.stopPropagation()}>
                <div class="modal-header">
                  <div class="modal-title">Allocate Stock to ${selectedMember.fullName}</div>
                  <button onClick=${() => setSelectedMember(null)} style="background: none; border: none; font-size: 18px; cursor: pointer;">✕</button>
                </div>
                <form onSubmit=${handleAllocateMember}>
                  <div class="form-group">
                    <label class="form-label">Number of Calendars to Allocate</label>
                    <input type="tel" pattern="[0-9]*" class="form-input" placeholder="e.g. 50" value=${allocQty} onInput=${(e) => setAllocQty(e.target.value)} required style="font-size: 20px; font-weight: 700; color: var(--primary);" />
                  </div>
                  <button type="submit" class="btn btn-primary btn-full" disabled=${allocating}>
                    ${allocating ? 'Allocating...' : 'Confirm Allocation'}
                  </button>
                </form>
              </div>
            </div>
          `
        : ''}

      <!-- Members List -->
      ${loading
        ? html`<div style="height: 120px;" class="skeleton"></div>`
        : members.length === 0
        ? html`<div class="empty-state"><p>No participants registered yet.</p></div>`
        : html`
            <div>
              ${members.map(
                (m) => html`
                  <div class="card" key=${m._id} style="margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <div class="list-avatar">
                        ${m.profilePhoto ? html`<img src="${m.profilePhoto}" alt="" />` : m.fullName.charAt(0)}
                      </div>
                      <div class="list-content">
                        <div class="list-title">${m.fullName}</div>
                        <div class="list-subtitle">
                          @${m.username} • ${m.teamId ? m.teamId.name : 'No team'} • <span style="text-transform: capitalize;">${m.role.replace('_', ' ')}</span>
                        </div>
                      </div>
                      ${isSuperAdmin || isLeader
                        ? html`
                            <button
                              class="btn btn-outline btn-sm"
                              onClick=${() => {
                                setSelectedMember(m);
                                setAllocQty('');
                              }}
                            >
                              Stock
                            </button>
                          `
                        : ''}
                    </div>
                  </div>
                `
              )}
            </div>
          `}
    </div>
  `;
}
