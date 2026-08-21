/**
 * Validation & Sanitization for Organization Onboarding, Invitations & Approvals
 */

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const OTP_REGEX = /^\d{6}$/;
const VALID_ROLES = ['OWNER', 'CEO'];

/**
 * Generates a clean URL-friendly slug from an organization name
 * @param {string} name 
 * @returns {string}
 */
function generateSlug(name) {
  if (!name || typeof name !== 'string') {
    return `org-${Date.now().toString(36)}`;
  }

  let slug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!slug || slug.length < 2) {
    slug = `org-${Date.now().toString(36)}`;
  }

  if (slug.length > 50) {
    slug = slug.substring(0, 50).replace(/-+$/, '');
  }

  return slug;
}

/**
 * Validates the registration payload
 * @param {object} input 
 * @returns {{ isValid: boolean, errors: Record<string, string>, data: object }}
 */
function validateRegistrationInput(input = {}) {
  const errors = {};
  const raw = input || {};

  // 1. Full Name
  const rawName = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!rawName) {
    errors.name = 'Full name is required.';
  } else if (rawName.length < 2) {
    errors.name = 'Full name must be at least 2 characters.';
  } else if (rawName.length > 100) {
    errors.name = 'Full name cannot exceed 100 characters.';
  }

  // 2. Email
  const rawEmail = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';
  if (!rawEmail) {
    errors.email = 'Email address is required.';
  } else if (!EMAIL_REGEX.test(rawEmail) || rawEmail.length > 150) {
    errors.email = 'Please provide a valid email address.';
  }

  // 3. Password
  const rawPassword = typeof raw.password === 'string' ? raw.password : '';
  if (!rawPassword) {
    errors.password = 'Password is required.';
  } else if (rawPassword.length < 8) {
    errors.password = 'Password must be at least 8 characters long.';
  }

  // 4. Confirm Password
  const rawConfirmPassword = typeof raw.confirmPassword === 'string' ? raw.confirmPassword : '';
  if (!rawConfirmPassword) {
    errors.confirmPassword = 'Please confirm your password.';
  } else if (rawPassword && rawPassword !== rawConfirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  // 5. Phone (Optional)
  let rawPhone = typeof raw.phoneNumber === 'string' ? raw.phoneNumber.trim() : null;
  if (rawPhone && rawPhone.length > 30) rawPhone = rawPhone.substring(0, 30);
  if (!rawPhone) rawPhone = null;

  // 6. GitHub (Optional)
  let rawGithub = typeof raw.githubUrl === 'string' ? raw.githubUrl.trim() : null;
  if (rawGithub && rawGithub.length > 150) rawGithub = rawGithub.substring(0, 150);
  if (!rawGithub) rawGithub = null;

  // 7. Organization Name
  const rawOrgName = typeof raw.orgName === 'string' 
    ? raw.orgName.trim() 
    : (typeof raw.name === 'string' && raw.orgName === undefined ? raw.name.trim() : '');
  
  if (!rawOrgName) {
    errors.orgName = 'Organization name is required.';
  } else if (rawOrgName.length < 2) {
    errors.orgName = 'Organization name must be at least 2 characters.';
  } else if (rawOrgName.length > 100) {
    errors.orgName = 'Organization name cannot exceed 100 characters.';
  }

  // 8. Slug
  let rawSlug = typeof raw.slug === 'string' ? raw.slug.trim().toLowerCase() : '';
  if (rawSlug) {
    if (!SLUG_REGEX.test(rawSlug)) {
      errors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens.';
    } else if (rawSlug.length < 2) {
      errors.slug = 'Slug must be at least 2 characters.';
    } else if (rawSlug.length > 60) {
      errors.slug = 'Slug cannot exceed 60 characters.';
    }
  } else if (rawOrgName) {
    rawSlug = generateSlug(rawOrgName);
  }

  // 9. Type
  let rawType = typeof raw.type === 'string' ? raw.type.trim() : null;
  if (rawType && rawType.length > 50) rawType = rawType.substring(0, 50);
  if (!rawType) rawType = null;

  // 10. Country
  let rawCountry = typeof raw.country === 'string' ? raw.country.trim() : null;
  if (rawCountry && rawCountry.length > 60) rawCountry = rawCountry.substring(0, 60);
  if (!rawCountry) rawCountry = null;

  // 11. Address
  let rawAddress = typeof raw.address === 'string' ? raw.address.trim() : null;
  if (rawAddress && rawAddress.length > 250) rawAddress = rawAddress.substring(0, 250);
  if (!rawAddress) rawAddress = null;

  // 12. Org Email or GitHub
  let rawOrgEmailOrGithub = typeof raw.orgEmailOrGithub === 'string' ? raw.orgEmailOrGithub.trim() : null;
  if (rawOrgEmailOrGithub && rawOrgEmailOrGithub.length > 150) rawOrgEmailOrGithub = rawOrgEmailOrGithub.substring(0, 150);
  if (!rawOrgEmailOrGithub) rawOrgEmailOrGithub = null;

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    data: {
      name: rawName,
      email: rawEmail,
      password: rawPassword,
      phoneNumber: rawPhone,
      githubUrl: rawGithub,
      orgName: rawOrgName,
      slug: rawSlug,
      type: rawType,
      country: rawCountry,
      address: rawAddress,
      orgEmailOrGithub: rawOrgEmailOrGithub,
    },
  };
}

