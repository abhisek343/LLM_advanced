import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import styles from './CandidateSearchPage.module.css';
import hrService, { type RankedCandidate, type SearchFilters, type MessageContentCreate, type HrProfileOut } from '../../../services/hrService';
import { useAuth } from '../../../contexts/AuthContext';
import Spinner from '../../../components/common/Spinner';
import AlertMessage from '../../../components/common/AlertMessage';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Textarea from '../../../components/common/Textarea'; // For invitation message
import Modal from '../../../components/common/Modal'; // For invitation message
// import CandidateCard from '../components/CandidateCard'; // CandidateCard is not directly used here, results component handles display
import Card from '../../../components/common/Card'; // Added missing Card import

// Placeholder for a more structured search results component if needed
const CandidateSearchResults: React.FC<{ 
  results: RankedCandidate[]; 
  onInvite: (candidate: RankedCandidate) => void; // Adjusted to RankedCandidate
  actionInProgressForId?: string | null;
}> = ({ results, onInvite, actionInProgressForId }) => {
  if (results.length === 0) {
    return <p>No candidates found matching your criteria.</p>;
  }
  return (
    <div className={styles.resultsGrid}>
      {results.map(candidate => (
        // Adapt CandidateCard or use its structure. For now, assuming RankedCandidate has enough info
        // or we fetch full CandidateProfileOut upon selection for invite.
        // For simplicity, we'll pass RankedCandidate and adapt the invite modal.
        <Card title={candidate.username} key={candidate.id} className={styles.candidateCardItem}>
            <p>Email: {candidate.email}</p>
            <p>Match Score: {candidate.score.toFixed(2)}</p>
            {/* Add more details from RankedCandidate if available */}
            <Button 
              onClick={() => onInvite(candidate)} 
              size="small"
              disabled={actionInProgressForId === candidate.id}
            >
              {actionInProgressForId === candidate.id ? 'Processing...' : 'Send Invitation'}
            </Button>
        </Card>
      ))}
    </div>
  );
};


