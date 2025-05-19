import React, { useState } from 'react';
import styles from './SettingsPage.module.css'; 
import { useAuth } from '../../contexts/AuthContext'; // Corrected path
import * as authAPI from '../../services/authAPI'; // Import all from authAPI

const SettingsPage: React.FC = () => {
  const { currentUser } = useAuth(); // Get current user if needed for context

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordChangeMessage, setPasswordChangeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPasswordChanging, setIsPasswordChanging] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeMessage(null);

    if (newPassword !== confirmNewPassword) {
      setPasswordChangeMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 8) { // Basic validation
      setPasswordChangeMessage({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }

    setIsPasswordChanging(true);
    try {
      const response = await authAPI.changePassword({ currentPassword, newPassword }); 
      setPasswordChangeMessage({ type: 'success', text: response.message || 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: unknown) { 
      let displayMessage = 'An error occurred while changing the password.';
      if (err instanceof Error) {
        displayMessage = err.message; 
      }
      console.error("Password change error:", err); 
      setPasswordChangeMessage({ type: 'error', text: displayMessage });
    } finally {
      setIsPasswordChanging(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1>User Settings</h1>

      {/* Account Settings Section */}
      <div className={styles.settingsSection}>
        <h2>Account Settings</h2>
        {currentUser && <p>Logged in as: {currentUser.email}</p>}

        <form onSubmit={handleChangePassword}>
          <h3>Change Password</h3>
          <div className={styles.formGroup}>
            <label htmlFor="currentPassword">Current Password</label>
            <input
              type="password"
              id="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              disabled={isPasswordChanging}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="newPassword">New Password</label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={isPasswordChanging}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="confirmNewPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmNewPassword"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              required
              disabled={isPasswordChanging}
            />
          </div>
          {passwordChangeMessage && (
            <p className={passwordChangeMessage.type === 'success' ? styles.successMessage : styles.errorMessage}>
              {passwordChangeMessage.text}
            </p>
          )}
          <button type="submit" className={styles.button} disabled={isPasswordChanging}>
            {isPasswordChanging ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* Notification Preferences Section (Placeholder) */}
      <div className={styles.settingsSection}>
        <h2>Notification Preferences</h2>
        <p>Manage your notification settings here (e.g., email, in-app). This section is under construction.</p>
        {/* Example: <label><input type="checkbox" /> Email me about new messages</label> */}
      </div>

      {/* Theme Settings Section (Placeholder) */}
      <div className={styles.settingsSection}>
        <h2>Theme Settings</h2>
        <p>Choose your preferred theme. This section is under construction.</p>
        <div className={styles.themeOptions}>
          {/* Example: 
          <label><input type="radio" name="theme" value="light" defaultChecked /> Light</label>
          <label><input type="radio" name="theme" value="dark" /> Dark</label> 
          */}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
