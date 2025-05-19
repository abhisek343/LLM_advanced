import React from 'react';
import styles from './CandidateCard.module.css';
import { type CandidateProfileOut } from '../../../services/hrService';
import Button from '../../../components/common/Button';
import Card from '../../../components/common/Card'; // Assuming a generic Card component exists

interface CandidateCardProps {
  candidate: CandidateProfileOut;
  onInvite: (candidate: CandidateProfileOut) => void; // Callback when "Send Invitation" is clicked
// Add other potential actions, e.g., onViewDetails
actionInProgress?: boolean; // To disable button during action
}
const CandidateCard: React.FC<CandidateCardProps> = ({ candidate, onInvite, actionInProgress }) => {
  const { username, email, candidate_status, created_at } = candidate;

  // Fallback for missing status or to make it more readable
  const displayStatus = candidate_status ? candidate_status.replace(/_/g, ' ') : 'Status Unknown';
  const registrationDate = new Date(created_at).toLocaleDateString();

  return (
    <Card title={username} className={styles.candidateCard}>
      <div className={styles.cardContent}>
        <p className={styles.detailItem}>
          <strong>Email:</strong> {email}
        </p>
        <p className={styles.detailItem}>
          <strong>Current Status:</strong> <span className={`${styles.status} ${styles[`status${candidate_status || 'unknown'}`]}`}>{displayStatus}</span>
        </p>
        <p className={styles.detailItem}>
          <strong>Registered:</strong> {registrationDate}
        </p>
        {/* Add more details as needed, e.g., skills, YoE if available directly on CandidateProfileOut */}
      </div>
      <div className={styles.cardActions}>
        <Button 
          onClick={() => onInvite(candidate)} 
          size="small"
          disabled={actionInProgress}
          className={styles.actionButton}
        >
          {actionInProgress ? 'Processing...' : 'Send Invitation Message'}
        </Button>
        {/* Example for a future "View Details" button */}
        {/* <Button variant="secondary" size="small" onClick={() => onViewDetails(candidate.id)}>View Details</Button> */}
      </div>
    </Card>
  );
};

export default CandidateCard;
