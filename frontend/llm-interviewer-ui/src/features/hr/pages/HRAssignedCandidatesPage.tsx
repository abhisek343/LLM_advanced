import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import styles from './HRAssignedCandidatesPage.module.css';
import ButtonFromCommon from '../../../components/common/Button'; 
import ButtonStyles from '../../../components/common/Button.module.css'; 
import Table, { type ColumnDefinition } from '../../../components/common/Table';
import Spinner from '../../../components/common/Spinner';
import AlertMessage from '../../../components/common/AlertMessage';
import { useAuth } from '../../../contexts/AuthContext';
import hrService, { type CandidateProfileOut, type MessageContentCreate } from '../../../services/hrService';
import Modal from '../../../components/common/Modal';
import Input from '../../../components/common/Input';
import Textarea from '../../../components/common/Textarea';

// Using CandidateProfileOut directly from hrService
// export interface AssignedCandidate {
//   id: string; 
//   name: string; // username in CandidateProfileOut
//   email: string;
//   lastInterviewStatus?: string; // candidate_status in CandidateProfileOut
//   lastInterviewDate?: string; // This might not be directly on CandidateProfileOut, needs review
// }

const ASSIGNED_CANDIDATES_QUERY_KEY = 'hrAssignedCandidates';

const HRAssignedCandidatesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { currentUser, isLoading: isLoadingAuth } = useAuth();

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedCandidateToInvite, setSelectedCandidateToInvite] = useState<CandidateProfileOut | null>(null);
  const [inviteMessageSubject, setInviteMessageSubject] = useState('');
  const [inviteMessageContent, setInviteMessageContent] = useState('');
  const [inviteActionError, setInviteActionError] = useState<string | null>(null);

  const { 
    data: candidates, 
    isLoading: isLoadingCandidates, 
    error 
  } = useQuery<CandidateProfileOut[], Error>({
    queryKey: [ASSIGNED_CANDIDATES_QUERY_KEY, currentUser?.id],
    queryFn: () => hrService.getMyAssignedCandidates(), 
    enabled: !!currentUser && !isLoadingAuth && currentUser.role === 'hr',
  });

  const { mutate: sendInvitationMutate, isPending: isSendingInvitation } = useMutation<
    { message: string },
    Error,
    { candidateId: string; messageData: MessageContentCreate }
  >({
    mutationFn: (vars) => hrService.sendCandidateInvitation(vars.candidateId, vars.messageData),
    onSuccess: (data) => {
      alert(data.message || "Invitation sent successfully!");
      setIsInviteModalOpen(false);
      setInviteMessageSubject('');
      setInviteMessageContent('');
      setSelectedCandidateToInvite(null);
      setInviteActionError(null);
      queryClient.invalidateQueries({ queryKey: [ASSIGNED_CANDIDATES_QUERY_KEY, currentUser?.id] });
    },
    onError: (error) => setInviteActionError("Failed to send invitation: " + error.message),
  });

  const handleOpenInviteModal = (candidate: CandidateProfileOut) => {
    setSelectedCandidateToInvite(candidate);
    setInviteMessageSubject(`Invitation to Interview: ${candidate.username}`);
    setInviteMessageContent(`Dear ${candidate.username},\n\nWe would like to invite you for an interview opportunity related to your application/profile.\n\nPlease let us know your availability or if you have any questions.\n\nBest regards,\n${currentUser?.username || 'HR Team'}`);
    setInviteActionError(null);
    setIsInviteModalOpen(true);
  };
  
  const handleSendInvitation = () => {
    if (!selectedCandidateToInvite || !inviteMessageSubject.trim() || !inviteMessageContent.trim()) {
      setInviteActionError("Subject and content are required for the invitation.");
      return;
    }
    sendInvitationMutate({
      candidateId: selectedCandidateToInvite.id,
      messageData: { subject: inviteMessageSubject, content: inviteMessageContent },
    });
  };

  const columns: ColumnDefinition<CandidateProfileOut>[] = [
    { title: 'Name', key: 'username', render: (item) => <strong>{item.username}</strong> },
    { title: 'Email', key: 'email' },
    { title: 'Status', key: 'candidate_status', render: (item) => item.candidate_status || 'N/A' },
    // 'lastInterviewDate' is not directly on CandidateProfileOut, might need adjustment or removal
    // { title: 'Last Interview Date', key: 'lastInterviewDate', render: (item) => item.lastInterviewDate ? new Date(item.lastInterviewDate).toLocaleDateString() : 'N/A' },
    {
      title: 'Actions',
      key: 'actions',
      render: (item) => (
        <div className={styles.actionsCell}>
          <ButtonFromCommon 
            onClick={() => handleOpenInviteModal(item)} 
            size="small" 
            variant="primary" // Changed from "info"
            className={styles.actionButton}
            disabled={isSendingInvitation && selectedCandidateToInvite?.id === item.id}
          >
            {isSendingInvitation && selectedCandidateToInvite?.id === item.id ? 'Sending...' : 'Invite'}
          </ButtonFromCommon>
          <Link 
            to={`/hr/schedule-interview`} 
            state={{ candidateId: item.id, candidateName: item.username }}
            className={`${ButtonStyles.buttonBase} ${ButtonStyles.small} ${ButtonStyles.primary} ${styles.actionLinkButton}`}
          >
            Schedule
          </Link>
          {/* 
            "Review Last" and "View Profile" buttons removed.
            - "Review Last" requires specific interview ID which is not readily available here.
            - "View Profile" is ambiguous without a dedicated HR view of candidate profile; key details are in table.
            These would require further backend support or UX clarification for robust implementation.
          */}
        </div>
      ),
    },
  ];

  if (isLoadingAuth || isLoadingCandidates) {
    return <div className={styles.pageContainer} style={{ textAlign: 'center', paddingTop: '50px' }}><Spinner size="large" /><p>Loading assigned candidates...</p></div>;
  }

  if (error) {
    return <div className={styles.pageContainer}><AlertMessage type="error" message={`Error loading candidates: ${error.message}`} /></div>;
  }
  
  if (currentUser?.role !== 'hr') {
     return <div className={styles.pageContainer}><AlertMessage type="warning" message="You are not authorized to view this page." /></div>;
  }

  return (
    <div className={styles.pageContainer}>
      <header className={styles.pageHeader}>
        <h1>Assigned Candidates</h1>
        <ButtonFromCommon to="/hr/search-candidates" variant="primary">
          Search & Assign New Candidates
        </ButtonFromCommon>
      </header>
      
      <section className={styles.candidatesTableSection}>
        <Table<CandidateProfileOut>
          columns={columns}
          data={candidates || []}
          isLoading={isLoadingCandidates}
          emptyText="No candidates are currently assigned to you."
        />
      </section>

      {isInviteModalOpen && selectedCandidateToInvite && (
        <Modal 
            isOpen={isInviteModalOpen} 
            onClose={() => setIsInviteModalOpen(false)} 
            title={`Send Invitation to ${selectedCandidateToInvite.username}`}
        >
            {inviteActionError && <AlertMessage type="error" message={inviteActionError} closable onClose={() => setInviteActionError(null)} />}
            <Input 
                label="Subject" 
                value={inviteMessageSubject} 
                onChange={e => setInviteMessageSubject(e.target.value)} 
                disabled={isSendingInvitation}
            />
            <Textarea 
                label="Message Content" 
                value={inviteMessageContent} 
                onChange={e => setInviteMessageContent(e.target.value)} 
                rows={10} 
                disabled={isSendingInvitation}
            />
            <div style={{marginTop: '15px', display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
                <ButtonFromCommon onClick={() => setIsInviteModalOpen(false)} variant="secondary" disabled={isSendingInvitation}>Cancel</ButtonFromCommon>
                <ButtonFromCommon 
                    onClick={handleSendInvitation} 
                    isLoading={isSendingInvitation} 
                    disabled={isSendingInvitation}
                >
                    Send Invitation
                </ButtonFromCommon>
            </div>
        </Modal>
      )}
    </div>
  );
};

export default HRAssignedCandidatesPage;
