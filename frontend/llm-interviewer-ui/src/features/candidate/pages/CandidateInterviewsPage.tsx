import React, { useState } from 'react'; // Removed useEffect
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '../../../components/layout/MainLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { getMyScheduledInterviews, getMyInterviewHistory, getInterviewDetails } from '../../../services/interviewAPI';
import type { InterviewSummary, Interview as FullInterviewDetails } from '../../../services/interviewAPI';
import styles from './CandidateInterviewsPage.module.css';
import Button from '../../../components/common/Button/Button'; // Import Button

const CandidateInterviewsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed'>('upcoming');
  const [selectedInterviewForDetailsId, setSelectedInterviewForDetailsId] = useState<string | null>(null);

  const { data: upcomingInterviews, isLoading: isLoadingUpcoming, error: upcomingError } = useQuery<InterviewSummary[], Error>({
    queryKey: ['myScheduledInterviews', currentUser?.id],
    queryFn: getMyScheduledInterviews,
    enabled: !!currentUser && currentUser.role === 'candidate',
    select: (data) => data ? data.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()) : [],
  });

  const { data: completedInterviews, isLoading: isLoadingCompleted, error: completedError } = useQuery<InterviewSummary[], Error>({
    queryKey: ['myInterviewHistory', currentUser?.id],
    queryFn: getMyInterviewHistory,
    enabled: !!currentUser && currentUser.role === 'candidate',
    select: (data) => data ? data.sort((a, b) => new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime()) : [],
  });

  const { 
    data: interviewDetails, 
    isLoading: isLoadingDetails, 
    error: detailsError 
  } = useQuery<FullInterviewDetails, Error>({
    queryKey: ['interviewDetails', selectedInterviewForDetailsId],
    queryFn: () => {
      if (!selectedInterviewForDetailsId) throw new Error("No interview selected for details.");
      return getInterviewDetails(selectedInterviewForDetailsId);
    },
    enabled: !!selectedInterviewForDetailsId, // Only fetch when an ID is selected
  });

  const handleViewDetails = (interviewId: string) => {
    if (selectedInterviewForDetailsId === interviewId) {
      setSelectedInterviewForDetailsId(null); // Toggle off if already selected
    } else {
      setSelectedInterviewForDetailsId(interviewId);
    }
  };
  
  const isLoading = isLoadingUpcoming || isLoadingCompleted;
  const combinedError = upcomingError || completedError; // Use a different variable name

  const renderInterviewList = (interviews: InterviewSummary[] | undefined, isUpcoming: boolean) => {
    if (!interviews || interviews.length === 0) {
      return <p>No {isUpcoming ? 'upcoming' : 'completed'} interviews found.</p>;
    }
    return (
      <ul className={styles.interviewList}>
        {interviews.map(interview => (
          <li key={interview.id} className={styles.interviewItem}>
            <div className={styles.interviewHeader}>
              <h3>{interview.job_title}</h3>
              <p>Status: <span className={`${styles.status} ${styles[interview.status.toLowerCase()]}`}>{interview.status}</span></p>
              <p>
                {isUpcoming ? `Scheduled for: ${new Date(interview.scheduled_at).toLocaleString()}` 
                            : `Completed on: ${interview.completed_at ? new Date(interview.completed_at).toLocaleString() : 'N/A'}`}
              </p>
            </div>
            <div className={styles.actions}>
              {isUpcoming && (
                <>
                  {interview.status === 'scheduled' && (
                    <Link to={`/interview/${interview.id}/take`} className={styles.actionButtonLink}>Start Interview</Link>
                  )}
                  <Button 
                    onClick={() => handleViewDetails(interview.id)} 
                    variant="secondary" 
                    size="small"
                    className={styles.actionButton}
                  >
                    {selectedInterviewForDetailsId === interview.id ? 'Hide Details' : 'View Details'}
                  </Button>
                </>
              )}
              {!isUpcoming && (interview.status === 'completed' || interview.status === 'evaluated' || interview.status === 'evaluated_by_hr' || interview.status === 'completed_hr_review') && (
                <Link to={`/candidate/interviews/${interview.id}/results`} className={styles.actionButtonLink}>View Results</Link>
              )}
            </div>
            {selectedInterviewForDetailsId === interview.id && (
              <div className={styles.detailsSection}>
                {isLoadingDetails && <p>Loading details...</p>}
                {detailsError && <p className={styles.error}>Error loading details: {detailsError.message}</p>}
                {interviewDetails && interviewDetails.id === interview.id && (
                  <>
                    <h4>Interview Details</h4>
                    <p><strong>Job Description:</strong> {interviewDetails.job_description || 'N/A'}</p>
                    {/* Add other details like tech stack if available in FullInterviewDetails type */}
                    {/* <p><strong>Tech Stack:</strong> {interviewDetails.tech_stack?.join(', ') || 'N/A'}</p> */}
                  </>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    );
  };

  if (isLoading) {
    return <MainLayout><div>Loading interviews...</div></MainLayout>;
  }

  return (
    <MainLayout>
      <div className={styles.interviewsContainer}>
        <h1>My Interviews</h1>
        {combinedError && <p className={styles.error}>{combinedError.message}</p>}

        <div className={styles.tabs}>
          <button 
            onClick={() => setActiveTab('upcoming')} 
            className={`${styles.tabButton} ${activeTab === 'upcoming' ? styles.activeTab : ''}`}
          >
            Upcoming
          </button>
          <button 
            onClick={() => setActiveTab('completed')} 
            className={`${styles.tabButton} ${activeTab === 'completed' ? styles.activeTab : ''}`}
          >
            Completed
          </button>
        </div>

        <div className={styles.tabContent}>
          {activeTab === 'upcoming' && renderInterviewList(upcomingInterviews, true)}
          {activeTab === 'completed' && renderInterviewList(completedInterviews, false)}
        </div>
        <Link to="/candidate/dashboard" className={styles.backLink}>Back to Dashboard</Link>
      </div>
    </MainLayout>
  );
};

export default CandidateInterviewsPage;
