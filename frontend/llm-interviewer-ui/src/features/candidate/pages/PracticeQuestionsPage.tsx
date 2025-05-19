import React from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../../../components/layout/MainLayout';
import Card from '../../../components/common/Card/Card';
import styles from './PracticeQuestionsPage.module.css'; // Create this CSS module

const PracticeQuestionsPage: React.FC = () => {
  return (
    <MainLayout>
      <div className={styles.practiceContainer}>
        <h1>Practice Questions</h1>
        <p className={styles.comingSoonText}>
          This feature is currently under development. Soon, you'll be able to browse and answer practice questions
          to help you prepare for your interviews!
        </p>
        
        <Card title="What to Expect" className={styles.infoCard}>
          <ul>
            <li>Categorized questions (e.g., by technology, difficulty).</li>
            <li>Different question types (coding, behavioral, technical).</li>
            <li>An interface to practice answering questions similar to a real interview.</li>
            <li>Potential for AI-powered feedback on some question types.</li>
          </ul>
        </Card>

        <div className={styles.backLinkContainer}>
          <Link to="/candidate/dashboard" className={styles.backLink}>
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>
    </MainLayout>
  );
};

export default PracticeQuestionsPage;
