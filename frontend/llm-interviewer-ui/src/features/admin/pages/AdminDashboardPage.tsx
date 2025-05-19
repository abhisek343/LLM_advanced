import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../../../components/layout/MainLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { getSystemStats, getPendingHRApplications, getAllUsers } from '../../../services/adminAPI';
import type { SystemStats, UserManagementInfo } from '../../../services/adminAPI'; // Added UserManagementInfo
import Card from '../../../components/common/Card/Card'; // Import Card
import AlertMessage from '../../../components/common/AlertMessage/AlertMessage'; // Import AlertMessage
import Spinner from '../../../components/common/Spinner/Spinner'; // Import Spinner
import styles from './AdminDashboardPage.module.css'; 

const AdminDashboardPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [pendingHRApplicationsCount, setPendingHRApplicationsCount] = useState<number>(0);
  const [candidatesPendingAssignmentCount, setCandidatesPendingAssignmentCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'admin') {
      setIsLoading(false); // Ensure loading stops if user is not admin
      return;
    }
    setIsLoading(true);
    setPageError(null);
    try {
      const systemStatsPromise = getSystemStats();
      const pendingAppsPromise = getPendingHRApplications();
      const candidatesPromise = getAllUsers({ role: 'candidate' }); // Fetch all candidates

      const [systemStats, pendingApps, allCandidates] = await Promise.all([
        systemStatsPromise,
        pendingAppsPromise,
        candidatesPromise,
      ]);
      
      setStats(systemStats);
      // Ensure pendingApps is an array before accessing length
      setPendingHRApplicationsCount(Array.isArray(pendingApps) ? pendingApps.length : 0);
      
      // The getAllUsers endpoint in admin_service returns a direct array, not an object with an 'items' property.
      // Also, ensure allCandidates is an array before filtering.
      const unassignedCandidates = Array.isArray(allCandidates) 
        ? allCandidates.filter((c: UserManagementInfo) => !c.assigned_hr_id && c.role === 'candidate') 
        : [];
      setCandidatesPendingAssignmentCount(unassignedCandidates.length);

    } catch (err) {
      const error = err as Error;
      setPageError(error.message || 'Failed to load admin dashboard data.');
      console.error("Error fetching admin dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]); // Dependencies for useCallback

  useEffect(() => {
    fetchData();
  }, [fetchData]); // Dependency is now the memoized fetchData

  // Approve/Reject HR logic is moved to AdminHRManagementPage
  // This dashboard will now primarily show stats and quick links

  if (isLoading) {
    return <MainLayout><Spinner text="Loading Admin Dashboard..." /></MainLayout>;
  }

  return (
    <MainLayout>
      <div className={styles.dashboardContainer}>
        <h1>Welcome, {currentUser?.username}!</h1>
        <p className={styles.subHeader}>Admin Dashboard</p>

        {pageError && <AlertMessage type="error" message={pageError} />}

        <div className={styles.widgetsGrid}>
          <Card title="System Statistics" className={styles.statsWidget}>
            {stats ? (
              <>
                <p>Total Users (Non-Admin, Non-Test): <strong>{stats.total_users}</strong></p>
                {/* stats.total_candidates, stats.total_hrs, stats.total_admins are not directly provided by the /stats endpoint */}
                {/* These would need to be derived or fetched differently if required */}
                <p>Mapped HRs: <strong>{stats.total_hr_mapped ?? 'N/A'}</strong></p>
                <p>Candidates Assigned: <strong>{stats.total_candidates_assigned ?? 'N/A'}</strong></p>
                <p>Interviews Scheduled: <strong>{stats.total_interviews_scheduled ?? 'N/A'}</strong></p>
                <p>Interviews Completed: <strong>{stats.total_interviews_completed ?? 'N/A'}</strong></p> 
                <p>LLM Service Status: <strong>{stats.llm_service_status ?? 'N/A'}</strong></p>
                {/* <Link to="/admin/stats" className={styles.linkButtonInline}>View Detailed System Stats</Link> */}
              </>
            ) : <p>Could not load system statistics.</p>}
          </Card>

          <Card title="Pending Actions" className={styles.pendingActionsWidget}>
            <p>
              <Link to="/admin/hr-management" className={styles.linkButton}>
                Manage HR Applications & Mappings ({pendingHRApplicationsCount} Pending)
              </Link>
            </p>
            <p>
              <Link to="/admin/candidates/assign" className={styles.linkButton}>
                Assign Candidates to HR ({candidatesPendingAssignmentCount} Pending)
              </Link>
            </p>
          </Card>
          
          <Card title="Quick Navigation" className={styles.quickActionsWidget}>
            <Link to="/admin/users" className={styles.linkButton}>User Management</Link>
            <Link to="/admin/hr-management" className={styles.linkButton}>HR Management</Link>
            <Link to="/admin/candidates/assign" className={styles.linkButton}>Assign Candidates to HR</Link>
            <Link to="/admin/create-user" className={styles.linkButton}>Create New User</Link>
            <Link to="/admin/interviews-overview" className={styles.linkButton}>View All Interviews</Link>
            <Link to="/admin/stats" className={styles.linkButton}>System Statistics</Link>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default AdminDashboardPage;
