import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

interface UserProfile {
  id: string;
  email: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
  createdAt: string;
}

const AccountSettingsPage: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Update email
  const [newEmail, setNewEmail] = useState('');
  const [emailUpdateLoading, setEmailUpdateLoading] = useState(false);

  // Update password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordUpdateLoading, setPasswordUpdateLoading] = useState(false);

  // MFA
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaQrCode, setMfaQrCode] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await api.get('/users/me');
      setProfile(response.data.data);
    } catch (err: any) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setEmailUpdateLoading(true);

    try {
      await api.patch('/users/me', { email: newEmail });
      setSuccessMessage('Email updated successfully. Please verify your new email.');
      setNewEmail('');
      loadProfile();
    } catch (err: any) {
      setError(err.response?.data?.errors?.[0]?.message || 'Failed to update email');
    } finally {
      setEmailUpdateLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setPasswordUpdateLoading(true);

    try {
      await api.patch('/users/me', { password: newPassword });
      setSuccessMessage('Password updated successfully');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.response?.data?.errors?.[0]?.message || 'Failed to update password');
    } finally {
      setPasswordUpdateLoading(false);
    }
  };

  const handleSetupMFA = async () => {
    setError('');
    setMfaLoading(true);

    try {
      const response = await api.post('/auth/mfa/setup');
      const { secret, qrCode } = response.data.data;
      setMfaSecret(secret);
      setMfaQrCode(qrCode);
      setShowMfaSetup(true);
    } catch (err: any) {
      setError(err.response?.data?.errors?.[0]?.message || 'Failed to setup MFA');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleVerifyMFA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMfaLoading(true);

    try {
      await api.post('/auth/mfa/verify', { token: mfaToken });
      setSuccessMessage('MFA enabled successfully');
      setShowMfaSetup(false);
      setMfaToken('');
      loadProfile();
    } catch (err: any) {
      setError(err.response?.data?.errors?.[0]?.message || 'Invalid MFA code');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleDisableMFA = async () => {
    const token = prompt('Enter your current MFA code to disable:');
    if (!token) return;

    setMfaLoading(true);

    try {
      await api.post('/auth/mfa/disable', { token });
      setSuccessMessage('MFA disabled successfully');
      loadProfile();
    } catch (err: any) {
      setError(err.response?.data?.errors?.[0]?.message || 'Failed to disable MFA');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);

    try {
      await api.delete('/users/me');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.errors?.[0]?.message || 'Failed to delete account');
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Failed to load profile</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Account Settings</h1>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 rounded-md bg-green-50 p-4">
            <p className="text-sm text-green-800">{successMessage}</p>
          </div>
        )}

        {/* Profile Information */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <p className="text-gray-900">{profile.email}</p>
              {!profile.emailVerified && (
                <p className="text-sm text-yellow-600">Email not verified</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Account Created</label>
              <p className="text-gray-900">{new Date(profile.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Update Email */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Update Email</h2>
          <form onSubmit={handleUpdateEmail} className="space-y-4">
            <div>
              <label htmlFor="new-email" className="block text-sm font-medium text-gray-700">
                New Email
              </label>
              <input
                id="new-email"
                type="email"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={emailUpdateLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {emailUpdateLoading ? 'Updating...' : 'Update Email'}
            </button>
          </form>
        </div>

        {/* Update Password */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Update Password</h2>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                required
                minLength={8}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                minLength={8}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={passwordUpdateLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {passwordUpdateLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* MFA Settings */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Two-Factor Authentication</h2>
          <p className="text-sm text-gray-600 mb-4">
            Add an extra layer of security to your account.
          </p>

          {!profile.mfaEnabled && !showMfaSetup && (
            <button
              onClick={handleSetupMFA}
              disabled={mfaLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {mfaLoading ? 'Setting up...' : 'Enable MFA'}
            </button>
          )}

          {showMfaSetup && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-700 mb-2">
                  Scan this QR code with your authenticator app:
                </p>
                {mfaQrCode && (
                  <img src={mfaQrCode} alt="MFA QR Code" className="mx-auto" />
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Or enter this secret manually: <code className="bg-gray-100 px-2 py-1">{mfaSecret}</code>
                </p>
              </div>
              <form onSubmit={handleVerifyMFA}>
                <label htmlFor="mfa-token" className="block text-sm font-medium text-gray-700 mb-2">
                  Enter the 6-digit code from your app:
                </label>
                <input
                  id="mfa-token"
                  type="text"
                  required
                  maxLength={6}
                  pattern="[0-9]{6}"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 mb-4"
                  value={mfaToken}
                  onChange={(e) => setMfaToken(e.target.value)}
                  placeholder="123456"
                />
                <button
                  type="submit"
                  disabled={mfaLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {mfaLoading ? 'Verifying...' : 'Verify and Enable'}
                </button>
              </form>
            </div>
          )}

          {profile.mfaEnabled && (
            <div>
              <p className="text-sm text-green-600 mb-4">✓ MFA is currently enabled</p>
              <button
                onClick={handleDisableMFA}
                disabled={mfaLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {mfaLoading ? 'Disabling...' : 'Disable MFA'}
              </button>
            </div>
          )}
        </div>

        {/* Delete Account */}
        <div className="bg-white shadow rounded-lg p-6 border-2 border-red-200">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Danger Zone</h2>
          <p className="text-sm text-gray-600 mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex justify-center py-2 px-4 border border-red-600 rounded-md shadow-sm text-sm font-medium text-red-600 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Delete Account
            </button>
          ) : (
            <div className="space-y-4">
              <p className="text-sm font-medium text-red-900">
                Are you absolutely sure? This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {deleteLoading ? 'Deleting...' : 'Yes, Delete My Account'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6">
          <button
            onClick={() => navigate('/')}
            className="text-indigo-600 hover:text-indigo-500"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountSettingsPage;
