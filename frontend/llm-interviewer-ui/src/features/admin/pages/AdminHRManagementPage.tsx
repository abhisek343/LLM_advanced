import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../../../components/layout/MainLayout';
import { useAuth } from '../../../contexts/AuthContext';
import AdminSearchHRPage from './AdminSearchHRPage'; // For one of the tabs
import { 
  getPendingHRApplications, 
  approveHRApplication, 
  rejectHRApplication,
  getMappedHrsForAdmin,
  unmapHrFromAdmin,
  getSentMappingRequestsByAdmin,
} from '../../../services/adminAPI';
import type { HRApplicationForAdmin, UserManagementInfo, SentMappingRequest } from '../../../services/adminAPI';
import styles from './AdminHRManagementPage.module.css';
import Button from '../../../components/common/Button'; // Adjusted path if Button is in common/Button/Button.tsx

type ActiveTab = 'acceptInvitations' | 'searchInvite' | 'mappedHRs' | 'sentRequests';

const AdminHRManagementPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('acceptInvitations');
  const [pendingHRApps, setPendingHRApps] = useState<HRApplicationForAdmin[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [appsError, setAppsError] = useState<string | null>(null);
  
  const [mappedHRs, setMappedHRs] = useState<UserManagementInfo[]>([]);
  const [isLoadingMappedHRs, setIsLoadingMappedHRs] = useState(false);
  const [mappedHRsError, setMappedHRsError] = useState<string | null>(null);

  const [sentRequests, setSentRequests] = useState<SentMappingRequest[]>([]);
  const [isLoadingSentRequests, setIsLoadingSentRequests] = useState(false);
  const [sentRequestsError, setSentRequestsError] = useState<string | null>(null);

  const [actionStatus, setActionStatus] = useState<Record<string, string>>({}); // For approve/reject/unmap

  const fetchPendingApps = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'admin') return;
    setIsLoadingApps(true);
    setAppsError(null);
    try {
      const hrApplications = await getPendingHRApplications();
      console.log("Fetched Pending HR Applications:", JSON.stringify(hrApplications, null, 2)); // Log fetched data
      setPendingHRApps(hrApplications);
    } catch (err) {
      const error = err as Error;
      setAppsError(error.message || 'Failed to load pending HR applications.');
    } finally {
      setIsLoadingApps(false);
    }
  }, [currentUser, setIsLoadingApps, setAppsError, setPendingHRApps]);

  const fetchMappedHRs = useCallback(async (adminId: string) => {
    setIsLoadingMappedHRs(true);
    setMappedHRsError(null);
    try {
      const data = await getMappedHrsForAdmin(adminId);
      setMappedHRs(data);
    } catch (err) {
      const error = err as Error;
      setMappedHRsError(error.message || 'Failed to load mapped HRs.');
    } finally {
      setIsLoadingMappedHRs(false);
    }
  }, [setIsLoadingMappedHRs, setMappedHRsError, setMappedHRs]);

  const fetchSentRequests = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'admin') return;
    setIsLoadingSentRequests(true);
    setSentRequestsError(null);
    try {
      const data = await getSentMappingRequestsByAdmin();
      setSentRequests(data);
    } catch (err) {
      const error = err as Error;
      setSentRequestsError(error.message || 'Failed to load sent mapping requests.');
    } finally {
      setIsLoadingSentRequests(false);
    }
  }, [currentUser, setIsLoadingSentRequests, setSentRequestsError, setSentRequests]);

  useEffect(() => {
    if (activeTab === 'acceptInvitations') {
      fetchPendingApps();
    } else if (activeTab === 'mappedHRs' && currentUser) {
      fetchMappedHRs(currentUser.id);
    } else if (activeTab === 'sentRequests') {
      fetchSentRequests();
    }
  }, [currentUser, activeTab, fetchPendingApps, fetchMappedHRs, fetchSentRequests]);

  const handleApproveHR = async (requestId: string) => {
    // Ensure requestId (app._id) is valid before proceeding
    console.log(`handleApproveHR called with requestId: ${requestId}`);
    if (!requestId) {
      console.error("handleApproveHR: Error - requestId is undefined or null.");
      setActionStatus(prev => ({ ...prev, [requestId || 'undefined_id']: `Error: Invalid application ID.` }));
      return;
    }
    console.log(`Setting action status to 'Processing...' for ${requestId}`);
    setActionStatus(prev => ({ ...prev, [requestId]: 'Processing...' }));
    try {
      console.log(`Calling approveHRApplication API for ${requestId}`);
      const response = await approveHRApplication(requestId); // API expects the request_id (_id)
      console.log(`approveHRApplication API response for ${requestId}:`, response);
      setActionStatus(prev => ({ ...prev, [requestId]: 'Approved!' }));
      console.log(`Action status set to 'Approved!' for ${requestId}. Refreshing lists.`);
      fetchPendingApps(); // Refresh pending apps list
      if (currentUser) {
        fetchMappedHRs(currentUser.id); // Refresh mapped HRs list
      }
      fetchSentRequests(); // Refresh sent requests list
    } catch (err) {
      const error = err as Error;
      console.error(`Error in handleApproveHR for ${requestId}:`, error);
      setActionStatus(prev => ({ ...prev, [requestId]: `Error: ${error.message || 'Failed to approve'}` }));
    }
  };

  const handleRejectHR = async (requestId: string) => {
    console.log(`handleRejectHR called with requestId: ${requestId}`);
    if (!requestId) {
      console.error("handleRejectHR: Error - requestId is undefined or null.");
      setActionStatus(prev => ({ ...prev, [requestId || 'undefined_id']: `Error: Invalid application ID.` }));
      return;
    }
    console.log(`Setting action status to 'Processing...' for ${requestId} (reject)`);
    setActionStatus(prev => ({ ...prev, [requestId]: 'Processing...' }));
    try {
      console.log(`Calling rejectHRApplication API for ${requestId}`);
      const response = await rejectHRApplication(requestId);
      console.log(`rejectHRApplication API response for ${requestId}:`, response);
      setActionStatus(prev => ({ ...prev, [requestId]: 'Rejected.' }));
      console.log(`Action status set to 'Rejected!' for ${requestId}. Refreshing lists.`);
      fetchPendingApps(); // Refresh pending apps list
      fetchSentRequests(); // Refresh sent requests list
    } catch (err) {
      const error = err as Error;
      console.error(`Error in handleRejectHR for ${requestId}:`, error);
      setActionStatus(prev => ({ ...prev, [requestId]: `Error: ${error.message || 'Failed to reject'}` }));
    }
  };

  const handleUnmapHR = async (hrUserId: string) => {
    if (!window.confirm(`Are you sure you want to unmap HR ${hrUserId}?`)) return;
    setActionStatus(prev => ({ ...prev, [hrUserId]: 'Processing...' }));
    try {
      await unmapHrFromAdmin(hrUserId);
      setActionStatus(prev => ({ ...prev, [hrUserId]: 'Unmapped successfully.' }));
      if (currentUser) fetchMappedHRs(currentUser.id); // Refresh mapped HRs list
      // Unmapping might also affect pending applications or sent requests if the HR reappears
      fetchPendingApps();
      fetchSentRequests();
    } catch (err) {
      const error = err as Error;
      setActionStatus(prev => ({ ...prev, [hrUserId]: `Error unmapping: ${error.message}` }));
    }
  };

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'acceptInvitations':
        return (
          <section>
            <h2>Accept HR Invitations</h2>
            {isLoadingApps && <p>Loading invitations...</p>}
            {appsError && <p className={styles.errorMessage}>{appsError}</p>}
            {!isLoadingApps && !appsError && pendingHRApps.length > 0 ? (
              <ul className={styles.list}>
                {pendingHRApps.map(app => (
                  <li key={app._id} className={styles.listItem}>
                    <div>
                      <p><strong>HR Username:</strong> {app.requester_info?.username || 'N/A'}</p>
                      <p><strong>Email:</strong> {app.requester_info?.email || 'N/A'}</p>
                      <p><strong>Company:</strong> {app.requester_info?.company || 'N/A'}</p> {/* Assuming company might be added to requester_info */}
                      <p><strong>Applied on:</strong> {new Date(app.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className={styles.actions}>
                      <Link to={`/admin/users/${app.requester_info?.id}`} className={styles.actionLinkButton} target="_blank" rel="noopener noreferrer">View Profile</Link>
                      {!actionStatus[app._id] || actionStatus[app._id]?.startsWith('Error') ? (
                        <>
                          <Button onClick={() => handleApproveHR(app._id)} variant="primary" size="small">Accept</Button>
                          <Button onClick={() => handleRejectHR(app._id)} variant="danger" size="small">Decline</Button>
                        </>
                      ) : <p className={styles.statusMessage}>{actionStatus[app._id]}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              !isLoadingApps && !appsError && <p>No pending HR invitations to accept.</p>
            )}
          </section>
        );
      case 'searchInvite': {
        // Pass a callback to refresh relevant lists when an invitation is sent from AdminSearchHRPage
        const handleInvitationSent = () => {
          fetchSentRequests();
          // Potentially fetchPendingApps if an invite converts to an application or similar logic
        };
        return <AdminSearchHRPage onInvitationSent={handleInvitationSent} />;
      }
      case 'mappedHRs':
        return (
          <section>
            <h2>My Mapped HRs</h2>
            {isLoadingMappedHRs && <p>Loading mapped HRs...</p>}
            {mappedHRsError && <p className={styles.errorMessage}>{mappedHRsError}</p>}
            {!isLoadingMappedHRs && !mappedHRsError && mappedHRs.length > 0 ? (
              <ul className={styles.list}>
                {mappedHRs.map(hr => (
                  <li key={hr.id} className={styles.listItem}>
                    <div>
                      <p><strong>Username:</strong> {hr.username}</p>
                      <p><strong>Email:</strong> {hr.email}</p>
                      <p><strong>Company:</strong> {hr.company || 'N/A'}</p>
                      <p><strong>Status:</strong> {hr.hr_status || 'N/A'}</p>
                      {/* Assuming created_at of user can be a proxy for mapping date if no specific date is available */}
                      <p><strong>Mapped/Registered:</strong> {hr.created_at ? new Date(hr.created_at).toLocaleDateString() : 'N/A'}</p> 
                    </div>
                    <div className={styles.actions}>
                       <Link to={`/admin/users/${hr.id}`} className={styles.actionLinkButton} target="_blank" rel="noopener noreferrer">View Details</Link>
                      {!actionStatus[hr.id] || actionStatus[hr.id]?.startsWith('Error:') ? (
                        <Button onClick={() => handleUnmapHR(hr.id)} variant="danger" size="small">Unmap HR</Button>
                      ): <p className={styles.statusMessage}>{actionStatus[hr.id]}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              !isLoadingMappedHRs && !mappedHRsError && <p>No HRs currently mapped to you.</p>
            )}
          </section>
        );
      case 'sentRequests':
        return (
          <section>
            <h2>Sent Mapping Requests</h2>
            {isLoadingSentRequests && <p>Loading sent requests...</p>}
            {sentRequestsError && <p className={styles.errorMessage}>{sentRequestsError}</p>}
            {!isLoadingSentRequests && !sentRequestsError && sentRequests.length > 0 ? (
              <ul className={styles.list}>
                {sentRequests.map(req => (
                  <li key={req.id} className={styles.listItem}>
                    <div>
                      <p><strong>To HR:</strong> {req.hr_username || req.hr_user_id} ({req.hr_email || 'N/A'})</p>
                      <p><strong>Date Sent:</strong> {new Date(req.date_sent).toLocaleDateString()}</p>
                      <p><strong>Status:</strong> {req.status}</p>
                    </div>
                    {/* Add actions like "Cancel Request" if applicable */}
                  </li>
                ))}
              </ul>
            ) : (
              !isLoadingSentRequests && !sentRequestsError && <p>No mapping requests sent.</p>
            )}
          </section>
        );
      default:
        return null;
    }
  };

  return (
    <MainLayout>
      <div className={styles.hrManagementContainer}>
        <h1>HR Invitations & Mappings</h1>
        <div className={styles.tabs}>
          <button 
            onClick={() => setActiveTab('acceptInvitations')} 
            className={activeTab === 'acceptInvitations' ? styles.activeTab : ''}
          >
            Accept Invitations ({pendingHRApps.length})
          </button>
          <button 
            onClick={() => setActiveTab('searchInvite')} 
            className={activeTab === 'searchInvite' ? styles.activeTab : ''}
          >
            Search & Invite HRs
          </button>
          <button 
            onClick={() => setActiveTab('mappedHRs')} 
            className={activeTab === 'mappedHRs' ? styles.activeTab : ''}
          >
            My Mapped HRs ({mappedHRs.length})
          </button>
          <button 
            onClick={() => setActiveTab('sentRequests')} 
            className={activeTab === 'sentRequests' ? styles.activeTab : ''}
          >
            Sent Requests ({sentRequests.length})
          </button>
        </div>
        <div className={styles.tabContent}>
          {renderActiveTabContent()}
        </div>
        <Link to="/admin/dashboard" className={styles.backLink}>Back to Dashboard</Link>
      </div>
    </MainLayout>
  );
};

export default AdminHRManagementPage;