const CandidateSearchPage: React.FC = () => {
  const { currentUser, isLoading: isLoadingAuth } = useAuth();
  
  // State for HR Profile
  const [hrProfile, setHrProfile] = useState<HrProfileOut | null>(null);
  const [isProfileLoadingOrInitial, setIsProfileLoadingOrInitial] = useState<boolean>(true); // Combined loading state
  const [profileFetchError, setProfileFetchError] = useState<Error | null>(null);

  // Fetch HR profile to check mapping status - Moved to top level
  const { data: fetchedHrProfile, error: hrProfileErrorHook, isLoading: isLoadingHrProfileHook } = useQuery<HrProfileOut, Error>({
    queryKey: ['hrProfileForSearchPage', currentUser?.id],
    queryFn: () => hrService.getProfileDetails(),
    enabled: !!currentUser && !isLoadingAuth && currentUser.role === 'hr', // Only fetch if HR and auth loaded
  });

  useEffect(() => {
    if (currentUser && currentUser.role === 'hr') {
      if (isLoadingHrProfileHook) {
        setIsProfileLoadingOrInitial(true);
        return;
      }
      if (hrProfileErrorHook) {
        setProfileFetchError(hrProfileErrorHook);
        setHrProfile(null);
        setIsProfileLoadingOrInitial(false);
      } else if (fetchedHrProfile) {
        setHrProfile(fetchedHrProfile);
        setProfileFetchError(null);
        setIsProfileLoadingOrInitial(false);
      } else if (!isLoadingAuth && !isLoadingHrProfileHook) {
        // If not loading and no data/error, means query was disabled or finished with no data
        setIsProfileLoadingOrInitial(false);
      }
    } else if (!isLoadingAuth) { // Not HR or no current user
        setIsProfileLoadingOrInitial(false);
    }
  }, [currentUser, isLoadingAuth, fetchedHrProfile, hrProfileErrorHook, isLoadingHrProfileHook]);


  const [filters, setFilters] = useState<SearchFilters>({
    keyword: '',
    required_skills: [],
    yoe_min: undefined,
  });
  const [searchResults, setSearchResults] = useState<RankedCandidate[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  // Using RankedCandidate here, but might need to fetch full CandidateProfileOut for more details
  const [selectedCandidateToInvite, setSelectedCandidateToInvite] = useState<RankedCandidate | null>(null);
  const [inviteMessageSubject, setInviteMessageSubject] = useState('');
  const [inviteMessageContent, setInviteMessageContent] = useState('');
  const [inviteActionError, setInviteActionError] = useState<string | null>(null);


  const { mutate: searchCandidatesMutate, isPending: isSearching } = useMutation<
    RankedCandidate[],
    Error,
    SearchFilters
  >({
    mutationFn: hrService.searchCandidates,
    onSuccess: (data) => {
      setSearchResults(data);
      setSearchError(null);
    },
    onError: (error) => {
      setSearchError("Failed to search candidates: " + error.message);
      setSearchResults([]);
    },
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
      // Reset modal form
      setInviteMessageSubject('');
      setInviteMessageContent('');
      setSelectedCandidateToInvite(null);
      setInviteActionError(null);
    },
    onError: (error) => setInviteActionError("Failed to send invitation: " + error.message),
  });


  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "required_skills") {
      setFilters(prev => ({ ...prev, [name]: value.split(',').map(skill => skill.trim()).filter(skill => skill) }));
    } else if (name === "yoe_min") {
      setFilters(prev => ({ ...prev, [name]: value ? parseInt(value, 10) : undefined }));
    } 
    else {
      setFilters(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchCandidatesMutate(filters);
  };

  const handleOpenInviteModal = (candidate: RankedCandidate) => {
    setSelectedCandidateToInvite(candidate);
    setInviteMessageSubject(`Invitation to Interview: ${candidate.username}`);
    setInviteMessageContent(`Dear ${candidate.username},\n\nWe noticed your profile during our candidate search and would like to invite you for an interview opportunity.\n\nPlease let us know your availability or if you have any questions.\n\nBest regards,\n${currentUser?.username || 'HR Team'}`);
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
      messageData: {
        subject: inviteMessageSubject,
        content: inviteMessageContent,
      },
    });
  };
  
  const isHrMapped = hrProfile?.hr_status === 'mapped';

  // Combined loading state check at the beginning
  if (isLoadingAuth || (currentUser?.role === 'hr' && isProfileLoadingOrInitial)) {
    return <div className={styles.pageContainer} style={{textAlign: 'center' as any, paddingTop: '50px'}}><Spinner size="large" /><p>Loading page...</p></div>;
  }
  
  // Authorization check after loading
  if (currentUser?.role !== 'hr') {
    return <div className={styles.pageContainer}><AlertMessage type="warning" message="You are not authorized to view this page." /></div>;
  }

  // Profile fetch error check (if user is HR)
  if (profileFetchError) {
    return <div className={styles.pageContainer}><AlertMessage type="error" message={`Error loading profile: ${profileFetchError.message}`} /></div>;
  }

  return (
    <div className={styles.pageContainer}>
      <header className={styles.pageHeader}>
        <h1>Search Candidates</h1>
      </header>

      {!isHrMapped && (
        <AlertMessage 
          type="info" 
          message="Candidate search is available only when you are mapped to an Admin. Please manage your admin connections." 
        />
      )}

      <form onSubmit={handleSearch} className={styles.searchForm}>
        <Input
          label="Keywords"
          name="keyword"
          disabled={!isHrMapped || isSearching}
          value={filters.keyword || ''}
          onChange={handleFilterChange}
          placeholder="e.g., Software Engineer, Java, Python"
        />
        <Input
          label="Required Skills (comma-separated)"
          name="required_skills"
          value={filters.required_skills?.join(', ') || ''}
          onChange={handleFilterChange}
          placeholder="e.g., react, nodejs, mongodb"
          disabled={!isHrMapped || isSearching}
        />
        <Input
          label="Minimum Years of Experience"
          name="yoe_min"
          type="number"
          value={filters.yoe_min || ''}
          onChange={handleFilterChange}
          placeholder="e.g., 3"
          disabled={!isHrMapped || isSearching}
        />
        <Button type="submit" isLoading={isSearching} disabled={!isHrMapped || isSearching}>
          Search
        </Button>
      </form>

      {searchError && <AlertMessage type="error" message={searchError} closable onClose={() => setSearchError(null)} />}
      
      {isSearching && <Spinner />}

      {!isSearching && searchResults && (
        <section className={styles.resultsSection}>
          <h2>Search Results ({searchResults.length})</h2>
          <CandidateSearchResults 
            results={searchResults} 
            onInvite={handleOpenInviteModal}
            actionInProgressForId={isSendingInvitation ? selectedCandidateToInvite?.id : null}
          />
        </section>
      )}

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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInviteMessageSubject(e.target.value)} 
                disabled={isSendingInvitation}
            />
            <Textarea 
                label="Message Content" 
                value={inviteMessageContent} 
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInviteMessageContent(e.target.value)} 
                rows={10} 
                disabled={isSendingInvitation}
            />
            <div style={{marginTop: '15px', display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
                <Button onClick={() => setIsInviteModalOpen(false)} variant="secondary" disabled={isSendingInvitation}>Cancel</Button>
                <Button 
                    onClick={handleSendInvitation} 
                    isLoading={isSendingInvitation} 
                    disabled={isSendingInvitation}
                >
                    Send Invitation
                </Button>
            </div>
        </Modal>
      )}
    </div>
  );
};

export default CandidateSearchPage;
