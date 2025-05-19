import React, { useState } from 'react'; // useEffect removed as it's not used
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminConnectionManager from '../components/AdminConnectionManager';
import styles from './ManageAdminConnectionsPage.module.css';
import hrService, { 
    type AdminBasicOut as AdminUser, 
    type HRApplicationWithAdminName, 
    type HRMappingRequestFromAdmin,
    type HrProfileOut,
    type HRMappingRequest, // For applyToAdmin return type
    type RequestMappingStatusType // Import the new status type
} from '../../../services/hrService';
import AlertMessage from '../../../components/common/AlertMessage';
import Spinner from '../../../components/common/Spinner';
import { useAuth } from '../../../contexts/AuthContext';

// These types are defined locally to match what AdminConnectionManager expects.
// The data from hrService will be mapped to these.
// These should align with the prop types in AdminConnectionManager.tsx
interface ApplicationForManager {
  id: string;
  adminId: string; 
  adminName: string; 
  dateSent: string; 
  status: RequestMappingStatusType; // Use the imported RequestMappingStatusType
}

interface AdminRequestForManager {
  id: string;
  adminName: string; 
  dateReceived: string; 
  requester_id: string; 
  // status: 'pending'; // Status is implicit for incoming requests in AdminConnectionManager
}

type HrProfileForMapping = Pick<HrProfileOut, "hr_status" | "admin_manager_id" | "admin_manager_name"> | null; 

const ADMIN_CONNECTIONS_QUERY_KEY_BASE = 'adminConnections';

const ManageAdminConnectionsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { currentUser, isLoading: isLoadingAuth } = useAuth();
  
  const [generalError, setGeneralError] = useState<string | null>(null);
  // const [generalSuccess, setGeneralSuccess] = useState<string | null>(null); // Replaced by direct alerts or notifications

  // Fetch all necessary data using React Query
  const { data: profileData, isLoading: isLoadingProfile, error: profileError } = useQuery<HrProfileOut, Error>({
    queryKey: ['hrProfileDetails', currentUser?.id], 
    queryFn: hrService.getProfileDetails,
    enabled: !!currentUser && !isLoadingAuth,
  });

  const { data: availableAdminsData, isLoading: isLoadingAdmins, error: adminsError } = useQuery<AdminUser[], Error>({
    queryKey: [ADMIN_CONNECTIONS_QUERY_KEY_BASE, 'availableAdmins'],
    queryFn: hrService.listAdmins,
    enabled: !!currentUser && !isLoadingAuth,
  });

  const { data: myApplicationsData, isLoading: isLoadingMyApps, error: myAppsError } = useQuery<HRApplicationWithAdminName[], Error>({
    queryKey: [ADMIN_CONNECTIONS_QUERY_KEY_BASE, 'myApplications', currentUser?.id],
    queryFn: hrService.getHrApplications,
    enabled: !!currentUser && !isLoadingAuth,
  });

  const { data: incomingRequestsData, isLoading: isLoadingIncomingReqs, error: incomingReqsError } = useQuery<HRMappingRequestFromAdmin[], Error>({
    queryKey: [ADMIN_CONNECTIONS_QUERY_KEY_BASE, 'incomingRequests', currentUser?.id],
    queryFn: hrService.getPendingAdminRequests,
    enabled: !!currentUser && !isLoadingAuth,
  });

  const { data: adminApprovedApplicationsData, isLoading: isLoadingAdminApprovedApps, error: adminApprovedAppsError } = useQuery<ApplicationForManager[], Error>({
    queryKey: [ADMIN_CONNECTIONS_QUERY_KEY_BASE, 'adminApprovedApplications', currentUser?.id],
    queryFn: async (): Promise<ApplicationForManager[]> => {
        const rawApps = await hrService.getAdminApprovedApplications(); // This returns HRMappingRequest[]
        const adminIds = rawApps.map(app => app.target_id).filter((id, index, self) => self.indexOf(id) === index);
        let admins: AdminUser[] = [];
        if (adminIds.length > 0) {
            admins = await hrService.listAdmins();
        }
        return rawApps.map(app => {
            const admin = admins.find(a => a.id === app.target_id);
            return {
                id: app.id,
                adminId: app.target_id,
                adminName: admin?.username || app.target_info?.username || 'Unknown Admin',
                dateSent: app.created_at, // Or app.updated_at if more relevant for approval date
                status: app.status,
            };
        });
    },
    enabled: !!currentUser && !isLoadingAuth && profileData?.hr_status !== 'mapped', // Only fetch if not mapped
  });

  const invalidateConnectionQueries = () => {
    queryClient.invalidateQueries({ queryKey: [ADMIN_CONNECTIONS_QUERY_KEY_BASE] });
    // Explicitly invalidate myApplications to ensure it's refetched
    queryClient.invalidateQueries({ queryKey: [ADMIN_CONNECTIONS_QUERY_KEY_BASE, 'myApplications', currentUser?.id] });
    queryClient.invalidateQueries({ queryKey: ['hrProfileDetails', currentUser?.id] }); // Also refetch profile as mapping status changes
  };

  const { mutate: applyToAdminMutate, isPending: isApplying } = useMutation<HRMappingRequest, Error, string>({
    mutationFn: hrService.applyToAdmin,
    onSuccess: () => {
      alert("Application sent successfully!"); // Using alert for now
      invalidateConnectionQueries();
      setGeneralError(null);
    },
    onError: (error) => setGeneralError("Failed to send application: " + error.message),
  });

  const { mutate: acceptRequestMutate, isPending: isAccepting } = useMutation<HrProfileOut, Error, string>({
    mutationFn: hrService.acceptAdminRequest,
    onSuccess: () => {
      alert("Admin request accepted successfully!");
      invalidateConnectionQueries();
      setGeneralError(null);
    },
    onError: (error) => setGeneralError("Failed to accept request: " + error.message),
  });

  const { mutate: rejectRequestMutate, isPending: isRejecting } = useMutation<{ message: string }, Error, string>({
    mutationFn: hrService.rejectAdminRequest,
    onSuccess: (data) => {
      alert(data.message || "Request rejected.");
      invalidateConnectionQueries();
      setGeneralError(null);
    },
    onError: (error) => setGeneralError("Failed to reject request: " + error.message),
  });

  const { mutate: unmapAdminMutate, isPending: isUnmapping } = useMutation<HrProfileOut, Error, void>({
    mutationFn: () => hrService.unmapFromAdmin(),
    onSuccess: () => {
      alert("Successfully unmapped from admin.");
      invalidateConnectionQueries();
      setGeneralError(null);
    },
    onError: (error) => setGeneralError("Failed to unmap: " + error.message),
  });

  const { mutate: confirmChoiceMutate, isPending: isConfirmingChoice } = useMutation<HrProfileOut, Error, string>({
    mutationFn: hrService.confirmAdminChoice,
    onSuccess: () => {
      alert("Successfully confirmed connection with Admin!");
      invalidateConnectionQueries();
      setGeneralError(null);
    },
    onError: (error) => setGeneralError("Failed to confirm choice: " + error.message),
  });

  const { mutate: cancelAppMutate, isPending: isCancellingApp } = useMutation<HRMappingRequest, Error, string>({
    mutationFn: hrService.cancelApplication,
    onSuccess: () => {
      alert("Application cancelled successfully.");
      invalidateConnectionQueries();
      setGeneralError(null);
    },
    onError: (error) => setGeneralError("Failed to cancel application: " + error.message),
  });

  const handleSendApplication = (adminId: string) => applyToAdminMutate(adminId);
  const handleAcceptRequest = (requestId: string) => acceptRequestMutate(requestId);
  const handleRejectRequest = (requestId: string) => rejectRequestMutate(requestId);
  const handleConfirmAdminChoice = (requestId: string) => confirmChoiceMutate(requestId);
  const handleCancelApplication = (requestId: string) => cancelAppMutate(requestId);
  
  const handleUnmap = () => {
    if (window.confirm("Are you sure you want to unmap from the current admin?")) {
      unmapAdminMutate();
    }
  };
  
  const actionInProgress = isApplying || isAccepting || isRejecting || isUnmapping || isConfirmingChoice || isCancellingApp;

  const overallLoading = isLoadingAuth || isLoadingProfile || isLoadingAdmins || isLoadingMyApps || isLoadingIncomingReqs || isLoadingAdminApprovedApps;
  const overallErrorMessage = profileError?.message || adminsError?.message || myAppsError?.message || incomingReqsError?.message || adminApprovedAppsError?.message || generalError;

  if (overallLoading) {
    return <div className={styles.pageContainer} style={{ textAlign: 'center', paddingTop: '50px' }}><Spinner size="large" /><p>Loading connections...</p></div>;
  }
  
  const hrProfileStatusForManager: HrProfileForMapping = profileData ? {
    hr_status: profileData.hr_status,
    admin_manager_id: profileData.admin_manager_id,
    admin_manager_name: profileData.admin_manager_name,
  } : null;

  const currentMappingDetails: AdminUser | null = 
    (profileData?.hr_status === 'mapped' && profileData.admin_manager_id && availableAdminsData)
    ? availableAdminsData.find(admin => admin.id === profileData.admin_manager_id) || 
      (profileData.admin_manager_name ? {id: profileData.admin_manager_id, username: profileData.admin_manager_name, email: ''} : null)
    : null;


  const applicationsForManager: ApplicationForManager[] = (myApplicationsData || []).map(app => ({
    id: app.id,
    adminId: app.target_id, 
    adminName: app.admin_name, 
    dateSent: app.created_at, 
    status: app.status
  }));

  const requestsForManager: AdminRequestForManager[] = (incomingRequestsData || []).map(req => ({
    id: req.id,
    adminName: req.requester_name, 
    dateReceived: req.created_at, 
    requester_id: req.requester_id 
  }));

  return (
    <div className={styles.pageContainer}>
      <header className={styles.pageHeader}>
        <h1>Manage Admin Connections</h1>
      </header>
      {overallErrorMessage && (
        <AlertMessage type="error" message={overallErrorMessage} closable onClose={() => setGeneralError(null)} />
      )}
      <AdminConnectionManager
        availableAdmins={availableAdminsData || []}
        myApplications={applicationsForManager}
        incomingRequests={requestsForManager}
        adminApprovedApplications={adminApprovedApplicationsData || []} // Pass new data
        currentMapping={currentMappingDetails}
        hrProfileStatus={hrProfileStatusForManager}
        onSendApplication={handleSendApplication}
        onAcceptRequest={handleAcceptRequest}
        onRejectRequest={handleRejectRequest}
        onConfirmAdminChoice={handleConfirmAdminChoice} // Pass new handler
        onCancelApplication={handleCancelApplication} // Pass new handler
        onUnmap={handleUnmap}
        actionInProgress={actionInProgress}
      />
    </div>
  );
};

export default ManageAdminConnectionsPage;
