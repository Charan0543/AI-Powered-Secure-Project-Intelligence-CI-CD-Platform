/**
 * Sign In Page JavaScript - Enterprise Authenticator (Phase 1)
 */

document.addEventListener('DOMContentLoaded', () => {
  const signinForm = document.getElementById('signin-form');
  const emailInput = document.getElementById('signin-email');
  const passwordInput = document.getElementById('signin-password');
  const submitBtn = document.getElementById('signin-submit-btn');
  const globalAlert = document.getElementById('signin-global-alert');

  function clearErrors() {
    if (globalAlert) {
      globalAlert.textContent = '';
      globalAlert.hidden = true;
      globalAlert.className = 'form-alert';
    }
    document.querySelectorAll('.field-error-msg').forEach(el => el.textContent = '');
    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  }

  function showAlert(message, type = 'error') {
    if (!globalAlert) return;
    globalAlert.textContent = message;
    globalAlert.className = `form-alert ${type === 'info' ? 'form-alert-info' : ''}`;
    globalAlert.hidden = false;
  }

  // Password Visibility Toggle
  document.querySelectorAll('.password-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const targetInput = document.getElementById(targetId);
      if (!targetInput) return;
      const isPassword = targetInput.type === 'password';
      targetInput.type = isPassword ? 'text' : 'password';
      btn.classList.toggle('is-visible-active', isPassword);
    });
  });

  async function performLogin(email, password) {
    clearErrors();
    setButtonLoading(submitBtn, true, 'Authenticating...');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.status === 'AUTHENTICATED') {
        // Store session credentials
        sessionStorage.setItem('nexorian_session_token', data.sessionToken);
        sessionStorage.setItem('nexorian_user', JSON.stringify(data.user));
        sessionStorage.setItem('nexorian_role', data.role || '');
        if (data.activeOrganization) {
          sessionStorage.setItem('nexorian_active_org', JSON.stringify(data.activeOrganization));
        }
        if (data.memberships) {
          sessionStorage.setItem('nexorian_memberships', JSON.stringify(data.memberships));
        }

        // Check if there is an explicit redirect param in URL
        const params = new URLSearchParams(window.location.search);
        const redirectParam = params.get('redirect');

        window.location.href = redirectParam || data.redirectUrl || '/workspace';
      } else if (data.status === 'UNVERIFIED_EMAIL') {
        showAlert('Your account email is unverified. Please verify your email OTP before logging in.', 'error');
      } else {
        showAlert(data.error || 'Invalid email address or password. Please verify your credentials.', 'error');
      }
    } catch (err) {
      console.error('Sign in error:', err);
      showAlert('Unable to connect to the authentication server. Please check your connection.', 'error');
    } finally {
      setButtonLoading(submitBtn, false, 'Sign In');
    }
  }

  if (signinForm) {
    signinForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = emailInput.value.trim().toLowerCase();
      const password = passwordInput.value;

      let hasError = false;
      if (!email) {
        const errEl = document.getElementById('error-email');
        if (errEl) errEl.textContent = 'Work email address is required.';
        emailInput.classList.add('is-invalid');
        hasError = true;
      }
      if (!password) {
        const errEl = document.getElementById('error-password');
        if (errEl) errEl.textContent = 'Password is required.';
        passwordInput.classList.add('is-invalid');
        hasError = true;
      }

      if (!hasError) {
        performLogin(email, password);
      }
    });
  }

  // 1-Click Demo Buttons handler
  document.querySelectorAll('.btn-demo-login').forEach(btn => {
    btn.addEventListener('click', () => {
      const email = btn.getAttribute('data-email');
      const pass = btn.getAttribute('data-pass');
      if (emailInput) emailInput.value = email;
      if (passwordInput) passwordInput.value = pass;
      performLogin(email, pass);
    });
  });

  function setButtonLoading(btn, isLoading, loadingText = 'Processing...') {
    if (!btn) return;
    const btnText = btn.querySelector('.btn-text');
    const btnSpinner = btn.querySelector('.btn-spinner');
    btn.disabled = isLoading;
    if (btnSpinner) btnSpinner.hidden = !isLoading;
    if (btnText) {
      if (isLoading) {
        btnText.setAttribute('data-original-text', btnText.textContent);
        btnText.textContent = loadingText;
      } else {
        const orig = btnText.getAttribute('data-original-text');
        if (orig) btnText.textContent = orig;
      }
    }
  }
});
