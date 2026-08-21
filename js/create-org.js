/**
 * Dedicated Organization Creation & Verification Wizard JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
  // Step Trackers
  const stepTab1 = document.getElementById('step-tab-1');
  const stepTab2 = document.getElementById('step-tab-2');
  const stepTab3 = document.getElementById('step-tab-3');

  // Panes
  const step1Pane = document.getElementById('step-1-pane');
  const step2Pane = document.getElementById('step-2-pane');
  const step3Pane = document.getElementById('step-3-pane');
  const stepSuccessPane = document.getElementById('step-success-pane');

  // Forms & Buttons
  const step1Form = document.getElementById('step-1-form');
  const step2Form = document.getElementById('step-2-form');
  const verifyOtpForm = document.getElementById('verify-otp-form');
  const gotoStep2Btn = document.getElementById('goto-step-2-btn');
  const backToStep1Btn = document.getElementById('back-to-step-1-btn');
  const submitRegistrationBtn = document.getElementById('submit-registration-btn');
  const verifyOtpBtn = document.getElementById('verify-otp-btn');
  const resendOtpBtn = document.getElementById('resend-otp-btn');
  const autofillOtpBtn = document.getElementById('autofill-otp-btn');

  // Step 1 Inputs
  const userNameInput = document.getElementById('user-name');
  const userEmailInput = document.getElementById('user-email');
  const userPasswordInput = document.getElementById('user-password');
  const userConfirmPasswordInput = document.getElementById('user-confirm-password');
  const userPhoneInput = document.getElementById('user-phone');
  const userGithubInput = document.getElementById('user-github');

  // Step 2 Inputs
  const orgNameInput = document.getElementById('org-name');
  const orgSlugInput = document.getElementById('org-slug');
  const orgTypeInput = document.getElementById('org-type');
  const orgCountryInput = document.getElementById('org-country');
  const orgAddressInput = document.getElementById('org-address');
  const orgSharedContactInput = document.getElementById('org-shared-contact');

  // Step 3 / Verification elements
  const displayVerifyEmail = document.getElementById('display-verify-email');
  const devCodeBanner = document.getElementById('dev-code-banner');
  const devCodeValue = document.getElementById('dev-code-value');
  const otpDigits = document.querySelectorAll('.otp-digit');
  const otpUnifiedInput = document.getElementById('otp-unified-input');
  const errorCodeMsg = document.getElementById('error-code');

  // Success summary elements
  const finalOrgName = document.getElementById('final-org-name');
  const finalOrgSlug = document.getElementById('final-org-slug');
  const finalOwnerEmail = document.getElementById('final-owner-email');
  const wizardGlobalAlert = document.getElementById('wizard-global-alert');

  // State
  let isSlugManuallyEdited = false;
  let registeredEmail = '';
  let resendCooldown = 0;
  let resendInterval = null;

  // --------------------------------------------------------------------------
  // 1. Navigation & Step Transitions
  // --------------------------------------------------------------------------
  function setStep(stepNumber) {
    clearErrors();

    // Reset pane visibilities
    step1Pane.hidden = stepNumber !== 1;
    step2Pane.hidden = stepNumber !== 2;
    step3Pane.hidden = stepNumber !== 3;
    stepSuccessPane.hidden = stepNumber !== 4;

    // Update step tracker
    stepTab1.classList.remove('is-active', 'is-completed');
    stepTab2.classList.remove('is-active', 'is-completed');
    stepTab3.classList.remove('is-active', 'is-completed');

    if (stepNumber === 1) {
      stepTab1.classList.add('is-active');
      if (userNameInput) userNameInput.focus();
    } else if (stepNumber === 2) {
      stepTab1.classList.add('is-completed');
      stepTab2.classList.add('is-active');
      if (orgNameInput) orgNameInput.focus();
    } else if (stepNumber === 3) {
      stepTab1.classList.add('is-completed');
      stepTab2.classList.add('is-completed');
      stepTab3.classList.add('is-active');
      if (otpDigits.length > 0) otpDigits[0].focus();
    } else if (stepNumber === 4) {
      stepTab1.classList.add('is-completed');
      stepTab2.classList.add('is-completed');
      stepTab3.classList.add('is-completed');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function clearErrors() {
    if (wizardGlobalAlert) {
      wizardGlobalAlert.textContent = '';
      wizardGlobalAlert.hidden = true;
    }
    document.querySelectorAll('.field-error-msg').forEach(el => el.textContent = '');
    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  }

  function displayFieldError(field, message) {
    const errorEl = document.getElementById(`error-${field}`);
    const groupEl = document.getElementById(`group-${field}`);

    if (errorEl) {
      errorEl.textContent = message;
    }
    if (groupEl) {
      const inputEl = groupEl.querySelector('.form-input, .form-select, .input-prefix-wrapper, .password-input-wrapper');
      if (inputEl) {
        inputEl.classList.add('is-invalid');
      }
    }
  }

  function displayErrors(details = {}, globalMessage = null) {
    clearErrors();

    if (globalMessage && wizardGlobalAlert) {
      wizardGlobalAlert.textContent = globalMessage;
      wizardGlobalAlert.hidden = false;
    }

    let firstField = null;

    Object.keys(details).forEach(field => {
      displayFieldError(field, details[field]);
      if (!firstField) firstField = field;
    });

    if (firstField) {
      const firstInput = document.getElementById(`user-${firstField}`) || document.getElementById(`org-${firstField}`);
      if (firstInput && firstInput.focus) firstInput.focus();
    }
  }

  // --------------------------------------------------------------------------
  // 2. Client-Side Validations
  // --------------------------------------------------------------------------
  const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  function validateStep1() {
    clearErrors();
    let hasError = false;

    const name = userNameInput ? userNameInput.value.trim() : '';
    const email = userEmailInput ? userEmailInput.value.trim() : '';
    const password = userPasswordInput ? userPasswordInput.value : '';
    const confirmPassword = userConfirmPasswordInput ? userConfirmPasswordInput.value : '';

    if (!name) {
      displayFieldError('name', 'Full name is required.');
      hasError = true;
    } else if (name.length < 2) {
      displayFieldError('name', 'Full name must be at least 2 characters.');
      hasError = true;
    }

    if (!email) {
      displayFieldError('email', 'Email address is required.');
      hasError = true;
    } else if (!EMAIL_REGEX.test(email)) {
      displayFieldError('email', 'Please provide a valid email address.');
      hasError = true;
    }

    if (!password) {
      displayFieldError('password', 'Password is required.');
      hasError = true;
    } else if (password.length < 8) {
      displayFieldError('password', 'Password must be at least 8 characters long.');
      hasError = true;
    }

    if (!confirmPassword) {
      displayFieldError('confirmPassword', 'Please confirm your password.');
      hasError = true;
    } else if (password !== confirmPassword) {
      displayFieldError('confirmPassword', 'Passwords do not match.');
      hasError = true;
    }

    return !hasError;
  }

  // --------------------------------------------------------------------------
  // 3. Slug Auto-generation
  // --------------------------------------------------------------------------
  function generateSlug(name) {
    if (!name || typeof name !== 'string') return '';
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  }

  if (orgNameInput && orgSlugInput) {
    orgNameInput.addEventListener('input', () => {
      if (!isSlugManuallyEdited) {
        orgSlugInput.value = generateSlug(orgNameInput.value);
      }
    });

    orgSlugInput.addEventListener('input', () => {
      isSlugManuallyEdited = orgSlugInput.value.trim().length > 0;
    });
  }

  // --------------------------------------------------------------------------
  // 4. Password Visibility Toggle
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
  // 5. Step 1 -> Step 2
  // --------------------------------------------------------------------------
  if (gotoStep2Btn) {
    gotoStep2Btn.addEventListener('click', () => {
      if (validateStep1()) {
        setStep(2);
      }
    });
  }

  if (backToStep1Btn) {
    backToStep1Btn.addEventListener('click', () => {
      setStep(1);
    });
  }

  // --------------------------------------------------------------------------
  // 6. Step 2 Registration Submit -> POST /api/organizations/register
  // --------------------------------------------------------------------------
  if (step2Form) {
    step2Form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors();

      // Ensure Step 1 is valid
      if (!validateStep1()) {
        setStep(1);
        return;
      }

      const orgName = orgNameInput ? orgNameInput.value.trim() : '';
      if (!orgName) {
        displayFieldError('orgName', 'Organization name is required.');
        return;
      }

      const payload = {
        name: userNameInput.value.trim(),
        email: userEmailInput.value.trim().toLowerCase(),
        password: userPasswordInput.value,
        confirmPassword: userConfirmPasswordInput.value,
        phoneNumber: userPhoneInput ? userPhoneInput.value.trim() : '',
        githubUrl: userGithubInput ? userGithubInput.value.trim() : '',
        orgName: orgName,
        slug: orgSlugInput ? orgSlugInput.value.trim() : generateSlug(orgName),
        type: orgTypeInput ? orgTypeInput.value : '',
        country: orgCountryInput ? orgCountryInput.value.trim() : '',
        address: orgAddressInput ? orgAddressInput.value.trim() : '',
        orgEmailOrGithub: orgSharedContactInput ? orgSharedContactInput.value.trim() : '',
      };

      setButtonLoading(submitRegistrationBtn, true, 'Creating Account & Organization...');

      try {
        const response = await fetch('/api/organizations/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          registeredEmail = payload.email;
          if (displayVerifyEmail) displayVerifyEmail.textContent = registeredEmail;

          // If development code is returned, reveal it for 1-click test fill
          if (data.data && data.data.verificationCode) {
            if (devCodeValue) devCodeValue.textContent = data.data.verificationCode;
            if (devCodeBanner) devCodeBanner.hidden = false;
          }

          setStep(3);
        } else {
          // If error belongs to Step 1 fields, jump back to Step 1
          const s1Fields = ['name', 'email', 'password', 'confirmPassword', 'phoneNumber', 'githubUrl'];
          const hasStep1Errors = data.details && Object.keys(data.details).some(f => s1Fields.includes(f));

          if (hasStep1Errors) {
            setStep(1);
          }
          displayErrors(data.details || {}, data.error || 'Failed to create organization.');
        }
      } catch (err) {
        console.error('Registration network error:', err);
        displayErrors({}, 'Unable to reach the server. Please check your connection and try again.');
      } finally {
        setButtonLoading(submitRegistrationBtn, false, 'Create Organization & Account');
      }
    });
  }

  // --------------------------------------------------------------------------
  // 7. OTP Input Handling
  // --------------------------------------------------------------------------
  function syncOtpValue() {
    let code = '';
    otpDigits.forEach(input => {
      code += input.value;
    });
    if (otpUnifiedInput) {
      otpUnifiedInput.value = code;
    }
    return code;
  }

  otpDigits.forEach((digitInput, index) => {
    // Digit input
    digitInput.addEventListener('input', (e) => {
      const val = e.target.value;
      if (val && !/^\d$/.test(val)) {
        e.target.value = '';
        return;
      }

      if (val.length === 1 && index < otpDigits.length - 1) {
        otpDigits[index + 1].focus();
      }

      syncOtpValue();
    });

    // Backspace handling
    digitInput.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace') {
        if (!digitInput.value && index > 0) {
          otpDigits[index - 1].focus();
        }
      }
    });

    // Paste handling
    digitInput.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim();
      const digits = pasteData.replace(/\D/g, '').substring(0, 6);

      digits.split('').forEach((d, i) => {
        if (otpDigits[i]) {
          otpDigits[i].value = d;
        }
      });

      const nextFocus = Math.min(digits.length, 5);
      if (otpDigits[nextFocus]) {
        otpDigits[nextFocus].focus();
      }

      syncOtpValue();
    });
  });

  // Autofill button in Dev mode
  if (autofillOtpBtn && devCodeValue) {
    autofillOtpBtn.addEventListener('click', () => {
      const code = devCodeValue.textContent.trim();
      if (/^\d{6}$/.test(code)) {
        code.split('').forEach((d, i) => {
          if (otpDigits[i]) otpDigits[i].value = d;
        });
        syncOtpValue();
        if (otpDigits[5]) otpDigits[5].focus();
      }
    });
  }

  // --------------------------------------------------------------------------
  // 8. Step 3 Email Verification Submit -> POST /api/organizations/verify-email
  // --------------------------------------------------------------------------
  if (verifyOtpForm) {
    verifyOtpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors();

      const code = syncOtpValue();

      if (!code || code.length !== 6) {
        if (errorCodeMsg) {
          errorCodeMsg.textContent = 'Please enter the full 6-digit verification code.';
        }
        otpDigits.forEach(d => d.classList.add('is-invalid'));
        return;
      }

      setButtonLoading(verifyOtpBtn, true, 'Verifying & Activating...');

      try {
        const response = await fetch('/api/organizations/verify-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            email: registeredEmail,
            code: code,
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          // Store session data for Owner Portal & Workspace
          const token = data.sessionToken || (data.data && data.data.sessionToken);
          if (token) {
            sessionStorage.setItem('nexorian_session_token', token);
          }
          if (data.data && data.data.user) {
            sessionStorage.setItem('nexorian_user', JSON.stringify(data.data.user));
          }
          if (data.data && data.data.organization) {
            sessionStorage.setItem('nexorian_active_org', JSON.stringify(data.data.organization));
          }
          sessionStorage.setItem('nexorian_role', (data.data && data.data.role) || 'FOUNDER');

          // Success State
          if (finalOrgName) finalOrgName.textContent = data.data.organization.name;
          if (finalOrgSlug) finalOrgSlug.textContent = `nexorian.internal/${data.data.organization.slug}`;
          if (finalOwnerEmail) finalOwnerEmail.textContent = `${data.data.user.name} (${data.data.user.email})`;

          setStep(4);
        } else {
          if (errorCodeMsg) {
            errorCodeMsg.textContent = data.details?.code || data.error || 'Verification failed. Please check the code.';
          }
          otpDigits.forEach(d => d.classList.add('is-invalid'));
        }
      } catch (err) {
        console.error('Verification network error:', err);
        if (errorCodeMsg) {
          errorCodeMsg.textContent = 'Unable to reach the server. Please check your connection and try again.';
        }
      } finally {
        setButtonLoading(verifyOtpBtn, false, 'Verify Email & Activate Organization');
      }
    });
  }

  // --------------------------------------------------------------------------
  // 9. Resend OTP
  // --------------------------------------------------------------------------
  if (resendOtpBtn) {
    resendOtpBtn.addEventListener('click', async () => {
      if (resendCooldown > 0 || !registeredEmail) return;

      resendOtpBtn.disabled = true;
      resendOtpBtn.textContent = 'Sending new code...';

      try {
        const response = await fetch('/api/organizations/resend-code', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ email: registeredEmail }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          if (data.data && data.data.verificationCode) {
            if (devCodeValue) devCodeValue.textContent = data.data.verificationCode;
            if (devCodeBanner) devCodeBanner.hidden = false;
          }

          // Start 60-second cooldown
          resendCooldown = 60;
          resendOtpBtn.textContent = `Resend in ${resendCooldown}s`;
          resendInterval = setInterval(() => {
            resendCooldown--;
            if (resendCooldown <= 0) {
              clearInterval(resendInterval);
              resendOtpBtn.disabled = false;
              resendOtpBtn.textContent = 'Resend verification code';
            } else {
              resendOtpBtn.textContent = `Resend in ${resendCooldown}s`;
            }
          }, 1000);
        } else {
          resendOtpBtn.disabled = false;
          resendOtpBtn.textContent = 'Resend verification code';
          if (errorCodeMsg) {
            errorCodeMsg.textContent = data.error || 'Failed to resend code.';
          }
        }
      } catch (err) {
        resendOtpBtn.disabled = false;
        resendOtpBtn.textContent = 'Resend verification code';
        if (errorCodeMsg) {
          errorCodeMsg.textContent = 'Network error while requesting new code.';
        }
      }
    });
  }

  // Helper for button loading state
  function setButtonLoading(button, isLoading, loadingText = 'Processing...') {
    if (!button) return;
    const btnText = button.querySelector('.btn-text');
    const btnSpinner = button.querySelector('.btn-spinner');

    button.disabled = isLoading;
    if (btnSpinner) btnSpinner.hidden = !isLoading;
    if (btnText && loadingText) {
      if (isLoading) {
        btnText.setAttribute('data-original-text', btnText.textContent);
        btnText.textContent = loadingText;
      } else {
        const original = btnText.getAttribute('data-original-text');
        if (original) btnText.textContent = original;
      }
    }
  }

  // Initialize on Step 1
  setStep(1);
});
