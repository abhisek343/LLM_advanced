import React, { useState } from 'react'; // useEffect removed
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query'; // useQueryClient removed
import ScheduleInterviewForm from '../components/ScheduleInterviewForm'; 
import type { Candidate, InterviewScheduleData } from '../components/ScheduleInterviewForm'; 
import styles from './ScheduleInterviewPage.module.css';
import interviewService, { type InterviewScheduleResponse } from '../../../services/interviewService'; // Import interviewService
// import hrService from '../../../services/hrService'; // Removed as mockGetAssignedCandidates is local for now
import AlertMessage from '../../../components/common/AlertMessage';
import Spinner from '../../../components/common/Spinner';
import { useAuth } from '../../../contexts/AuthContext';

// Mock API functions are now replaced by service calls

// Placeholder for fetching assigned candidates (might be from hrService or candidateService)
// This mock will be replaced by an actual call to hrService.getAssignedCandidates or similar
const mockGetAssignedCandidates = async (): Promise<Candidate[]> => { 
    console.log("API Mock (to be hrService.getAssignedCandidates): GET /hr/assigned-candidates");
    await new Promise(resolve => setTimeout(resolve, 500));
    return [
      { id: 'cand1', name: 'Alice Wonderland (Assigned)' },
      { id: 'cand2', name: 'Bob The Builder (Assigned)' },
      { id: 'cand3', name: 'Charlie Brown (Assigned)' },
    ];
};

const ASSIGNED_CANDIDATES_QUERY_KEY = 'assignedCandidatesForScheduling';

const ScheduleInterviewPage: React.FC = () => {
  const location = useLocation();
  // const queryClient = useQueryClient(); // Removed as not used
  const { currentUser, isLoading: isLoadingAuth } = useAuth();
  
  const preSelectedCandidate = location.state as { candidateId?: string; candidateName?: string } | undefined;

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const { data: assignedCandidates, isLoading: isLoadingCandidates, error: candidatesError } = useQuery<Candidate[], Error>({
    queryKey: [ASSIGNED_CANDIDATES_QUERY_KEY, currentUser?.id],
    // TODO: Replace mockGetAssignedCandidates with an actual method from hrService or a dedicated candidateService
    // For now, assuming hrService might have a method like getRankedCandidates or a specific one for assigned candidates.
    // Using a placeholder or existing relevant method from hrService if available.
    // If hrService.searchCandidates can be used with specific filters to get assigned ones, that's an option.
    // For this example, let's assume a new method `hrService.getAssignedCandidatesForScheduling` would exist.
    // Using mockGetAssignedCandidates for now as that method isn't defined in hrService.ts yet.
    queryFn: mockGetAssignedCandidates, 
    enabled: !!currentUser && !isLoadingAuth,
  });

  const { mutate: scheduleInterviewMutate, isPending: isScheduling } = useMutation<
    InterviewScheduleResponse,
    Error,
    InterviewScheduleData
  >({
    mutationFn: interviewService.scheduleInterview, // Use actual service method
    onSuccess: (data, variables) => {
      const candidateName = assignedCandidates?.find(c => c.id === variables.candidateId)?.name || variables.candidateId;
      setFormSuccess(`${data.message} for ${candidateName}. (ID: ${data.interviewId})`);
      setFormError(null);
      // Optionally, invalidate queries that list interviews
      // queryClient.invalidateQueries({ queryKey: ['interviewsList'] }); 
    },
    onError: (error) => {
      setFormError("Failed to schedule interview: " + error.message);
      setFormSuccess(null);
    },
  });

  const handleSubmit = async (data: InterviewScheduleData) => {
    scheduleInterviewMutate(data);
  };
  
  const pageTitleCandidateName = preSelectedCandidate?.candidateName || 
                                (preSelectedCandidate?.candidateId ? assignedCandidates?.find(c=>c.id === preSelectedCandidate.candidateId)?.name : null);

  if (isLoadingAuth || isLoadingCandidates) {
    return <div className={styles.pageContainer} style={{textAlign: 'center', paddingTop: '50px'}}><Spinner size="large" /><p>Loading data...</p></div>;
  }

  if (candidatesError) {
    return <div className={styles.pageContainer}><AlertMessage type="error" message={`Error loading candidates: ${candidatesError.message}`} /></div>;
  }

  return (
    <div className={styles.pageContainer}>
      <header className={styles.pageHeader}>
        <h1>Schedule Interview</h1>
        {pageTitleCandidateName && <p className={styles.subHeader}>For: {pageTitleCandidateName}</p>}
      </header>
      <ScheduleInterviewForm
        assignedCandidates={assignedCandidates || []}
        initialSelectedCandidateId={preSelectedCandidate?.candidateId}
        onSubmit={handleSubmit}
        isSubmitting={isScheduling}
        formError={formError}
        formSuccess={formSuccess}
      />
    </div>
  );
};

export default ScheduleInterviewPage;
