import React from 'react';
import { Link } from 'react-router-dom';
import styles from './CandidateSearchResultItem.module.css'; // To be created

// Assuming a common Button component structure, similar to what's mocked in other files
// If a global common Button exists, it should be imported.
const Button: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string, to?: string, variant?: string, size?: string }> = 
    ({ children, onClick, className, to, variant = 'primary', size = 'medium' }) => {
  const buttonClasses = `${styles.button} ${styles[`button-${variant}`]} ${styles[`button-${size}`]} ${className || ''}`;
  if (to) {
    return (
      <Link to={to} className={buttonClasses}>
        {children}
      </Link>
    );
  }
  return (
    <button onClick={onClick} className={buttonClasses}>
      {children}
    </button>
  );
};

// Type for a single candidate search result, matching CandidateSearchPage
export interface CandidateSearchResult {
  id: string;
  username: string;
  full_name?: string;
  email: string;
  extracted_skills_list?: string[];
  estimated_yoe?: number;
  resume_path?: string; 
}

interface CandidateSearchResultItemProps {
  candidate: CandidateSearchResult;
  onSendMessage: (candidateId: string, candidateName?: string) => void;
}

const CandidateSearchResultItem: React.FC<CandidateSearchResultItemProps> = ({ candidate, onSendMessage }) => {
  const displayName = candidate.full_name || candidate.username;

  return (
    <li className={styles.resultItem}>
      <div className={styles.candidateInfo}>
        <h3>{displayName}</h3>
        <p><strong>Email:</strong> {candidate.email}</p>
        {candidate.extracted_skills_list && candidate.extracted_skills_list.length > 0 &&
          <p><strong>Skills:</strong> {candidate.extracted_skills_list.join(', ')}</p>
        }
        {candidate.estimated_yoe !== undefined &&
          <p><strong>Experience:</strong> {candidate.estimated_yoe} years</p>
        }
        {/* TODO: Add link to view full profile if/when candidate profile page for HR view exists */}
        {/* <p><Link to={`/hr/candidate/${candidate.id}/profile`}>View Full Profile</Link></p> */}
      </div>
      <div className={styles.candidateActions}>
        <Button onClick={() => onSendMessage(candidate.id, displayName)} variant="secondary" size="small">
          Send Invitation/Message
        </Button>
        {/* Placeholder for other actions like "View Full Profile" if it's a separate page */}
        {/* <Button to={`/hr/candidate/${candidate.id}/profile`} variant="link" size="small">View Profile</Button> */}
      </div>
    </li>
  );
};

export default CandidateSearchResultItem;
