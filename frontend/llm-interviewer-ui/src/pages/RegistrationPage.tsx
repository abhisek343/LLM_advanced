import React from 'react';
import RegistrationForm from '../features/auth/RegistrationForm';
import { Link } from 'react-router-dom';
import UnauthenticatedHeader from '../components/layout/UnauthenticatedHeader'; // Import the header
import styles from './AuthPage.module.css'; // Import common auth page styles

const RegistrationPage: React.FC = () => {
  return (
    <>
      <UnauthenticatedHeader />
      <div className={`${styles.authContainer} page-container`}> {/* Use a common class for centering */}
        <h1>Create Account</h1> {/* Changed title for clarity from "Register" */}
        <RegistrationForm />
        <p className={styles.authLink}>
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </>
  );
};

export default RegistrationPage;
