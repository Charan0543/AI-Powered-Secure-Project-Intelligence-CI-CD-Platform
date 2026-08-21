/**
 * Authentication Input Validators
 */

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Validates sign-in credentials input
 * @param {object} input 
 * @returns {{ isValid: boolean, errors: Record<string, string>, data: object }}
 */
function validateLoginInput(input = {}) {
  const errors = {};
  const raw = input || {};

  const rawEmail = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';
  if (!rawEmail) {
    errors.email = 'Email address is required.';
  } else if (!EMAIL_REGEX.test(rawEmail)) {
    errors.email = 'Please provide a valid email address.';
  }

  const rawPassword = typeof raw.password === 'string' ? raw.password : '';
  if (!rawPassword) {
    errors.password = 'Password is required.';
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    data: {
      email: rawEmail,
      password: rawPassword,
    },
  };
}

module.exports = {
  validateLoginInput,
};
