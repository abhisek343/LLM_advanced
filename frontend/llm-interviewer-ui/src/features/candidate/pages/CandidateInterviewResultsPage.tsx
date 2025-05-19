import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '../../../components/layout/MainLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { getInterviewResults } from '../../../services/interviewAPI';
import type { InterviewResult } from '../../../services/interviewAPI';
import styles from './CandidateInterviewResultsPage.module.css'; // To be created

const CandidateInterviewResultsPage: React.FC = () => {
  const { interviewId } = useParams<{ interviewId: string }>();
  const { currentUser } = useAuth();

  const { data: results, isLoading, error } = useQuery<InterviewResult, Error>({
    queryKey: ['interviewResults', interviewId],
    queryFn: () => {
      if (!interviewId) throw new Error('Interview ID is required.');
      return getInterviewResults(interviewId);
    },
    enabled: !!interviewId && !!currentUser,
  });

  if (isLoading) {
    return <MainLayout><div>Loading interview results...</div></MainLayout>;
  }

  if (error) {
    return <MainLayout><div className={styles.error}>Error loading results: {error.message}</div></MainLayout>;
  }

  if (!results) {
    return <MainLayout><div>Interview results not found.</div></MainLayout>;
  }

  return (
    <MainLayout>
      <div className={styles.resultsContainer}>
        <h1>Interview Results: {results.job_title || 'N/A'}</h1>
        <p className={styles.subHeader}>Interview ID: {results.interview_id}</p>
        {results.interview_date && (
          <p className={styles.interviewDate}>
            Date: {new Date(results.interview_date).toLocaleString()}
          </p>
        )}

        <section className={styles.summarySection}>
          <h2>Overall Summary</h2>
          <p><strong>Overall Score:</strong> {results.overall_score ?? 'Not yet scored'}</p>
          <p><strong>Overall Feedback:</strong> {results.overall_feedback || 'No overall feedback provided yet.'}</p>
          <p><strong>Status:</strong> <span className={`${styles.status} ${styles[results.status.toLowerCase()]}`}>{results.status}</span></p>
          {results.hr_recommendation && <p><strong>HR Recommendation:</strong> {results.hr_recommendation}</p>}
        </section>

        <section className={styles.questionsSection}>
          <h2>Question Breakdown</h2>
          {results.questions && results.questions.length > 0 ? (
            <ul className={styles.questionList}>
              {results.questions.map((q, index) => (
                <li key={q.question_id || index} className={styles.questionItem}>
                  <h3>Question {index + 1}: {q.question_text}</h3>
                  <div className={styles.answerBlock}>
                    <h4>Your Answer:</h4>
                    {q.candidate_answer_text && <p className={styles.answerText}>{q.candidate_answer_text}</p>}
                    {q.candidate_code_answer && <pre className={styles.codeBlock}><code>{q.candidate_code_answer}</code></pre>}
                    {q.candidate_video_url && (
                      <div className={styles.videoPlayback}>
                        <p><strong>Your Video Answer:</strong></p>
                        {/* Basic video player; consider a more robust component for production */}
                        <video controls width="100%" src={q.candidate_video_url}>
                          Your browser does not support the video tag.
                        </video>
                        {/* Or simply a link: <a href={q.candidate_video_url} target="_blank" rel="noopener noreferrer">View Video</a> */}
                      </div>
                    )}
                    {!q.candidate_answer_text && !q.candidate_code_answer && !q.candidate_video_url && <p><em>No answer provided for this question type.</em></p>}
                  </div>
                  <div className={styles.feedbackBlock}>
                    <h4>AI Feedback:</h4>
                    <p><strong>AI Score:</strong> {q.ai_score ?? 'N/A'}</p>
                    <p>{q.ai_feedback || 'No AI feedback available.'}</p>
                  </div>
                  {results.status === 'evaluated_by_hr' || results.status === 'completed_hr_review' && ( // Assuming statuses indicating HR review
                     <div className={styles.feedbackBlock}>
                        <h4>HR Feedback:</h4>
                        <p><strong>HR Score:</strong> {q.hr_score ?? 'N/A'}</p>
                        <p>{q.hr_feedback || 'No HR feedback for this question.'}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>No question breakdown available.</p>
          )}
        </section>

        <Link to="/candidate/interviews" className={styles.backLink}>Back to My Interviews</Link>
      </div>
    </MainLayout>
  );
};

export default CandidateInterviewResultsPage;
