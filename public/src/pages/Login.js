import { login } from '../store/auth.js';

const html = window.html;
const { useState } = window.hooks;

export default function Login() {
  const [method, setMethod] = useState('pin');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (method === 'pin' && (!phone.trim() || !/^\d{6}$/.test(pin))) {
      setError('Enter your phone number and 6-digit PIN.');
      return;
    }
    if (method === 'password' && (!username.trim() || !password)) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const credentials = method === 'pin'
        ? { phone: phone.trim(), pin }
        : { username: username.trim(), password };
      await login(credentials);
      if (window.showToast) window.showToast('Welcome back!', 'success');
      window.location.hash = '#/';
    } catch (err) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return html`
    <div style="min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 20px; background: linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%);">
      <div class="card" style="width: 100%; max-width: 380px; padding: 28px 24px; box-shadow: var(--shadow-md); border-radius: 16px; border: 1px solid rgba(8,145,178,0.2);">
        <div class="text-center" style="margin-bottom: 20px;">
          <img src="/logo.jpg" alt="Logo" style="width: 84px; height: 84px; border-radius: 16px; object-fit: contain; background: white; padding: 6px; box-shadow: var(--shadow-sm); margin-bottom: 12px;" />
          <h1 style="font-size: 20px; font-weight: 700; color: #0891b2; margin-bottom: 2px;">Life Skill Course</h1>
          <p style="font-size: 13px; color: var(--text-secondary); font-weight: 500;">Markazul Hidayathil Islamiyya</p>
          <p style="font-size: 11px; color: var(--text-light); margin-top: 2px;">Annual Calendar Camp Portal</p>
        </div>

        <div role="tablist" aria-label="Sign-in method" style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 4px; border-radius: 10px; background: #f1f5f9; margin-bottom: 18px;">
          <button type="button" role="tab" aria-selected=${method === 'pin'} onClick=${() => { setMethod('pin'); setError(''); }} style="border: 0; border-radius: 8px; padding: 10px 6px; font-size: 13px; font-weight: 600; cursor: pointer; color: ${method === 'pin' ? '#0e7490' : '#64748b'}; background: ${method === 'pin' ? 'white' : 'transparent'}; box-shadow: ${method === 'pin' ? '0 1px 3px rgba(15,23,42,0.12)' : 'none'};">
            Phone + PIN
          </button>
          <button type="button" role="tab" aria-selected=${method === 'password'} onClick=${() => { setMethod('password'); setError(''); }} style="border: 0; border-radius: 8px; padding: 10px 6px; font-size: 13px; font-weight: 600; cursor: pointer; color: ${method === 'password' ? '#0e7490' : '#64748b'}; background: ${method === 'password' ? 'white' : 'transparent'}; box-shadow: ${method === 'password' ? '0 1px 3px rgba(15,23,42,0.12)' : 'none'};">
            Username + Password
          </button>
        </div>

        ${error ? html`<div class="badge badge-error" style="width: 100%; padding: 10px; margin-bottom: 16px; border-radius: 8px; justify-content: center; font-size: 13px;">${error}</div>` : ''}

        <form onSubmit=${handleSubmit}>
          ${method === 'pin' ? html`
            <div class="form-group">
              <label class="form-label" for="login-phone">Phone Number</label>
              <input
                id="login-phone"
                type="tel"
                class="form-input"
                placeholder="Enter your registered phone number"
                value=${phone}
                onInput=${(e) => setPhone(e.target.value)}
                autocomplete="tel"
                inputmode="tel"
                required
                disabled=${loading}
              />
            </div>
            <div class="form-group">
              <label class="form-label" for="login-pin">6-digit PIN</label>
              <input
                id="login-pin"
                type="password"
                class="form-input"
                placeholder="Enter your PIN"
                value=${pin}
                onInput=${(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                autocomplete="current-password"
                inputmode="numeric"
                pattern="[0-9]{6}"
                maxlength="6"
                required
                disabled=${loading}
                style="letter-spacing: 0.3em; font-size: 20px;"
              />
              <div class="form-hint">PIN sign-in is available to Usthad accounts set up by an administrator.</div>
            </div>
          ` : html`
            <div class="form-group">
              <label class="form-label" for="login-username">Username</label>
              <input
                id="login-username"
                type="text"
                class="form-input"
                placeholder="Enter your username"
                value=${username}
                onInput=${(e) => setUsername(e.target.value)}
                autocomplete="username"
                required
                disabled=${loading}
              />
            </div>
            <div class="form-group" style="position: relative;">
              <label class="form-label" for="login-password">Password</label>
              <div style="position: relative;">
                <input
                  id="login-password"
                  type=${showPass ? 'text' : 'password'}
                  class="form-input"
                  placeholder="Enter your password"
                  value=${password}
                  onInput=${(e) => setPassword(e.target.value)}
                  autocomplete="current-password"
                  required
                  disabled=${loading}
                  style="padding-right: 48px;"
                />
                <button
                  type="button"
                  onClick=${() => setShowPass(!showPass)}
                  style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; padding: 8px; color: var(--text-secondary); cursor: pointer; font-size: 12px; font-weight: 600;"
                >
                  ${showPass ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </div>
          `}

          <button
            type="submit"
            class="btn btn-primary"
            style="margin-top: 8px;"
            disabled=${loading}
          >
            ${loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div style="margin-top: 16px; text-align: center; font-size: 11px; color: var(--text-light);">Your sign-in credentials are private. Contact the Super Admin if you need help accessing your account.</div>
      </div>
    </div>
  `;
}
