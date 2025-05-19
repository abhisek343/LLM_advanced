import React, { useState } from 'react'; // useEffect removed
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import InterviewReviewPanel from '../components/InterviewReviewPanel'; 
import type { InterviewData, HREvaluationPayload } from '../components/InterviewReviewPanel'; 
import styles from './InterviewReviewPage.module.css';
import interviewService, { type HrEvaluationSubmitResponse } from '../../../services/interviewService'; // Import interviewService
import AlertMessage from '../../../components/common/AlertMessage';
import Spinner from '../../../components/common/Spinner';
import { useAuth } from '../../../contexts/AuthContext';

// Mock API functions are now replaced by service calls

const INTERVIEW_RESULTS_QUERY_KEY_BASE = 'interviewResults';

const InterviewReviewPage: React.FC = () => {
  const { interviewId } = useParams<{ interviewId: string }>();
  const queryClient = useQueryClient();
  const { currentUser, isLoading: isLoadingAuth } = useAuth();

  const [generalError, setGeneralError] = useState<string | null>(null);
  const [generalSuccess, setGeneralSuccess] = useState<string | null>(null);

  const { 
    data: interviewData, 
    isLoading: isLoadingResults, 
    error: resultsError 
  } = useQuery<InterviewData, Error>({
    queryKey: [INTERVIEW_RESULTS_QUERY_KEY_BASE, interviewId, currentUser?.id],
    queryFn: () => {
      if (!interviewId) throw new Error("Interview ID is required for fetching results."); // Should be caught by enabled typically
      return interviewService.getInterviewResults(interviewId);
    },
    enabled: !!interviewId && !!currentUser && !isLoadingAuth,
  });

  const { mutate: submitEvaluationMutate, isPending: isSubmittingEvaluation } = useMutation<
    HrEvaluationSubmitResponse, // Use type from interviewService
    Error,
    HREvaluationPayload
  >({
    mutationFn: (evaluationData) => {
        if (!interviewId) throw new Error("Interview ID is missing for submission.");
        return interviewService.submitHrEvaluation(interviewId, evaluationData); // Use actual service method
    },
    onSuccess: (data) => {
      setGeneralSuccess(data.message);
      setGeneralError(null);
      // Optionally invalidate queries related to this interview or lists of reviews
      queryClient.invalidateQueries({ queryKey: [INTERVIEW_RESULTS_QUERY_KEY_BASE, interviewId] });
    },
    onError: (error) => {
      setGeneralError("Failed to submit evaluation: " + error.message);
      setGeneralSuccess(null);
    },
  });

  const handleSubmitEvaluation = async (evaluationData: HREvaluationPayload) => {
    await submitEvaluationMutate(evaluationData);
  };

  if (isLoadingAuth || isLoadingResults) {
    return <div className={styles.pageContainer} style={{textAlign: 'center', paddingTop: '50px'}}><Spinner size="large" /><p>Loading interview results...</p></div>;
  }

  if (resultsError) {
    return <div className={styles.pageContainer}><AlertMessage type="error" message={`Error loading results: ${resultsError.message}`} /></div>;
  }
  
  if (!interviewData) {
    return <div className={styles.pageContainer}><AlertMessage type="warning" message={`Interview data not found for ID: ${interviewId}.`} /></div>;
  }

  return (
    <div className={styles.pageContainer}>
      <header className={styles.pageHeader}>
        <h1>Review Interview: {interviewData.jobTitle}</h1>
        <p className={styles.subHeader}>Candidate: {interviewData.candidateName} | Date: {new Date(interviewData.interviewDate).toLocaleDateString()}</p>
        {interviewData.overallAIScore && <p className={styles.subHeader}>Overall AI Score: {interviewData.overallAIScore}</p>}
      </header>

      {generalError && <AlertMessage type="error" message={generalError} closable onClose={() => setGeneralError(null)} />}
      {generalSuccess && <AlertMessage type="success" message={generalSuccess} closable onClose={() => setGeneralSuccess(null)} />}

      <InterviewReviewPanel
        interviewData={interviewData}
        onSubmitEvaluation={handleSubmitEvaluation}
        isSubmitting={isSubmittingEvaluation}
        // Pass submissionError and submissionSuccess from mutation state if needed by panel directly
        // For now, generalError/Success at page level handles this.
      />
    </div>
  );
};

export default InterviewReviewPage;
