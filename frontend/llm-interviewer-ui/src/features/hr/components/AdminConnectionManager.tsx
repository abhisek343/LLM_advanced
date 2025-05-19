import React, { useState } from 'react';
import styles from './AdminConnectionManager.module.css'; 
import Button from '../../../components/common/Button'; 
import Table from '../../../components/common/Table'; 
import Card from '../../../components/common/Card'; // Import Card component
import type { RequestMappingStatusType } from '../../../services/hrService'; // Import the status type

// Local mock Button removed.

interface AdminUser {
  id: string;
  username: string; 
  email: string;
}

// These types should now match what ManageAdminConnectionsPage provides after mapping
interface Application { 
  id: string;
  adminId: string; 
  adminName: string; 
  dateSent: string; 
  status: RequestMappingStatusType; // Use the imported status type
}

interface AdminRequest { 
  id: string;
  adminName: string; 
  dateReceived: string; 
  requester_id: string; // Keep requester_id if needed for actions, though not directly displayed in this version
  // status: 'pending'; // Status is implicit for incoming requests shown here
}

// This type should align with HrProfileOut.hr_status from hrService.ts
// Updated to match hrService.HrStatusType
export type HrStatusType = 
  | "pending_profile" 
  | "profile_complete" 
  | "application_pending" 
  | "admin_request_pending" 
  | "mapped"
  | "unmapped"; // Added unmapped

interface HrProfileForMappingStatus {
    hr_status: HrStatusType; 
    admin_manager_id?: string | null; 
    admin_manager_name?: string | null; 
}

interface AdminConnectionManagerProps {
  availableAdmins: AdminUser[];
  myApplications: Application[];
  incomingRequests: AdminRequest[];
  adminApprovedApplications: Application[]; // New prop
  currentMapping: AdminUser | null;
  hrProfileStatus: HrProfileForMappingStatus | null; 
  onSendApplication: (adminId: string) => void;
  onAcceptRequest: (requestId: string) => void;
  onRejectRequest: (requestId: string) => void;
  onConfirmAdminChoice: (requestId: string) => void; // New prop
  onCancelApplication: (requestId: string) => void; // New prop
  onUnmap: () => void;
  actionInProgress?: boolean; 
}

type ActiveTab = 'findAdmins' | 'myApplications' | 'incomingRequests' | 'adminApprovals'; // Added new tab

