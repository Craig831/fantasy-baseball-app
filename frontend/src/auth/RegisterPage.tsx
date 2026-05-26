import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { isApiError, splitValidationDetail } from '../api/errors';
import { useAuth } from './AuthContext';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_DIGIT = /\d/;

function validateRegistration(form: {
  email: string;
  password: string;
}): string[] {
  const errors: string[] = [];
  if (!form.email.trim()) {
    errors.push('Email is required.');
  }
  if (form.password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  }
  if (!PASSWORD_DIGIT.test(form.password)) {
    errors.push('Password must contain at least one digit.');
  }
  return errors;
}

export default function RegisterPage(): React.ReactElement {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const clientErrors = validateRegistration({ email, password });
    if (clientErrors.length > 0) {
      setErrors(clientErrors);
      return;
    }
    setErrors([]);
    setIsSubmitting(true);
    try {
      await register({
        email,
        password,
        firstName: firstName || null,
        lastName: lastName || null,
      });
      navigate('/', { replace: true });
    } catch (err) {
      if (isApiError(err)) {
        if (err.status === 400) {
          const split = splitValidationDetail(err);
          setErrors(split.length ? split : [err.detail || err.title]);
        } else if (err.status >= 500) {
          setErrors(['Something went wrong. Please try again.']);
        } else {
          setErrors([err.detail || err.title || 'Registration failed.']);
        }
      } else {
        setErrors(['Could not reach the server. Please try again.']);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <h1 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h1>

        <form className="mt-8 space-y-6" onSubmit={onSubmit} noValidate>
          {errors.length > 0 && (
            <div role="alert" className="rounded-md bg-red-50 p-4">
              <ul className="text-sm text-red-800 list-disc pl-5 space-y-1">
                {errors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="register-email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="register-password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="register-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={PASSWORD_MIN_LENGTH}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-describedby="register-password-help"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <p id="register-password-help" className="mt-1 text-xs text-gray-500">
                At least {PASSWORD_MIN_LENGTH} characters and include one digit.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="register-first-name" className="block text-sm font-medium text-gray-700">
                  First name <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  id="register-first-name"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="register-last-name" className="block text-sm font-medium text-gray-700">
                  Last name <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  id="register-last-name"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>

          <p className="text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
