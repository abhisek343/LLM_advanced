import React from 'react';
import { useQuery } from '@tanstack/react-query';
import HRDashboardWidgets from '../components/HRDashboardWidgets';
import styles from './HRDashboardPage.module.css';
import { useAuth } from '../../../contexts/AuthContext';
import hrService, { type HrProfileOut } from '../../../services/hrService';
import Spinner from '../../../components/common/Spinner';
import AlertMessage from '../../../components/common/AlertMessage';

const HRDashboardPage: React.FC = () => {
  const { currentUser, isLoading: isLoadingAuth } = useAuth();

  const { 
    data: hrProfile, 
    isLoading: isLoadingProfile, 
    error: profileError 
  } = useQuery<HrProfileOut, Error>({
    queryKey: ['hrProfileDetails', currentUser?.id],
    queryFn: () => hrService.getProfileDetails(),
    enabled: !!currentUser && !isLoadingAuth,
  });
  
  // Additional queries for other widget data can be added here
  // For example, unread messages count, pending admin requests count, assigned candidates count

  if (isLoadingAuth || isLoadingProfile) {
    return (
      <div className={styles.dashboardContainer} style={{ textAlign: 'center', paddingTop: '50px' }}>
        <Spinner size="large" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className={styles.dashboardContainer}>
        <AlertMessage type="error" message={`Error loading dashboard: ${profileError.message}`} />
      </div>
    );
  }
  
  const hrUserName = hrProfile?.username || currentUser?.username || "HR User";

  return (
    <div className={styles.dashboardContainer}>
      <header className={styles.dashboardHeader}>
        <h1>HR Dashboard</h1>
        <p>Welcome, {hrUserName}!</p>
      </header>
      <section className={styles.dashboardWidgetsSection}>
        <HRDashboardWidgets 
          hrProfile={hrProfile}
          // Placeholder counts for now, these would come from other queries
          assignedCandidatesCount={0} // Replace with actual data
          pendingAdminRequestsCount={0} // Replace with actual data
          unreadMessagesCount={0} // Replace with actual data
        />
      </section>
    </div>
  );
};

export default HRDashboardPage;
