import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query'; // useQueryClient removed
// import { useAuth } from '../../../contexts/AuthContext'; // useAuth and currentUser removed
import { searchHrProfiles, sendHrMappingRequest } from '../../../services/adminAPI';
import type { RankedHR, SearchHrParams, HRMappingRequestOut } from '../../../services/adminAPI';
import Input from '../../../components/common/Input/Input';
import Button from '../../../components/common/Button/Button';
import Select from '../../../components/common/Select/Select'; // Import Select component
import styles from './AdminSearchHRPage.module.css'; 

interface AdminSearchHRPageProps {
  onInvitationSent?: () => void; // Callback prop
}

const AdminSearchHRPage: React.FC<AdminSearchHRPageProps> = ({ onInvitationSent }) => {
  // const { currentUser } = useAuth(); // Removed
  // const queryClient = useQueryClient(); // Removed
  const [searchParams, setSearchParams] = useState<SearchHrParams>({
    keyword: '',
    status_filter: 'unmapped', // Default to Unmapped (Active) HRs
  });
  const [actionStatus, setActionStatus] = useState<Record<string, { message: string, type: 'success' | 'error' }>>({});


  const { data: hrResults, isLoading: isLoadingResults, error: queryError, refetch } = useQuery<RankedHR[], Error>({
    queryKey: ['searchHrProfiles', searchParams],
    queryFn: () => {
      const { keyword, status_filter, yoe_min } = searchParams;
      const paramsToSubmit: SearchHrParams = { keyword };

      if (status_filter && status_filter !== 'all') {
        paramsToSubmit.status_filter = status_filter;
      }

      // yoe_min comes from input as string, or is undefined initially
      const yoeMinString = yoe_min as unknown as string; // Cast to string for checking if empty
      if (yoeMinString && yoeMinString.trim() !== '') {
        const numYoe = Number(yoeMinString);
        if (!isNaN(numYoe) && numYoe >= 0) {
          paramsToSubmit.yoe_min = numYoe;
        }
      }
      return searchHrProfiles(paramsToSubmit);
    },
    enabled: false, // Only fetch on manual trigger (e.g., button click)
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    refetch();
  };

  const sendInvitationMutation = useMutation<HRMappingRequestOut, Error, string>({
    mutationFn: (hrUserId: string) => sendHrMappingRequest(hrUserId),
    onSuccess: (data, hrUserId) => {
      setActionStatus(prev => ({ ...prev, [hrUserId]: { message: `Invitation sent to HR ${data.target_id}. Status: ${data.status}`, type: 'success' }}));
      // Optionally, refetch search results if status changes affect searchability, or manage UI state
      if (onInvitationSent) {
        onInvitationSent(); // Call the callback to refresh parent's list
      }
    },
    onError: (error, hrUserId) => {
      setActionStatus(prev => ({ ...prev, [hrUserId]: { message: `Error sending invitation: ${error.message}`, type: 'error' }}));
    }
  });

  const handleSendInvitation = (hrUserId: string) => {
    setActionStatus(prev => ({ ...prev, [hrUserId]: { message: 'Sending...', type: 'success' } }));
    sendInvitationMutation.mutate(hrUserId);
  };

  return (
    // <MainLayout> // Removed MainLayout wrapper
      <div className={styles.searchHrContainer}>
        <h1>Search & Invite HR Personnel</h1>
        
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <Input
            label="Keyword (Name, Email, Company)"
            name="keyword"
            value={searchParams.keyword || ''}
            onChange={handleInputChange}
            className={styles.formInput}
          />
          <Input
            label="Min. Years of Experience"
            name="yoe_min"
            type="number"
            min="0" // Prevent negative numbers in UI
            value={searchParams.yoe_min === undefined ? '' : String(searchParams.yoe_min)} // Handle undefined for controlled input
            onChange={handleInputChange}
            className={styles.formInput}
          />
          <Select // Assuming we have a common Select component
            label="HR Status Filter"
            name="status_filter"
            value={searchParams.status_filter || 'unmapped'}
            onChange={handleInputChange}
            options={[
              { value: 'unmapped', label: 'Unmapped (Active)' },
              { value: 'mapped', label: 'Mapped (to an Admin)' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'all', label: 'All Statuses' },
            ]}
            className={styles.formInput}
          />
          <Button type="submit" isLoading={isLoadingResults} className={styles.searchButton}>
            Search HRs
          </Button>
        </form>

        {queryError && <p className={styles.error}>Error fetching HR profiles: {queryError.message}</p>}

        {isLoadingResults && <p>Loading HR profiles...</p>}

        {!isLoadingResults && hrResults && (
          <div className={styles.resultsContainer}>
            <h2>Search Results ({hrResults.length})</h2>
            {hrResults.length === 0 ? <p>No HR profiles found matching your criteria.</p> : (
              <ul className={styles.resultsList}>
                {hrResults.map(hr => (
                  <li key={hr.id} className={styles.resultItem}>
                    <h3>{hr.username} ({hr.email})</h3>
                    <p>Company: {hr.company || 'N/A'}</p>
                    <p>Years of Experience: {hr.years_of_experience ?? 'N/A'}</p>
                    <p>Status: {hr.hr_status}</p>
                    <Button
                      onClick={() => handleSendInvitation(hr.id)}
                      isLoading={sendInvitationMutation.isPending && sendInvitationMutation.variables === hr.id}
                      disabled={sendInvitationMutation.isPending || actionStatus[hr.id]?.type === 'success'}
                      size="small"
                    >
                      {actionStatus[hr.id]?.type === 'success' ? 'Invited' : 'Send Mapping Invitation'}
                    </Button>
                    {actionStatus[hr.id] && (
                      <p className={`${styles.actionMessage} ${actionStatus[hr.id].type === 'error' ? styles.error : styles.success}`}>
                        {actionStatus[hr.id].message}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <Link to="/admin/dashboard" className={styles.backLink}>Back to Dashboard</Link>
      </div>
    // </MainLayout> // Removed MainLayout wrapper
  );
};

export default AdminSearchHRPage;
