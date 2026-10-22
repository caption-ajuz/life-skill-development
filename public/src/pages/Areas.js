import api from '../services/api.js';
import { currentUser } from '../store/auth.js';
import { formatCurrency, formatNumber } from '../utils/format.js';

const html = window.html;
const { useState, useEffect } = window.hooks;

export default function Areas() {
  const user = currentUser.value;
  const isSuperAdmin = user && user.role === 'super_admin';

  const [areas, setAreas] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [district, setDistrict] = useState('Palakkad');
  const [submitting, setSubmitting] = useState(false);

  // Merge tool for Super Admin
  const [showMerge, setShowMerge] = useState(false);
  const [sourceAreaId, setSourceAreaId] = useState('');
  const [targetAreaId, setTargetAreaId] = useState('');
  const [merging, setMerging] = useState(false);

  const loadAreas = async () => {
    try {
      const res = await api.get('/api/areas', search ? { search } : {});
      if (res && res.success && res.data) {
        setAreas(res.data);
      }
    } catch (err) {
      console.warn('Failed to load areas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadAreas();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const handleAddArea = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const res = await api.post('/api/areas', {
        name: name.trim(),
        district: district.trim()
      });

      if (res && res.success) {
        if (window.showToast) window.showToast(`Area "${name}" added!`, 'success');
        setName('');
        setShowAdd(false);
        loadAreas();
      }
    } catch (err) {
      if (window.showToast) window.showToast(err.message || 'Failed to add area.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMergeAreas = async (e) => {
    e.preventDefault();
    if (!sourceAreaId || !targetAreaId || sourceAreaId === targetAreaId) {
      if (window.showToast) window.showToast('Please select two distinct areas to merge.', 'error');
      return;
    }

    if (!confirm('Are you sure you want to merge these areas? Historical distributions and collections will be reassigned.')) return;

    setMerging(true);
    try {
      const res = await api.post('/api/areas/merge', {
        sourceAreaId,
        targetAreaId
      });

      if (res && res.success) {
        if (window.showToast) window.showToast(res.message || 'Areas merged successfully! ✓', 'success');
        setShowMerge(false);
        setSourceAreaId('');
        setTargetAreaId('');
        loadAreas();
      }
    } catch (err) {
      if (window.showToast) window.showToast(err.message || 'Failed to merge areas.', 'error');
    } finally {
      setMerging(false);
    }
  };

  return html`
    <div class="page">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <div>
          <h2 style="font-size: 19px; font-weight: 700;">Covered Areas</h2>
          <p style="font-size: 12px; color: var(--text-secondary);">Campaign distribution localities</p>
        </div>
        <div style="display: flex; gap: 8px;">
          ${isSuperAdmin
            ? html`
                <button
                  class="btn btn-secondary btn-sm"
                  onClick=${() => setShowMerge(!showMerge)}
                >
                  Merge Dupes
                </button>
              `
            : ''}
          <button
            class="btn btn-primary btn-sm"
            onClick=${() => setShowAdd(true)}
          >
            + Add Area
          </button>
        </div>
      </div>

      <!-- Add Area Modal -->
      ${showAdd
        ? html`
            <div class="modal-overlay" onClick=${() => setShowAdd(false)}>
              <div class="modal" onClick=${(e) => e.stopPropagation()}>
                <div class="modal-header">
                  <div class="modal-title">Register New Area</div>
                  <button onClick=${() => setShowAdd(false)} style="background: none; border: none; font-size: 18px; cursor: pointer;">✕</button>
                </div>
                <form onSubmit=${handleAddArea}>
                  <div class="form-group">
                    <label class="form-label">Locality / Area Name</label>
                    <input type="text" class="form-input" placeholder="e.g. Kombam, Kodakkad, Mannarkkad Town" value=${name} onInput=${(e) => setName(e.target.value)} required />
                  </div>
                  <div class="form-group">
                    <label class="form-label">District</label>
                    <input type="text" class="form-input" placeholder="District name" value=${district} onInput=${(e) => setDistrict(e.target.value)} required />
                  </div>
                  <button type="submit" class="btn btn-primary btn-full" disabled=${submitting}>
                    ${submitting ? 'Adding...' : 'Add Area'}
                  </button>
                </form>
              </div>
            </div>
          `
        : ''}

      <!-- Merge Areas Modal -->
      ${showMerge
        ? html`
            <div class="card" style="border: 2px solid var(--warning); margin-bottom: 14px;">
              <div class="card-title" style="color: var(--warning);">Consolidate Duplicate Areas</div>
              <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 10px;">
                Re-assign all historical distributions and collections from the duplicate spelling into the canonical area.
              </p>
              <form onSubmit=${handleMergeAreas}>
                <div class="form-group">
                  <label class="form-label">Duplicate / Misspelled Area (Source)</label>
                  <select class="form-input" value=${sourceAreaId} onChange=${(e) => setSourceAreaId(e.target.value)} required>
                    <option value="">Select duplicate...</option>
                    ${areas.map((a) => html`<option key=${a._id} value=${a._id}>${a.name} (${a.district})</option>`)}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Correct Master Area (Target)</label>
                  <select class="form-input" value=${targetAreaId} onChange=${(e) => setTargetAreaId(e.target.value)} required>
                    <option value="">Select master area...</option>
                    ${areas.map((a) => html`<option key=${a._id} value=${a._id}>${a.name} (${a.district})</option>`)}
                  </select>
                </div>
                <button type="submit" class="btn btn-warning btn-full" disabled=${merging}>
                  ${merging ? 'Merging...' : 'Merge and Reassign Records'}
                </button>
              </form>
            </div>
          `
        : ''}

      <!-- Search Input -->
      <div class="form-group">
        <input
          type="text"
          class="form-input"
          placeholder="🔍 Search area name..."
          value=${search}
          onInput=${(e) => setSearch(e.target.value)}
        />
      </div>

      <!-- Area Cards -->
      ${loading
        ? html`<div style="height: 100px;" class="skeleton"></div>`
        : areas.length === 0
        ? html`<div class="empty-state"><p>No matching areas found.</p></div>`
        : html`
            <div>
              ${areas.map(
                (a) => html`
                  <div class="card" key=${a._id} style="margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <div>
                        <div style="font-size: 15px; font-weight: 700;">${a.name}</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">${a.district || 'Palakkad'}</div>
                      </div>
                      <div style="text-align: right;">
                        <div class="badge badge-info">${formatNumber(a.totalDistributed)} calendars</div>
                        <div style="font-size: 12px; font-weight: 600; color: #059669; margin-top: 2px;">
                          ${formatCurrency(a.totalCollected)}
                        </div>
                      </div>
                    </div>
                  </div>
                `
              )}
            </div>
          `}
    </div>
  `;
}
