import React from 'react';
import type { ReactNode } from 'react'; // Type-only import
import Header from './Header';
import Footer from './Footer';
import styles from './MainLayout.module.css'; // We'll create this CSS module next

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className={styles.layoutContainer}>
      <Header />
      <main className={styles.mainContent}>
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;
