import React from 'react';
// import { Link } from 'react-router-dom'; // Link removed as it's not used directly
import Button from '../../../components/common/Button'; 
import Card from '../../../components/common/Card';   
// Spinner and AlertMessage might not be needed here if parent handles loading/error states
// import Spinner from '../../../components/common/Spinner'; 
// import AlertMessage from '../../../components/common/AlertMessage';
import styles from './HRDashboardWidgets.module.css';
// useAuth might not be needed if all user data comes via props
// import { useAuth } from '../../../contexts/AuthContext'; 
import { 
    type HrProfileOut,
    // type HRMappingRequestFromAdmin, // Not fetched here anymore
    // type HRApplicationWithAdminName as HRApplicationOut // Not fetched here anymore
} from '../../../services/hrService';

interface HRDashboardWidgetsProps {
  hrProfile?: HrProfileOut | null; // Make it optional or nullable if it can be loading
  assignedCandidatesCount: number;
  pendingAdminRequestsCount: number; // This will represent incoming requests
  unreadMessagesCount: number;
  // We can add hrApplications count if needed, or display a summary
}

const HRDashboardWidgets: React.FC<HRDashboardWidgetsProps> = ({
  hrProfile,
  assignedCandidatesCount,
  pendingAdminRequestsCount,
  unreadMessagesCount,
}) => {

  // const { currentUser, isLoading: isLoadingAuth } = useAuth(); // Not needed if hrProfile is prop

  // Data fetching for profile, requests, applications is removed from here.
  // It will be handled by the parent HRDashboardPage.

  // Mock data for these counts; replace with actual API calls if available in parent
  // These are now props, so local state for them is removed.
  // const [interviewsToScheduleCount, setInterviewsToScheduleCount] = useState(0);
  // const [resultsToReviewCount, setResultsToReviewCount] = useState(0);

  // useEffect for mock data is removed.

  const getProfileStatusText = () => {
    if (!hrProfile) return "Loading profile...";
    switch (hrProfile.hr_status) {
      case 'pending_profile': return "Profile Incomplete";
      case 'profile_complete': return "Profile Complete (Not Mapped)";
      // Assuming 'application_pending' covers the old 'pending_mapping_approval'
      case 'application_pending': return "Application to Admin Pending"; 
      case 'admin_request_pending': return "Admin Request Pending Your Approval";
      case 'mapped': return "Profile Complete & Mapped";
      case 'unmapped': return "Profile Complete (Unmapped)"; // Added for clarity
      default: {
        // This case should ideally not be reached if HrStatusType is comprehensive
        const status: string = hrProfile.hr_status as string; // Type assertion
        return status ? status.replace(/_/g, ' ') : "Unknown Status";
      }
    }
  };
  
  const getMappingStatusText = () => {
    if (!hrProfile) return "Loading mapping status...";
    if (hrProfile.hr_status === 'mapped' && hrProfile.admin_manager_name) {
      return `Mapped to: ${hrProfile.admin_manager_name}`;
    }
    // Consolidate pending statuses for this text
    if (hrProfile.hr_status === 'application_pending') {
        return "Your application to an Admin is pending.";
    }
    if (hrProfile.hr_status === 'admin_request_pending') {
        return "An Admin has sent you a connection request.";
    }
    return "Not Mapped to an Admin";
  };

  const isMappedToAdmin = hrProfile?.hr_status === 'mapped';

  // Loading and error states are handled by the parent component (HRDashboardPage)
  // So, no need for Spinner or AlertMessage here unless for widget-specific errors not covered by parent.

  return (
    <div className={styles.widgetsContainer}>
      <Card title="Your Status" className={styles.statusCard}>
        <p>Profile: {getProfileStatusText()}</p>
        <p>Admin Mapping: {getMappingStatusText()}</p>
        <div className={styles.buttonGroup}>
          <Button to="/hr/profile" variant="secondary" size="small">View/Edit Profile</Button>
          <Button to="/hr/admin-connections" variant="secondary" size="small">Manage Connections</Button>
        </div>
      </Card>

      {isMappedToAdmin && (
        <Card title="My Candidates" className={styles.candidatesCard}>
          <p><strong>{assignedCandidatesCount}</strong> Active Candidates</p>
          {/* 
            Placeholder for more detailed candidate stats.
            These would require more specific data props.
            For now, focusing on the assignedCandidatesCount.
          */}
          {/* 
          { (interviewsToScheduleCount > 0 || resultsToReviewCount > 0) &&
            <ul className={styles.candidateStatsList}>
              {interviewsToScheduleCount > 0 && <li>{interviewsToScheduleCount} Interviews to Schedule</li>}
              {resultsToReviewCount > 0 && <li>{resultsToReviewCount} Results to Review</li>}
            </ul>
          } 
          */}
          <Button to="/hr/assigned-candidates" variant="primary" size="small">View All Candidates</Button>
        </Card>
      )}

      <Card title="Notifications & Requests" className={styles.requestsCard}>
          {pendingAdminRequestsCount > 0 && (
            <div className={styles.requestSection}>
              <p>
                You have <strong>{pendingAdminRequestsCount}</strong> incoming connection request(s) from Admins.
              </p>
            </div>
          )}
          {unreadMessagesCount > 0 && (
             <div className={styles.requestSection}>
                <p>
                    You have <strong>{unreadMessagesCount}</strong> unread message(s).
                </p>
            </div>
          )}
          {(pendingAdminRequestsCount === 0 && unreadMessagesCount === 0) && (
              <p>No new notifications or requests.</p>
          )}
         <Button to="/hr/admin-connections" variant="secondary" size="small" className={styles.fullWidthButton}>Manage Connections</Button>
         <Button to="/hr/messages" variant="secondary" size="small" className={`${styles.fullWidthButton} ${styles.marginTopButton}`}>View Messages</Button>
      </Card>

      <Card title="Quick Actions" className={styles.quickActionsCard}>
        <Button to="/hr/search-candidates" variant="primary" disabled={!isMappedToAdmin}>Search New Candidates</Button>
        <Button to="/hr/schedule-interview" variant="primary" disabled={!isMappedToAdmin}>Schedule an Interview</Button>
        {/* View Messages button is already in Notifications card, can be removed or kept based on preference */}
      </Card>
    </div>
  );
};

export default HRDashboardWidgets;
