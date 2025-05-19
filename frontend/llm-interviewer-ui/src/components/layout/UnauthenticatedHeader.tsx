import React from 'react';
import { Link } from 'react-router-dom';
import styles from './UnauthenticatedHeader.module.css'; // We'll create this CSS module

const UnauthenticatedHeader: React.FC = () => {
  return (
    <header className={styles.header}>
      <div className={styles.logoContainer}>
        <Link to="/" className={styles.logo}>
          LLM Interviewer
        </Link>
      </div>
    </header>
  );
};

export default UnauthenticatedHeader;
