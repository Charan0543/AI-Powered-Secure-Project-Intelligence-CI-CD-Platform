/**
 * Join Organization Page JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
  // Tabs & Panes
  const joinTab1 = document.getElementById('join-tab-1');
  const joinTab2 = document.getElementById('join-tab-2');
  const joinTab3 = document.getElementById('join-tab-3');

  const paneToken = document.getElementById('join-pane-token');
  const paneForm = document.getElementById('join-pane-form');
  const paneVerify = document.getElementById('join-pane-verify');
  const paneSuccess = document.getElementById('join-pane-success');

  // Global Alert
  const globalAlert = document.getElementById('join-global-alert');

  // Token Lookup Elements
  const tokenLookupForm = document.getElementById('token-lookup-form');
  const tokenInput = document.getElementById('invitation-token-input');
  const validateTokenBtn = document.getElementById('validate-token-btn');
  const errorTokenInput = document.getElementById('error-invitationTokenInput');

  // Join Form Elements
  const joinForm = document.getElementById('join-account-form');
  const joinTokenHidden = document.getElementById('join-token-hidden');
  const displayOrgName = document.getElementById('display-org-name');
  const displayInvitedRole = document.getElementById('display-invited-role');
  const joinNameInput = document.getElementById('join-name');
  const joinEmailInput = document.getElementById('join-email');
  const joinEmployeeIdInput = document.getElementById('join-employee-id');
  const joinPhoneInput = document.getElementById('join-phone');
  const joinGithubInput = document.getElementById('join-github');
  const joinPasswordInput = document.getElementById('join-password');
  const joinConfirmPasswordInput = document.getElementById('join-confirm-password');
  const backToTokenBtn = document.getElementById('back-to-token-btn');
  const submitJoinBtn = document.getElementById('submit-join-btn');

  // Verification Elements
  const displayVerifyEmail = document.getElementById('display-verify-email');
  const joinDevCodeBanner = document.getElementById('join-dev-code-banner');
  const joinDevCodeValue = document.getElementById('join-dev-code-value');
  const joinAutofillOtpBtn = document.getElementById('join-autofill-otp-btn');
  const joinVerifyOtpForm = document.getElementById('join-verify-otp-form');
  const joinVerifyOtpBtn = document.getElementById('join-verify-otp-btn');
  const joinResendOtpBtn = document.getElementById('join-resend-otp-btn');
  const errorJoinCode = document.getElementById('error-join-code');
  const otpDigits = paneVerify.querySelectorAll('.otp-digit');

  // Success Elements
  const finalJoinOrg = document.getElementById('final-join-org');
  const finalJoinRole = document.getElementById('final-join-role');
  const finalJoinEmail = document.getElementById('final-join-email');

  // State
  let currentToken = '';
  let invitationData = null;
  let applicantEmail = '';
  let resendCooldown = 0;
  let resendInterval = null;

  // --------------------------------------------------------------------------
  // Step Management
  // --------------------------------------------------------------------------
  function setJoinStep(step) {
    clearErrors();

    paneToken.hidden = step !== 1;
    paneForm.hidden = step !== 2;
    paneVerify.hidden = step !== 3;
    paneSuccess.hidden = step !== 4;

    joinTab1.classList.remove('is-active', 'is-completed');
    joinTab2.classList.remove('is-active', 'is-completed');
    joinTab3.classList.remove('is-active', 'is-completed');

    if (step === 1) {
      joinTab1.classList.add('is-active');
      if (tokenInput) tokenInput.focus();
    } else if (step === 2) {
      joinTab1.classList.add('is-completed');
      joinTab2.classList.add('is-active');
      if (joinNameInput) joinNameInput.focus();
    } else if (step === 3) {
      joinTab1.classList.add('is-completed');
      joinTab2.classList.add('is-completed');
      joinTab3.classList.add('is-active');
      if (otpDigits.length > 0) otpDigits[0].focus();
    } else if (step === 4) {
      joinTab1.classList.add('is-completed');
      joinTab2.classList.add('is-completed');
      joinTab3.classList.add('is-completed');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function clearErrors() {
    if (globalAlert) {
      globalAlert.textContent = '';
      globalAlert.hidden = true;
    }
    document.querySelectorAll('.field-error-msg').forEach(el => el.textContent = '');
    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  }

  function displayFieldError(field, message) {
    const errorEl = document.getElementById(`error-${field}`);
    const groupEl = document.getElementById(`group-${field}`);
    if (errorEl) errorEl.textContent = message;
    if (groupEl) {
      const inputEl = groupEl.querySelector('.form-input, .password-input-wrapper');
      if (inputEl) inputEl.classList.add('is-invalid');
    }
  }

  function displayErrors(details = {}, globalMessage = null) {
    clearErrors();
    if (globalMessage && globalAlert) {
      globalAlert.textContent = globalMessage;
      globalAlert.hidden = false;
    }
    Object.keys(details).forEach(field => {
      displayFieldError(field, details[field]);
    });
  }

  // --------------------------------------------------------------------------
  // Password Visibility Toggles
  // --------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------
  // 1. Token Validation
  // --------------------------------------------------------------------------
  async function validateToken(tokenString) {
    const cleanToken = (tokenString || '').trim();
    if (!cleanToken) {
      if (errorTokenInput) errorTokenInput.textContent = 'Please enter an invitation token or code.';
      return;
    }

    setButtonLoading(validateTokenBtn, true, 'Validating...');
    clearErrors();

    try {
      const res = await fetch(`/api/organizations/invitation/${cleanToken}`);
      const data = await res.json();

      if (res.ok && data.success) {
        invitationData = data.data;
        currentToken = cleanToken;

        // Populate join form
        if (displayOrgName) displayOrgName.textContent = invitationData.organization.name;
        if (displayInvitedRole) displayInvitedRole.textContent = invitationData.role;
        if (joinTokenHidden) joinTokenHidden.value = currentToken;
        if (joinEmailInput && invitationData.email) {
          joinEmailInput.value = invitationData.email;
        }

        setJoinStep(2);
      } else {
        if (errorTokenInput) {
          errorTokenInput.textContent = data.error || 'Invalid or expired invitation token.';
        }
      }
    } catch (err) {
      console.error('Token verification error:', err);
      if (errorTokenInput) {
        errorTokenInput.textContent = 'Unable to verify invitation token. Check your connection.';
      }
    } finally {
      setButtonLoading(validateTokenBtn, false, 'Validate Invitation');
    }
  }

  if (tokenLookupForm) {
    tokenLookupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      validateToken(tokenInput.value);
    });
  }

  if (backToTokenBtn) {
    backToTokenBtn.addEventListener('click', () => {
      setJoinStep(1);
    });
  }

  // --------------------------------------------------------------------------
  // 2. Submit Join Request
  // --------------------------------------------------------------------------
  if (joinForm) {
    joinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors();

      const name = joinNameInput.value.trim();
      const email = joinEmailInput.value.trim().toLowerCase();
      const employeeId = joinEmployeeIdInput ? joinEmployeeIdInput.value.trim() : '';
      const password = joinPasswordInput.value;
      const confirmPassword = joinConfirmPasswordInput.value;

      let hasError = false;
      if (!name) {
        displayFieldError('name', 'Full name is required.');
        hasError = true;
      }
      if (!email) {
        displayFieldError('email', 'Email address is required.');
        hasError = true;
      }
      if (!employeeId) {
        displayFieldError('employeeId', 'Employee ID is required for organization onboarding.');
        hasError = true;
      }
      if (!password || password.length < 8) {
        displayFieldError('password', 'Password must be at least 8 characters long.');
        hasError = true;
      }
      if (!confirmPassword || password !== confirmPassword) {
        displayFieldError('confirmPassword', 'Passwords do not match.');
        hasError = true;
      }

      if (hasError) return;

      const payload = {
        name,
        email,
        employeeId,
        password,
        confirmPassword,
        phoneNumber: joinPhoneInput ? joinPhoneInput.value.trim() : '',
        githubUrl: joinGithubInput ? joinGithubInput.value.trim() : '',
        invitationToken: currentToken,
      };

      setButtonLoading(submitJoinBtn, true, 'Submitting Join Request...');

      try {
        const res = await fetch('/api/organizations/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          applicantEmail = email;
          if (displayVerifyEmail) displayVerifyEmail.textContent = applicantEmail;

          // If email is already verified
          if (data.data.user.isEmailVerified) {
            showSuccessState(data.data);
          } else {
            // Show dev OTP helper if returned
            if (data.data.verificationCode) {
              if (joinDevCodeValue) joinDevCodeValue.textContent = data.data.verificationCode;
              if (joinDevCodeBanner) joinDevCodeBanner.hidden = false;
            }
            setJoinStep(3);
          }
        } else {
          displayErrors(data.details || {}, data.error || 'Failed to submit join request.');
        }
      } catch (err) {
        console.error('Join request error:', err);
        displayErrors({}, 'Unable to connect to the server. Please try again.');
      } finally {
        setButtonLoading(submitJoinBtn, false, 'Submit Join Request');
      }
    });
  }

  // --------------------------------------------------------------------------
  // 3. OTP Verification
  // --------------------------------------------------------------------------
  function syncJoinOtp() {
    let code = '';
    otpDigits.forEach(d => { code += d.value; });
    return code;
  }

  otpDigits.forEach((digitInput, index) => {
    digitInput.addEventListener('input', (e) => {
      const val = e.target.value;
      if (val && !/^\d$/.test(val)) {
        e.target.value = '';
        return;
      }
      if (val.length === 1 && index < otpDigits.length - 1) {
        otpDigits[index + 1].focus();
      }
    });

    digitInput.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !digitInput.value && index > 0) {
        otpDigits[index - 1].focus();
      }
    });

    digitInput.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim();
      const digits = pasteData.replace(/\D/g, '').substring(0, 6);
      digits.split('').forEach((d, i) => {
        if (otpDigits[i]) otpDigits[i].value = d;
      });
      const nextFocus = Math.min(digits.length, 5);
      if (otpDigits[nextFocus]) otpDigits[nextFocus].focus();
    });
  });

  if (joinAutofillOtpBtn && joinDevCodeValue) {
    joinAutofillOtpBtn.addEventListener('click', () => {
      const code = joinDevCodeValue.textContent.trim();
      if (/^\d{6}$/.test(code)) {
        code.split('').forEach((d, i) => {
          if (otpDigits[i]) otpDigits[i].value = d;
        });
        if (otpDigits[5]) otpDigits[5].focus();
      }
    });
  }

  if (joinVerifyOtpForm) {
    joinVerifyOtpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (errorJoinCode) errorJoinCode.textContent = '';

      const code = syncJoinOtp();
      if (code.length !== 6) {
        if (errorJoinCode) errorJoinCode.textContent = 'Please enter the full 6-digit code.';
        return;
      }

      setButtonLoading(joinVerifyOtpBtn, true, 'Verifying...');

      try {
        const res = await fetch('/api/organizations/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ email: applicantEmail, code }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          showSuccessState(data.data);
        } else {
          if (errorJoinCode) {
            errorJoinCode.textContent = data.details?.code || data.error || 'Verification failed.';
          }
        }
      } catch (err) {
        console.error('Verification error:', err);
        if (errorJoinCode) errorJoinCode.textContent = 'Unable to reach the server.';
      } finally {
        setButtonLoading(joinVerifyOtpBtn, false, 'Verify Email & Complete Request');
      }
    });
  }

  // Resend OTP
  if (joinResendOtpBtn) {
    joinResendOtpBtn.addEventListener('click', async () => {
      if (resendCooldown > 0 || !applicantEmail) return;

      joinResendOtpBtn.disabled = true;
      joinResendOtpBtn.textContent = 'Sending new code...';

      try {
        const res = await fetch('/api/organizations/resend-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ email: applicantEmail }),
        });
        const data = await res.json();

        if (res.ok && data.success) {
          if (data.data?.verificationCode) {
            if (joinDevCodeValue) joinDevCodeValue.textContent = data.data.verificationCode;
            if (joinDevCodeBanner) joinDevCodeBanner.hidden = false;
          }
          resendCooldown = 60;
          joinResendOtpBtn.textContent = `Resend in ${resendCooldown}s`;
          resendInterval = setInterval(() => {
            resendCooldown--;
            if (resendCooldown <= 0) {
              clearInterval(resendInterval);
              joinResendOtpBtn.disabled = false;
              joinResendOtpBtn.textContent = 'Resend verification code';
            } else {
              joinResendOtpBtn.textContent = `Resend in ${resendCooldown}s`;
            }
          }, 1000);
        } else {
          joinResendOtpBtn.disabled = false;
          joinResendOtpBtn.textContent = 'Resend verification code';
          if (errorJoinCode) errorJoinCode.textContent = data.error || 'Failed to resend code.';
        }
      } catch (err) {
        joinResendOtpBtn.disabled = false;
        joinResendOtpBtn.textContent = 'Resend verification code';
        if (errorJoinCode) errorJoinCode.textContent = 'Network error while requesting new code.';
      }
    });
  }

  function showSuccessState(data) {
    if (finalJoinOrg) finalJoinOrg.textContent = data.organization?.name || invitationData?.organization?.name || 'Nexorian Workspace';
    if (finalJoinRole) finalJoinRole.textContent = data.membership?.role || invitationData?.role || 'CEO';
    if (finalJoinEmail) finalJoinEmail.textContent = data.user?.email || applicantEmail;

    setJoinStep(4);
  }

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

  // --------------------------------------------------------------------------
  // Initial URL Query Param Parsing (e.g. /join-organization?token=xyz)
  // --------------------------------------------------------------------------
  const urlParams = new URLSearchParams(window.location.search);
  const tokenParam = urlParams.get('token') || urlParams.get('code');

  if (tokenParam) {
    if (tokenInput) tokenInput.value = tokenParam;
    validateToken(tokenParam);
  } else {
    setJoinStep(1);
  }
});