/**
 * Validates the join organization request from an invited user
 * @param {object} input 
 */
function validateJoinInput(input = {}) {
  const errors = {};
  const raw = input || {};

  // 1. Full Name
  const rawName = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!rawName) {
    errors.name = 'Full name is required.';
  } else if (rawName.length < 2) {
    errors.name = 'Full name must be at least 2 characters.';
  } else if (rawName.length > 100) {
    errors.name = 'Full name cannot exceed 100 characters.';
  }

  // 2. Email Address
  const rawEmail = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';
  if (!rawEmail) {
    errors.email = 'Email address is required.';
  } else if (!EMAIL_REGEX.test(rawEmail)) {
    errors.email = 'Please provide a valid email address.';
  }

  // 3. Password
  const rawPassword = typeof raw.password === 'string' ? raw.password : '';
  if (!rawPassword) {
    errors.password = 'Password is required.';
  } else if (rawPassword.length < 8) {
    errors.password = 'Password must be at least 8 characters long.';
  }

  // 4. Confirm Password
  const rawConfirmPassword = typeof raw.confirmPassword === 'string' ? raw.confirmPassword : '';
  if (!rawConfirmPassword) {
    errors.confirmPassword = 'Please confirm your password.';
  } else if (rawPassword && rawPassword !== rawConfirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  // 5. Invitation Token / Code
  const rawToken = typeof raw.invitationToken === 'string' ? raw.invitationToken.trim() : (typeof raw.code === 'string' ? raw.code.trim() : '');
  if (!rawToken) {
    errors.invitationToken = 'Company invitation code or token is required.';
  }

  // Optional Phone, GitHub & Employee ID
  let rawPhone = typeof raw.phoneNumber === 'string' ? raw.phoneNumber.trim() : null;
  if (!rawPhone) rawPhone = null;
  let rawGithub = typeof raw.githubUrl === 'string' ? raw.githubUrl.trim() : null;
  if (!rawGithub) rawGithub = null;
  let rawEmployeeId = typeof raw.employeeId === 'string' ? raw.employeeId.trim() : null;
  if (!rawEmployeeId) rawEmployeeId = null;

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    data: {
      name: rawName,
      email: rawEmail,
      employeeId: rawEmployeeId,
      password: rawPassword,
      phoneNumber: rawPhone,
      githubUrl: rawGithub,
      invitationToken: rawToken,
    },
  };
}

/**
 * Validates creating an invitation
 * @param {object} input 
 */
function validateInviteInput(input = {}) {
  const errors = {};
  const raw = input || {};

  const rawEmail = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';
  if (!rawEmail) {
    errors.email = 'Invitee email address is required.';
  } else if (!EMAIL_REGEX.test(rawEmail)) {
    errors.email = 'Please provide a valid email address.';
  }

  let rawRole = typeof raw.role === 'string' ? raw.role.trim().toUpperCase() : 'CEO';
  if (!VALID_ROLES.includes(rawRole)) {
    errors.role = 'Role must be either OWNER or CEO.';
  }

  const rawOrgId = typeof raw.organizationId === 'string' ? raw.organizationId.trim() : '';
  if (!rawOrgId) {
    errors.organizationId = 'Organization identifier is required.';
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    data: {
      email: rawEmail,
      role: rawRole,
      organizationId: rawOrgId,
    },
  };
}

/**
 * Validates OTP code verification input
 * @param {object} input 
 */
function validateVerificationInput(input = {}) {
  const errors = {};
  const raw = input || {};

  const rawEmail = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';
  if (!rawEmail) {
    errors.email = 'Email address is required.';
  } else if (!EMAIL_REGEX.test(rawEmail)) {
    errors.email = 'Please provide a valid email address.';
  }

  const rawCode = typeof raw.code === 'string' ? raw.code.trim() : '';
  if (!rawCode) {
    errors.code = '6-digit verification code is required.';
  } else if (!OTP_REGEX.test(rawCode)) {
    errors.code = 'Verification code must be exactly 6 digits.';
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    data: {
      email: rawEmail,
      code: rawCode,
    },
  };
}

module.exports = {
  validateRegistrationInput,
  validateJoinInput,
  validateInviteInput,
  validateVerificationInput,
  generateSlug,
};
