import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import UnauthenticatedHeader from '../components/layout/UnauthenticatedHeader';
import styles from './AuthPage.module.css'; // Reusing common auth styles
import { resetPassword } from '../services/authAPI'; // Import the API function

const ResetPasswordPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // const { resetPassword } = useAuth(); // Assuming this function exists

  useEffect(() => {
    // Basic token validation (e.g., check if it exists)
    // A more robust validation would involve an API call to check token validity
    if (!token) {
      setError('Invalid or missing password reset token.');
      // Consider redirecting or disabling the form
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!token) {
        setError('Missing reset token. Please request a new password reset link.');
        return;
    }

    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      // Ensure token is not undefined before using it
      if (!token) {
        setError('Missing reset token. Please request a new password reset link.');
        setIsLoading(false);
        return;
      }
      const response = await resetPassword({ token, new_password: password });
      setMessage(response.message);
      // Redirect to login page after a delay
      setTimeout(() => {
        navigate('/login', { state: { message: 'Password reset successful. Please login.' } });
      }, 3000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to reset password. The link may be invalid or expired.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <UnauthenticatedHeader />
      <div className={styles.authContainer}>
        <h1>Reset Your Password</h1>
        {!token && error && <p className={styles.errorMessage} role="alert">{error}</p>}
        {token && (
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="password" className={styles.label}>New Password</label>
              <input
                type="password"
                id="password"
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword" className={styles.label}>Confirm New Password</label>
              <input
                type="password"
                id="confirmPassword"
                className={styles.input}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            {message && <p className={styles.successMessage} role="alert">{message}</p>}
            {error && <p className={styles.errorMessage} role="alert">{error}</p>}
            <button 
              type="submit" 
              className={styles.button}
              disabled={isLoading || !token}
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
        <p className={styles.authLink}>
          <Link to="/login">Back to Login</Link>
        </p>
      </div>
    </>
  );
};

export default ResetPasswordPage;
