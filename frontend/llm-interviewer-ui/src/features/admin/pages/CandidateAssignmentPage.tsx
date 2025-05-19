import React, { useState } from 'react'; 
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MainLayout from '../../../components/layout/MainLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { getAllUsers, assignHrToCandidate } from '../../../services/adminAPI';
import type { UserManagementInfo, GetAllUsersParams } from '../../../services/adminAPI';
import Button from '../../../components/common/Button/Button';
import Select from '../../../components/common/Select/Select';
import Input from '../../../components/common/Input/Input';
import styles from './CandidateAssignmentPage.module.css';

const CandidateAssignmentPage: React.FC = () => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHr, setSelectedHr] = useState<Record<string, string>>({}); // candidateId -> hrId
  const [actionStatus, setActionStatus] = useState<Record<string, { message: string, type: 'success' | 'error' }>>({});

  // Fetch candidates
  const { data: candidatesData, isLoading: isLoadingCandidates, error: candidatesError, refetch: refetchCandidates } = useQuery<UserManagementInfo[], Error>({
    queryKey: ['allCandidatesForAssignment', searchTerm],
    queryFn: () => {
      const params: GetAllUsersParams = { role: 'candidate' };
      if (searchTerm) {
        params.search_term = searchTerm;
      }
      return getAllUsers(params);
    },
    enabled: !!currentUser,
  });

  // Fetch HRs mapped to the current admin
  const { data: mappedHrsData, isLoading: isLoadingHrs, error: hrsError } = useQuery<UserManagementInfo[], Error>({
    queryKey: ['mappedHrsForAdmin', currentUser?.id],
    queryFn: () => {
      if (!currentUser?.id) throw new Error('Admin ID not found');
      return getAllUsers({ role: 'hr', admin_manager_id: currentUser.id, hr_status: 'mapped' });
    },
    enabled: !!currentUser,
  });
  
  const assignHrMutation = useMutation<UserManagementInfo, Error, { candidateId: string; hrId: string }>({
    mutationFn: ({ candidateId, hrId }) => assignHrToCandidate(candidateId, hrId),
    onSuccess: (data, variables) => {
      setActionStatus(prev => ({ ...prev, [variables.candidateId]: { message: `HR assigned successfully to ${data.username}.`, type: 'success' }}));
      queryClient.invalidateQueries({ queryKey: ['allCandidatesForAssignment', searchTerm] }); 
    },
    onError: (error, variables) => {
      setActionStatus(prev => ({ ...prev, [variables.candidateId]: { message: `Error assigning HR: ${error.message}`, type: 'error' }}));
    }
  });

  const handleHrSelection = (candidateId: string, hrId: string) => {
    setSelectedHr(prev => ({ ...prev, [candidateId]: hrId }));
  };

  const handleAssignHr = (candidateId: string) => {
    const hrId = selectedHr[candidateId];
    if (!hrId) {
      setActionStatus(prev => ({ ...prev, [candidateId]: { message: 'Please select an HR to assign.', type: 'error' }}));
      return;
    }
    setActionStatus(prev => ({ ...prev, [candidateId]: { message: 'Assigning...', type: 'success' } }));
    assignHrMutation.mutate({ candidateId, hrId });
  };

  const candidates = candidatesData;
  const mappedHrs = mappedHrsData;

  const candidatesToDisplay = candidates?.filter((c: UserManagementInfo) => !c.assigned_hr_id);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    refetchCandidates();
  };
  
  // Removed useEffect that was causing issues, refetch is manual via button or query invalidation

  if (isLoadingCandidates || isLoadingHrs) {
    return <MainLayout><div>Loading data...</div></MainLayout>;
  }

  return (
    <MainLayout>
      <div className={styles.assignmentContainer}>
        <h1>Assign HR to Candidates</h1>
        
        <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
          <Input
            label="Search Candidates (Name/Email):"
            type="text"
            name="searchTerm"
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            placeholder="Enter name or email"
          />
          <Button type="submit" isLoading={isLoadingCandidates}>Search</Button>
        </form>

        {candidatesError && <p className={styles.error}>Error loading candidates: {candidatesError.message}</p>}
        {hrsError && <p className={styles.error}>Error loading HRs: {hrsError.message}</p>}

        {isLoadingCandidates && <p>Loading candidates...</p>}
        {!isLoadingCandidates && (!candidatesToDisplay || candidatesToDisplay.length === 0) && (
          <p>No candidates currently pending HR assignment {searchTerm && `matching "${searchTerm}"`}.</p>
        )}

        {candidatesToDisplay && candidatesToDisplay.length > 0 && mappedHrs && (
          <ul className={styles.candidateList}>
            {candidatesToDisplay.map((candidate: UserManagementInfo) => (
              <li key={candidate.id} className={styles.candidateItem}>
                <div>
                  <h3>{candidate.username} ({candidate.email})</h3>
                  <p>Registered: {new Date(candidate.created_at).toLocaleDateString()}</p>
                  <p>Status: {candidate.hr_status || 'Pending Assignment'}</p>
                  <Link to={`/admin/users/${candidate.id}`} className={styles.profileLink}>View Profile</Link>
                </div>
                <div className={styles.assignmentControls}>
                  <Select
                    options={mappedHrs.map((hr: UserManagementInfo) => ({ 
                      value: hr.id, 
                      label: `${hr.username} (${hr.company || 'N/A'}) - Load: ${hr.assigned_candidates_count === undefined ? 'N/A' : hr.assigned_candidates_count}` 
                    }))}
                    value={selectedHr[candidate.id] || ''}
                    onChange={(e) => handleHrSelection(candidate.id, e.target.value)}
                    placeholder="Select HR"
                    disabled={assignHrMutation.isPending && assignHrMutation.variables?.candidateId === candidate.id}
                  />
                  <Button
                    onClick={() => handleAssignHr(candidate.id)}
                    isLoading={assignHrMutation.isPending && assignHrMutation.variables?.candidateId === candidate.id}
                    disabled={!selectedHr[candidate.id] || (assignHrMutation.isPending && assignHrMutation.variables?.candidateId === candidate.id)}
                    size="small"
                  >
                    Assign HR
                  </Button>
                </div>
                {actionStatus[candidate.id] && (
                  <p className={`${styles.actionMessage} ${actionStatus[candidate.id].type === 'error' ? styles.error : styles.success}`}>
                    {actionStatus[candidate.id].message}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
         <Link to="/admin/dashboard" className={styles.backLink}>Back to Dashboard</Link>
      </div>
    </MainLayout>
  );
};

export default CandidateAssignmentPage;
