import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RegisterPage from './RegisterPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockRegister = vi.fn();
vi.mock('../../api/auth', () => ({ register: (...args: unknown[]) => mockRegister(...args) }));

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderRegisterPage = () =>
    render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>,
    );

  it('renders registration form', () => {
    renderRegisterPage();
    expect(screen.getByText(/create your account/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/email address/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password \(min 8 characters\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  it('updates email and password fields on input', () => {
    renderRegisterPage();
    const emailInput = screen.getByPlaceholderText(/email address/i) as HTMLInputElement;
    const passwordInput = screen.getByPlaceholderText(/password \(min 8 characters\)/i) as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'SecurePass123!' } });
    expect(emailInput.value).toBe('newuser@example.com');
    expect(passwordInput.value).toBe('SecurePass123!');
  });

  it('successfully registers and navigates to home', async () => {
    mockRegister.mockResolvedValue({ accessToken: 'tok', refreshToken: 'rtok' });
    renderRegisterPage();

    fireEvent.change(screen.getByPlaceholderText(/email address/i), { target: { value: 'newuser@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/password \(min 8 characters\)/i), { target: { value: 'SecurePass123!' } });
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({ email: 'newuser@example.com', password: 'SecurePass123!' });
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('displays error message on registration failure', async () => {
    mockRegister.mockRejectedValue({ detail: 'User with this email already exists' });
    renderRegisterPage();

    fireEvent.change(screen.getByPlaceholderText(/email address/i), { target: { value: 'existing@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/password \(min 8 characters\)/i), { target: { value: 'SecurePass123!' } });
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText('User with this email already exists')).toBeInTheDocument();
    });
  });

  it('displays generic error message when error format is unexpected', async () => {
    mockRegister.mockRejectedValue(new Error('Network error'));
    renderRegisterPage();

    fireEvent.change(screen.getByPlaceholderText(/email address/i), { target: { value: 'newuser@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/password \(min 8 characters\)/i), { target: { value: 'SecurePass123!' } });
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('disables submit button while loading', async () => {
    mockRegister.mockImplementation(() => new Promise(() => {}));
    renderRegisterPage();

    const submitButton = screen.getByRole('button', { name: /sign up/i });
    fireEvent.change(screen.getByPlaceholderText(/email address/i), { target: { value: 'newuser@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/password \(min 8 characters\)/i), { target: { value: 'SecurePass123!' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/creating account.../i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });

  it('navigates to login page when clicking sign in link', () => {
    renderRegisterPage();
    fireEvent.click(screen.getByText(/already have an account\? sign in/i));
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('enforces minimum password length of 8 characters', () => {
    renderRegisterPage();
    const passwordInput = screen.getByPlaceholderText(/password \(min 8 characters\)/i) as HTMLInputElement;
    expect(passwordInput).toHaveAttribute('minLength', '8');
  });
});
