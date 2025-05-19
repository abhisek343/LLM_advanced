import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../../../components/layout/MainLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { getSystemStats } from '../../../services/adminAPI';
import type { SystemStats } from '../../../services/adminAPI';
import styles from './AdminStatsPage.module.css'; // To be created
import Button from '../../../components/common/Button/Button'; // Import Button

const AdminStatsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser || currentUser.role !== 'admin') {
        setError("You are not authorized to view this page.");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const systemStats = await getSystemStats();
        setStats(systemStats);
      } catch (err) {
        const error = err as Error;
        setError(error.message || 'Failed to load system statistics.');
        console.error("Error fetching system stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  if (isLoading) {
    return <MainLayout><div>Loading System Statistics...</div></MainLayout>;
  }

  if (error) {
    return <MainLayout><div className={styles.errorPlaceholder}>{error}</div></MainLayout>;
  }

  return (
    <MainLayout>
      <div className={styles.statsContainer}>
        <h1>System Statistics</h1>

        <div className={styles.dateFilters}>
          {/* TODO: Implement date picker components and state handling for these */}
          <div className={styles.formGroup}>
            <label htmlFor="startDate">Start Date:</label>
            <input type="date" id="startDate" name="startDate" disabled /> 
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="endDate">End Date:</label>
            <input type="date" id="endDate" name="endDate" disabled />
          </div>
          <Button onClick={() => alert("Date filter apply logic not implemented yet.")} disabled>Apply Date Filter</Button>
        </div>
        
        {stats ? (
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <h2>User Statistics</h2>
              <p>Total Users (Non-Admin, Non-Test): <strong>{stats.total_users ?? 'N/A'}</strong></p>
            </div>
            <div className={styles.statCard}>
              <h2>HR Statistics</h2>
              <p>Mapped HRs: <strong>{stats.total_hr_mapped ?? 'N/A'}</strong></p>
              {/* Add more HR stats here if they become available in SystemStats */}
            </div>
            <div className={styles.statCard}>
              <h2>Candidate Statistics</h2>
              <p>Candidates Assigned to HR: <strong>{stats.total_candidates_assigned ?? 'N/A'}</strong></p>
              {/* Add more candidate stats here */}
            </div>
            <div className={styles.statCard}>
              <h2>Interview Statistics</h2>
              <p>Total Interviews Scheduled: <strong>{stats.total_interviews_scheduled ?? 'N/A'}</strong></p>
              <p>Total Interviews Completed: <strong>{stats.total_interviews_completed ?? 'N/A'}</strong></p>
            </div>
            <div className={styles.statCard}>
              <h2>System Status</h2>
              <p>LLM Service Status: <strong>{stats.llm_service_status || 'N/A'}</strong></p>
            </div>
            {/* Enhanced Placeholder for more detailed stats and charts */}
            <div className={`${styles.statCard} ${styles.detailedStatsCard}`}>
              <h2>Detailed Analytics (Future Enhancements)</h2>
              <p><em>The following sections are placeholders for future charts and detailed data views. These require backend API enhancements for granular data and integration of a charting library.</em></p>
              
              <div className={styles.detailStatSection}>
                <h4>User Registrations & Activity</h4>
                <ul>
                  <li>New User Registrations (Daily/Weekly/Monthly) - Target: Line Chart</li>
                  <li>Active Users (Daily/Weekly/Monthly) - Target: Line Chart</li>
                  <li>User Role Distribution - Target: Pie Chart (Data likely from existing total_candidates, total_hrs, total_admins)</li>
                </ul>
              </div>

              <div className={styles.detailStatSection}>
                <h4>HR Performance & Status</h4>
                <ul>
                  <li>HRs by Status (Pending Profile, Profile Complete, Pending Mapping, Mapped) - Target: Bar Chart/Table (Requires more granular HR status data from backend)</li>
                  <li>Average Candidates per Mapped HR - Target: Display Value (Requires calculation or direct stat)</li>
                  <li>Time to HR Mapping Approval - Target: Average/Distribution (Requires tracking application/approval timestamps)</li>
                </ul>
              </div>

              <div className={styles.detailStatSection}>
                <h4>Candidate Funnel & Profile Completion</h4>
                <ul>
                  <li>Candidates by Profile Status (e.g., % Profile Complete, % Resume Uploaded) - Target: Bar Chart/Table</li>
                  <li>Candidates by Assignment Status (Assigned, Unassigned) - Target: Pie Chart (Data for unassigned count is fetched on Admin Dashboard)</li>
                  <li>Source of Candidates (if tracked) - Target: Pie Chart</li>
                </ul>
              </div>

              <div className={styles.detailStatSection}>
                <h4>Interview Lifecycle & Effectiveness</h4>
                <ul>
                  <li>Interviews by Status (Scheduled, Pending Questions, Completed, Evaluated, Cancelled) - Target: Bar Chart/Table</li>
                  <li>Interviews per Type (AI Technical, AI Behavioral, HR Chat etc.) - Target: Pie Chart</li>
                  <li>Average AI Scores vs. Average HR Scores (per interview type/role) - Target: Comparison Chart/Table</li>
                  <li>Interview Completion Rate (Completed / Scheduled) - Target: Percentage Display</li>
                  <li>Time to Interview Completion (from Scheduled to Completed) - Target: Average/Distribution</li>
                  <li>Pass/Fail/Hold Rates (based on HR Recommendation) - Target: Bar Chart</li>
                </ul>
              </div>
               {/* LLM Service Status/Usage is already displayed in a summary card if available */}
            </div>
          </div>
        ) : (
          <p>Could not load system statistics.</p>
        )}
        <Link to="/admin/dashboard" className={styles.backLink}>Back to Dashboard</Link>
      </div>
    </MainLayout>
  );
};

export default AdminStatsPage;
