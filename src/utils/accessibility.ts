/**
 * Accessibility utilities for WCAG 2.1 Level AA compliance
 */

import React from 'react';

// Generate unique IDs for ARIA associations
let idCounter = 0;
export const generateA11yId = (prefix: string): string => {
  return `${prefix}-${++idCounter}`;
};

/**
 * Get ARIA props for form inputs with errors
 */
export const getErrorAriaProps = (
  errorId: string,
  hasError: boolean,
): {
  'aria-invalid': boolean;
  'aria-describedby'?: string;
} => {
  return {
    'aria-invalid': hasError,
    ...(hasError && { 'aria-describedby': errorId }),
  };
};

/**
 * Announce messages to screen readers using aria-live regions
 */
export const announceToScreenReader = (
  message: string,
  priority: 'polite' | 'assertive' = 'polite',
): void => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement (screen readers have read it)
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * Trap keyboard focus within a modal/dialog
 * Returns cleanup function to remove event listeners
 */
export const trapFocus = (element: HTMLElement): (() => void) => {
  const focusableSelector =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const focusableElements = element.querySelectorAll(focusableSelector);
  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[
    focusableElements.length - 1
  ] as HTMLElement;

  if (!firstElement) return () => {}; // No focusable elements

  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    // Shift + Tab on first element -> focus last
    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    }
    // Tab on last element -> focus first
    else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  };

  // Set initial focus
  firstElement.focus();

  // Add event listener
  element.addEventListener('keydown', handleTabKey);

  // Return cleanup function
  return () => element.removeEventListener('keydown', handleTabKey);
};

/**
 * Check if element is interactive (can receive keyboard focus)
 */
export const isInteractiveElement = (element: HTMLElement): boolean => {
  const interactiveTags = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'];
  return (
    interactiveTags.includes(element.tagName) ||
    element.hasAttribute('tabindex') ||
    element.hasAttribute('role') ||
    element.hasAttribute('contenteditable')
  );
};

/**
 * Calculate relative luminance for color contrast (WCAG 2.1)
 */
const getRelativeLuminance = (hex: string): number => {
  // Remove # if present
  const cleanHex = hex.replace('#', '');

  // Convert hex to RGB
  const r = parseInt(cleanHex.substr(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substr(2, 2), 16) / 255;
  const b = parseInt(cleanHex.substr(4, 2), 16) / 255;

  // Apply gamma correction
  const [rs, gs, bs] = [r, g, b].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
  );

  // Calculate luminance
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

/**
 * Check if color contrast meets WCAG requirements
 * @param foreground - Foreground color (hex)
 * @param background - Background color (hex)
 * @param level - WCAG level ('AA' requires 4.5:1, 'AAA' requires 7:1)
 * @returns true if contrast meets requirements
 */
export const meetsContrastRequirement = (
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
): boolean => {
  const l1 = getRelativeLuminance(foreground);
  const l2 = getRelativeLuminance(background);

  // Contrast ratio formula: (lighter + 0.05) / (darker + 0.05)
  const contrast =
    (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

  const requiredRatio = level === 'AAA' ? 7 : 4.5;
  return contrast >= requiredRatio;
};

/**
 * Get keyboard-accessible label for element
 */
export const getAccessibleLabel = (element: HTMLElement): string | null => {
  // Check aria-label
  if (element.hasAttribute('aria-label')) {
    return element.getAttribute('aria-label');
  }

  // Check aria-labelledby
  if (element.hasAttribute('aria-labelledby')) {
    const labelId = element.getAttribute('aria-labelledby');
    if (labelId) {
      const labelElement = document.getElementById(labelId);
      return labelElement?.textContent || null;
    }
  }

  // Check associated label
  if (element instanceof HTMLInputElement) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    return label?.textContent || null;
  }

  // Check text content
  return element.textContent || null;
};

/**
 * Set focus to element with optional delay
 * Useful after route changes or modal closes
 */
export const setFocusTo = (
  selector: string,
  delay: number = 0,
): void => {
  setTimeout(() => {
    const element = document.querySelector<HTMLElement>(selector);
    if (element) {
      element.focus();
    }
  }, delay);
};

/**
 * Get role-appropriate keyboard handler
 * Returns recommended keydown handler based on element role
 */
export const getRoleKeyboardHandler = (
  role: string,
  onClick: () => void,
): ((e: React.KeyboardEvent) => void) => {
  const handlers: Record<string, (e: React.KeyboardEvent) => void> = {
    button: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    },
    link: (e) => {
      if (e.key === 'Enter') {
        onClick();
      }
    },
    menuitem: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    },
  };

  return handlers[role] || handlers.button;
};