const AdminConnectionManager: React.FC<AdminConnectionManagerProps> = ({
  availableAdmins,
  myApplications,
  incomingRequests,
  adminApprovedApplications, // Consumed new prop
  currentMapping,
  hrProfileStatus, 
  onSendApplication,
  onAcceptRequest,
  onRejectRequest,
  onConfirmAdminChoice, // Consumed new prop
  onCancelApplication, // Consumed new prop
  onUnmap,
  actionInProgress, 
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('findAdmins');
  // TODO: Implement search/filter state for Find Admins if needed

  const canApply = hrProfileStatus?.hr_status === 'profile_complete' || hrProfileStatus?.hr_status === 'pending_profile';
  const canAccept = hrProfileStatus?.hr_status !== 'mapped';

  return (
    <div className={styles.managerContainer}>
      <Card title="Current Mapping Status" className={styles.statusCard}>
        <div className={styles.currentMappingSection}>
          {currentMapping ? (
            <>
              <p>Currently mapped to: <strong>{currentMapping.username}</strong> ({currentMapping.email})</p>
              <Button onClick={onUnmap} className={styles.unmapButton} disabled={actionInProgress} variant="danger" size="small">
                {actionInProgress ? 'Processing...' : 'Unmap from Admin'}
              </Button>
            </>
          ) : (
            <p>
              {hrProfileStatus?.hr_status === 'application_pending' 
                ? "Your application to an Admin is pending." 
                : "You are not currently mapped to an Admin."}
            </p>
          )}
        </div>
      </Card>

      <div className={styles.tabs}>
        <Button
          onClick={() => setActiveTab('findAdmins')}
          className={activeTab === 'findAdmins' ? styles.activeTabButton : styles.tabButton}
        >
          Find Admins
        </Button>
        <Button
          onClick={() => setActiveTab('myApplications')}
          className={activeTab === 'myApplications' ? styles.activeTabButton : styles.tabButton}
        >
          My Applications ({myApplications.length})
        </Button>
        <Button
          onClick={() => setActiveTab('incomingRequests')}
          className={activeTab === 'incomingRequests' ? styles.activeTabButton : styles.tabButton}
        >
          Incoming Requests ({incomingRequests.length})
        </Button>
        {(adminApprovedApplications.length > 0 && hrProfileStatus?.hr_status !== 'mapped') && (
          <Button
            onClick={() => setActiveTab('adminApprovals')}
            className={activeTab === 'adminApprovals' ? styles.activeTabButton : styles.tabButton}
          >
            Admin Approvals ({adminApprovedApplications.length})
          </Button>
        )}
      </div>

      <div className={styles.tabContent}>
        {activeTab === 'findAdmins' && (
          <Card title="Available Admins" className={styles.tabCard}>
            {/* TODO: Add search/filter input here */}
            <Table<AdminUser>
              columns={[
                { title: 'Admin Name', key: 'username', render: (item) => <strong>{item.username}</strong> },
                { title: 'Email', key: 'email' },
                { title: 'Actions', key: 'actions', render: (item) => {
                    const existingApplicationToThisAdmin = myApplications.find(
                        app => app.adminId === item.id && app.status === 'pending_admin_approval'
                    );

                    let buttonText: string;
                    let isButtonDisabled: boolean = false; // Initialize and change to let

                    if (existingApplicationToThisAdmin) {
                        buttonText = 'Application Pending';
                        isButtonDisabled = true; 
                    } else if (currentMapping) { // Removed !!
                        // If already mapped, the button for other admins should be disabled.
                        buttonText = 'Send Application'; 
                        isButtonDisabled = true; 
                    } else if (actionInProgress) {
                        // This assumes actionInProgress is a general flag for any such action.
                        buttonText = 'Sending...';
                        isButtonDisabled = true;
                    } else {
                        buttonText = 'Send Application';
                        isButtonDisabled = false; 
                    }

                    return (
                        <Button
                            onClick={() => onSendApplication(item.id)}
                            size="small"
                            disabled={isButtonDisabled}
                        >
                          {buttonText}
                        </Button>
                    );
                  }
                }
              ]}
              data={availableAdmins}
              emptyText="No admins available to connect with at the moment."
            />
             {currentMapping && <p className={styles.infoText}>You must unmap from your current admin before applying to a new one.</p>}
             {!currentMapping && !canApply && <p className={styles.infoText}>Please complete your HR profile before applying to an Admin.</p>}
          </Card>
        )}

        {activeTab === 'myApplications' && (
          <Card title="My Sent Applications" className={styles.tabCard}>
            <Table<Application>
              columns={[
                { title: 'Admin Name', key: 'adminName', render: (item) => <strong>{item.adminName}</strong> },
                { title: 'Date Sent', key: 'dateSent', render: (item) => new Date(item.dateSent).toLocaleDateString() },
                { title: 'Status', key: 'status', render: (item) => <span className={`${styles.status} ${styles[`status${item.status}`]}`}>{item.status}</span> },
                { title: 'Actions', key: 'actions', render: (item) => {
                    // Ensure item.id is valid before allowing cancellation
                    if (item.status === 'pending_admin_approval' && !currentMapping && item.id) {
                      return (
                        <Button 
                          onClick={() => {
                            if (item.id) { // Double check item.id before calling
                              onCancelApplication(item.id);
                            } else {
                              console.error("Attempted to cancel application with undefined ID:", item);
                              // Optionally, show an error to the user or disable button more explicitly
                            }
                          }} 
                          size="small" 
                          variant="secondary"
                          disabled={actionInProgress || !item.id} // Disable if no id
                        >
                          {actionInProgress ? 'Cancelling...' : 'Cancel Application'}
                        </Button>
                      );
                    }
                    return null;
                  }
                }
              ]}
              data={myApplications}
              emptyText="You have not sent any applications to Admins."
            />
          </Card>
        )}

        {activeTab === 'adminApprovals' && (
          <Card title="Applications Approved by Admins" className={styles.tabCard}>
            <p className={styles.infoText}>Admins listed below have approved your application. Choose one to confirm your connection.</p>
            <Table<Application>
              columns={[
                { title: 'Admin Name', key: 'adminName', render: (item) => <strong>{item.adminName}</strong> },
                { title: 'Date Approved (approx)', key: 'dateSent', render: (item) => new Date(item.dateSent).toLocaleDateString() }, // Assuming dateSent is close enough or use updated_at
                { title: 'Actions', key: 'actions', render: (item) => (
                    !currentMapping ? (
                      <Button 
                        onClick={() => onConfirmAdminChoice(item.id)} 
                        size="small"
                        variant="primary" // Changed from success
                        disabled={actionInProgress}
                      >
                        {actionInProgress ? 'Confirming...' : 'Confirm Connection'}
                      </Button>
                    ) : null
                  )
                }
              ]}
              data={adminApprovedApplications.filter(app => app.status === 'admin_approved')}
              emptyText="No admin approvals awaiting your confirmation."
            />
            {currentMapping && <p className={styles.infoText}>You are already mapped to an Admin. Unmap first if you wish to change.</p>}
          </Card>
        )}

        {activeTab === 'incomingRequests' && (
          <Card title="Incoming Requests from Admins" className={styles.tabCard}>
            <Table<AdminRequest>
              columns={[
                { title: 'From Admin', key: 'adminName', render: (item) => <strong>{item.adminName}</strong> },
                { title: 'Date Received', key: 'dateReceived', render: (item) => new Date(item.dateReceived).toLocaleDateString() },
                { title: 'Actions', key: 'actions', render: (item) => (
                    <div className={styles.buttonGroup}>
                      <Button 
                        onClick={() => onAcceptRequest(item.id)} 
                        size="small"
                        variant="primary" 
                        disabled={actionInProgress || !canAccept || Boolean(currentMapping)}
                      >
                        {actionInProgress ? 'Accepting...' : 'Accept'}
                      </Button>
                      <Button 
                        onClick={() => onRejectRequest(item.id)} 
                        size="small"
                        variant="danger" 
                        disabled={actionInProgress}
                      >
                        {actionInProgress ? 'Rejecting...' : 'Reject'}
                      </Button>
                    </div>
                  )
                }
              ]}
              data={incomingRequests} // Add data prop
              emptyText="No incoming connection requests from Admins."
            />
            {currentMapping && <p className={styles.infoText}>You must unmap from your current admin before accepting a new connection.</p>}
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminConnectionManager;
