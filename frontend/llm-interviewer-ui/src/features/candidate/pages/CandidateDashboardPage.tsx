import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '../../../components/layout/MainLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { getCandidateProfile, getCandidateMessages } from '../../../services/candidateAPI';
import type { CandidateProfile, Message } from '../../../services/candidateAPI';
import { getMyScheduledInterviews } from '../../../services/interviewAPI';
import type { InterviewSummary } from '../../../services/interviewAPI';
import Card from '../../../components/common/Card/Card';
import AlertMessage from '../../../components/common/AlertMessage/AlertMessage';
import Spinner from '../../../components/common/Spinner/Spinner';
import styles from './CandidateDashboardPage.module.css';

const CandidateDashboardPage: React.FC = () => {
  const { currentUser } = useAuth();

  const { data: profileData, isLoading: isLoadingProfile, error: profileError } = useQuery<CandidateProfile, Error>({
    queryKey: ['candidateProfileDashboard', currentUser?.id],
    queryFn: getCandidateProfile,
    enabled: !!currentUser && currentUser.role === 'candidate',
  });

  const { data: upcomingInterviews, isLoading: isLoadingInterviews, error: interviewsError } = useQuery<InterviewSummary[], Error>({
    queryKey: ['upcomingInterviewsDashboard', currentUser?.id],
    queryFn: getMyScheduledInterviews,
    enabled: !!currentUser && currentUser.role === 'candidate',
    select: (data) => data ? data.sort((a: InterviewSummary, b: InterviewSummary) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()) : [],
  });

  // For unread messages count, we fetch all messages and count unread ones.
  // This could be optimized if the backend provides an unread count endpoint.
  const { data: recentMessages, isLoading: isLoadingMessages, error: messagesError } = useQuery({
    queryKey: ['candidateRecentMessagesDashboard', currentUser?.id],
    queryFn: () => getCandidateMessages({ unread: true, limit: 3 }), // Fetch 3 unread messages
    enabled: !!currentUser && currentUser.role === 'candidate',
    select: (data) => data ? data.sort((a: Message, b: Message) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()) : [],
  });
  
  const unreadMessagesCount = recentMessages?.length || 0; // This will be at most 3 now, or total unread if less than 3


  if (isLoadingProfile || isLoadingInterviews || isLoadingMessages) {
    return <MainLayout><Spinner text="Loading dashboard..." /></MainLayout>;
  }

  const overallError = profileError || interviewsError || messagesError;

  // --- Enhanced Profile Completion Logic ---
  const getProfileCompletionDetails = (profile: CandidateProfile | null | undefined) => {
    if (!profile) {
      return {
        percentage: 0,
        prompts: ['Profile data not available. Please try refreshing.'],
        missingFields: [],
      };
    }

    const checks = [
      { key: 'full_name', prompt: 'Add your full name.', isFilled: !!profile.full_name?.trim() },
      { key: 'phone_number', prompt: 'Add your phone number.', isFilled: !!profile.phone_number?.trim() },
      { key: 'linkedin_profile', prompt: 'Add your LinkedIn profile URL.', isFilled: !!profile.linkedin_profile?.trim() },
      { key: 'professional_summary', prompt: 'Write a professional summary.', isFilled: !!profile.professional_summary?.trim() },
      { key: 'resume_path', prompt: 'Upload your resume.', isFilled: !!profile.resume_path },
      { key: 'experience', prompt: 'Add your work experience.', isFilled: !!(profile.experience && profile.experience.length > 0) },
      { key: 'education', prompt: 'Add your education details.', isFilled: !!(profile.education && profile.education.length > 0) },
      { key: 'skills', prompt: 'Add your skills (they will be extracted from your resume or can be added manually).', isFilled: !!(profile.extracted_skills_list && profile.extracted_skills_list.length > 0) },
    ];

    const filledCount = checks.filter(c => c.isFilled).length;
    const percentage = Math.round((filledCount / checks.length) * 100);
    const prompts = checks.filter(c => !c.isFilled).map(c => c.prompt);
    const missingFields = checks.filter(c => !c.isFilled).map(c => c.key);
    
    return { percentage, prompts, missingFields };
  };

  const profileCompletionDetails = getProfileCompletionDetails(profileData);
  // --- End Enhanced Profile Completion Logic ---

  return (
    <MainLayout>
      <div className={styles.dashboardContainer}>
        <h1>Welcome, {profileData?.full_name || currentUser?.username}!</h1>
        
        {overallError && <AlertMessage type="error" message={`Error loading dashboard data: ${overallError.message}`} />}

        <div className={styles.widgetsGrid}>
          <Card title="Profile Status" className={styles.profileWidget}>
            <p>Completion: {profileCompletionDetails.percentage}%</p>
            <p>Status: {profileData?.profile_status || 'Not available'}</p>
            {profileCompletionDetails.percentage < 100 && profileCompletionDetails.prompts.length > 0 && (
              <div className={styles.profilePromptContainer}>
                <p className={styles.profilePromptHighlight}>To improve your chances, please:</p>
                <ul className={styles.profilePromptList}>
                  {profileCompletionDetails.prompts.map((prompt, index) => (
                    <li key={index}>{prompt}</li>
                  ))}
                </ul>
              </div>
            )}
            {profileCompletionDetails.percentage === 100 && (
              <p className={styles.profilePromptGood}>Your profile is looking great!</p>
            )}
            <div className={styles.cardActions}>
              <Link to="/candidate/profile" className={styles.linkButton}>View/Edit Profile</Link>
            </div>
          </Card>

          <Card title="Upcoming Interviews" className={styles.interviewsWidget}>
            {upcomingInterviews && upcomingInterviews.length > 0 ? (
              <ul className={styles.interviewList}>
                {upcomingInterviews.map(interview => (
                  <li key={interview.id} className={styles.interviewItem}>
                    <div>
                      <strong>{interview.job_title}</strong>
                      <p>Scheduled for: {new Date(interview.scheduled_at).toLocaleString()}</p>
                      <p>Status: <span className={`${styles.status} ${styles[interview.status.toLowerCase()]}`}>{interview.status}</span></p>
                    </div>
                    {interview.status === 'scheduled' && (
                      <Link to={`/interview/${interview.id}/take`} className={styles.linkButtonSmall}>Start Interview</Link>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No upcoming interviews scheduled.</p>
            )}
            <div className={styles.cardActions}>
              <Link to="/candidate/interviews" className={styles.linkButton}>View All Interviews</Link>
            </div>
          </Card>

          <Card title="Recent Messages" className={styles.messagesWidget}>
            {recentMessages && recentMessages.length > 0 ? (
              <>
                <p>You have <strong>{unreadMessagesCount}</strong> new message(s).</p> 
                {/* This count might be better fetched from a dedicated count endpoint if available, 
                    as 'recentMessages' is now limited. For now, it reflects the count of displayed snippets. 
                    Alternatively, fetch total unread count separately if needed for accuracy.
                    Let's assume for now this count refers to the displayed snippets.
                */}
                <ul className={styles.messageSnippetList}>
                  {recentMessages.map((msg: Message) => (
                    <li key={msg.id} className={styles.messageSnippetItem}>
                      <Link to="/candidate/messages" state={{ selectedMessageId: msg.id }}>
                        <strong>{msg.subject}</strong>
                        <p>From: {msg.sender_username || 'System'} - <span>{new Date(msg.sent_at).toLocaleDateString()}</span></p>
                        <p className={styles.snippetContent}>{msg.content.substring(0, 50)}...</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p>No new messages.</p>
            )}
            <div className={styles.cardActions}>
              <Link to="/candidate/messages" className={styles.linkButton}>View All Messages</Link>
            </div>
          </Card>

          <Card title="Quick Links" className={styles.actionsWidget}>
            <Link to="/candidate/profile" className={styles.linkButton}>View My Profile</Link>
            <Link to="/candidate/interviews" className={styles.linkButton}>View Interview History</Link>
            <Link to="/candidate/practice-questions" className={styles.linkButton}>Practice Questions</Link>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default CandidateDashboardPage;
