/**
 * Client-side validation utilities
 * Note: These provide UX feedback only. Backend MUST validate all inputs (defense in depth)
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface PasswordStrength {
  score: number; // 0-4 (weak to strong)
  feedback: string[];
}

/**
 * Validate email format (RFC 5322 simplified)
 */
export const validateEmail = (email: string): ValidationResult => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }

  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  if (email.length > 255) {
    return { isValid: false, error: 'Email must be less than 255 characters' };
  }

  return { isValid: true };
};

/**
 * Validate password strength
 * Returns score 0-4 and feedback for improvements
 */
export const validatePasswordStrength = (
  password: string,
): PasswordStrength => {
  const feedback: string[] = [];
  let score = 0;

  if (!password) {
    return { score: 0, feedback: ['Password is required'] };
  }

  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters');
    return { score: 0, feedback };
  }

  // Length scoring
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;

  // Complexity scoring
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (hasLowercase && hasUppercase) {
    score++;
  } else {
    feedback.push('Include both uppercase and lowercase letters');
  }

  if (hasNumber) {
    score++;
  } else {
    feedback.push('Include at least one number');
  }

  if (hasSpecial) {
    score++;
  } else {
    feedback.push('Include at least one special character');
  }

  // Check for common passwords
  const commonPasswords = [
    'password',
    '12345678',
    'qwerty',
    'abc123',
    'password123',
    'admin',
    'letmein',
    'welcome',
  ];
  if (commonPasswords.includes(password.toLowerCase())) {
    score = 0;
    feedback.push('Password is too common - please choose a unique password');
  }

  // Check for sequential characters (123, abc)
  if (
    /123|234|345|456|567|678|789|abc|bcd|cde|def/i.test(password)
  ) {
    feedback.push('Avoid sequential characters');
  }

  return {
    score: Math.min(score, 4),
    feedback: score >= 3 ? ['Strong password!'] : feedback,
  };
};

/**
 * Validate that password meets minimum requirements
 */
export const validatePassword = (password: string): ValidationResult => {
  const strength = validatePasswordStrength(password);

  if (strength.score < 2) {
    return {
      isValid: false,
      error: strength.feedback[0] || 'Password is too weak',
    };
  }

  return { isValid: true };
};

/**
 * Validate passwords match
 */
export const validatePasswordsMatch = (
  password: string,
  confirmPassword: string,
): ValidationResult => {
  if (!confirmPassword) {
    return { isValid: false, error: 'Please confirm your password' };
  }

  if (password !== confirmPassword) {
    return { isValid: false, error: 'Passwords do not match' };
  }

  return { isValid: true };
};

/**
 * Validate required field (non-empty string)
 */
export const validateRequired = (
  value: string | null | undefined,
  fieldName: string,
): ValidationResult => {
  if (!value || value.trim().length === 0) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  return { isValid: true };
};

/**
 * Validate string length
 */
export const validateLength = (
  value: string,
  min: number,
  max: number,
  fieldName: string,
): ValidationResult => {
  if (value.length < min) {
    return {
      isValid: false,
      error: `${fieldName} must be at least ${min} characters`,
    };
  }

  if (value.length > max) {
    return {
      isValid: false,
      error: `${fieldName} must be no more than ${max} characters`,
    };
  }

  return { isValid: true };
};

/**
 * Validate number range
 */
export const validateRange = (
  value: number,
  min: number,
  max: number,
  fieldName: string,
): ValidationResult => {
  if (isNaN(value)) {
    return { isValid: false, error: `${fieldName} must be a number` };
  }

  if (value < min || value > max) {
    return {
      isValid: false,
      error: `${fieldName} must be between ${min} and ${max}`,
    };
  }

  return { isValid: true };
};

/**
 * Validate positive integer
 */
export const validatePositiveInteger = (
  value: number,
  fieldName: string,
): ValidationResult => {
  if (isNaN(value)) {
    return { isValid: false, error: `${fieldName} must be a number` };
  }

  if (!Number.isInteger(value)) {
    return { isValid: false, error: `${fieldName} must be a whole number` };
  }

  if (value < 0) {
    return { isValid: false, error: `${fieldName} must be positive` };
  }

  return { isValid: true };
};

/**
 * Validate URL format
 */
export const validateUrl = (url: string): ValidationResult => {
  if (!url) {
    return { isValid: false, error: 'URL is required' };
  }

  try {
    new URL(url);
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }
};

/**
 * Validate phone number (US format)
 */
export const validatePhoneNumber = (phone: string): ValidationResult => {
  // Remove non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length !== 10) {
    return {
      isValid: false,
      error: 'Phone number must be 10 digits',
    };
  }

  return { isValid: true };
};

/**
 * Validate date is in the past
 */
export const validatePastDate = (date: string): ValidationResult => {
  const parsedDate = new Date(date);

  if (isNaN(parsedDate.getTime())) {
    return { isValid: false, error: 'Invalid date format' };
  }

  if (parsedDate > new Date()) {
    return { isValid: false, error: 'Date must be in the past' };
  }

  return { isValid: true };
};

/**
 * Validate date is in the future
 */
export const validateFutureDate = (date: string): ValidationResult => {
  const parsedDate = new Date(date);

  if (isNaN(parsedDate.getTime())) {
    return { isValid: false, error: 'Invalid date format' };
  }

  if (parsedDate < new Date()) {
    return { isValid: false, error: 'Date must be in the future' };
  }

  return { isValid: true };
};

/**
 * Validate scoring configuration name
 */
export const validateScoringConfigName = (name: string): ValidationResult => {
  const requiredCheck = validateRequired(name, 'Configuration name');
  if (!requiredCheck.isValid) return requiredCheck;

  const lengthCheck = validateLength(name, 3, 100, 'Configuration name');
  if (!lengthCheck.isValid) return lengthCheck;

  return { isValid: true };
};

/**
 * Validate lineup name
 */
export const validateLineupName = (name: string): ValidationResult => {
  const requiredCheck = validateRequired(name, 'Lineup name');
  if (!requiredCheck.isValid) return requiredCheck;

  const lengthCheck = validateLength(name, 3, 100, 'Lineup name');
  if (!lengthCheck.isValid) return lengthCheck;

  return { isValid: true };
};

/**
 * Validate scoring category weight (must be a number)
 */
export const validateScoringWeight = (
  weight: number,
  categoryName: string,
): ValidationResult => {
  if (isNaN(weight)) {
    return {
      isValid: false,
      error: `${categoryName} weight must be a number`,
    };
  }

  // Allow negative weights (for ERA, WHIP, etc.)
  // But limit to reasonable range
  if (weight < -100 || weight > 100) {
    return {
      isValid: false,
      error: `${categoryName} weight must be between -100 and 100`,
    };
  }

  return { isValid: true };
};

/**
 * Get password strength label for UI display
 */
export const getPasswordStrengthLabel = (score: number): string => {
  const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  return labels[score] || 'Unknown';
};

/**
 * Get password strength color for UI display
 */
export const getPasswordStrengthColor = (score: number): string => {
  const colors = ['#dc2626', '#f59e0b', '#fbbf24', '#10b981', '#059669'];
  return colors[score] || '#6b7280';
};
