import React from 'react';
import styles from './Footer.module.css'; // We'll create this CSS module next

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className={styles.footer}>
      <p>&copy; {currentYear} LLM Interviewer Platform. All rights reserved.</p>
      <nav className={styles.footerNav}>
        <a href="/terms" className={styles.footerLink}>Terms of Service</a>
        <a href="/privacy" className={styles.footerLink}>Privacy Policy</a>
      </nav>
    </footer>
  );
};

export default Footer;
