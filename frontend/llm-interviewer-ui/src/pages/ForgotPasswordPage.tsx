import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import UnauthenticatedHeader from '../components/layout/UnauthenticatedHeader';
import styles from './AuthPage.module.css'; // Reusing common auth styles
import { requestPasswordReset } from '../services/authAPI'; // Import the API function

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // const { requestPasswordReset } = useAuth(); // Assuming this function exists or will be added

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await requestPasswordReset({ email });
      setMessage(response.message);
      setEmail(''); // Clear email field on success
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <UnauthenticatedHeader />
      <div className={styles.authContainer}>
        <h1>Forgot Password</h1>
        <p>Enter your email address and we'll send you a link to reset your password.</p>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}> {/* Using formGroup for consistency if defined */}
            <label htmlFor="email" className={styles.label}>Email Address</label>
            <input
              type="email"
              id="email"
              className={styles.input} // Using input class for consistency
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {message && <p className={styles.successMessage} role="alert">{message}</p>}
          {error && <p className={styles.errorMessage} role="alert">{error}</p>}
          <button 
            type="submit" 
            className={styles.button} // Using button class for consistency
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        <p className={styles.authLink}>
          Remember your password? <Link to="/login">Login here</Link>
        </p>
      </div>
    </>
  );
};

export default ForgotPasswordPage;
