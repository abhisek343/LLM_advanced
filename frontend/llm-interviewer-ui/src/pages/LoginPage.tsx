import React from 'react';
import LoginForm from '../features/auth/LoginForm';
import { Link, useLocation } from 'react-router-dom';
import UnauthenticatedHeader from '../components/layout/UnauthenticatedHeader'; // Import the header
import styles from './AuthPage.module.css'; // Optional: for common auth page styling

const LoginPage: React.FC = () => {
  const location = useLocation();
  const message = location.state?.message;

  return (
    <>
      <UnauthenticatedHeader />
      <div className={`${styles.authContainer} page-container`}> {/* Use a common class for centering */}
        <h1>Login</h1>
        {message && <p className={styles.successMessage}>{message}</p>}
        <LoginForm />
        <p className={styles.authLink}>
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </>
  );
};

export default LoginPage;
