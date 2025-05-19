import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../../../components/layout/MainLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { getAllUsers, sendCandidateInterviewInvitation } from '../../../services/adminAPI'; 
import type { UserManagementInfo } from '../../../services/adminAPI'; // CandidateInterviewInvitationResponse removed
// import type { Role } from '../../../services/authAPI'; // Role type no longer needed here
import styles from './UserManagementPage.module.css'; // Will need to rename this CSS module later if desired
import Button from '../../../components/common/Button/Button'; 
// import Select from '../../../components/common/Select/Select';

const CandidateManagementPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<UserManagementInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Default role filter to 'candidate'
  const [filters, setFilters] = useState<{ searchTerm: string; role: string; isActive: string; hrStatus: string }>({ searchTerm: '', role: 'candidate', isActive: 'all', hrStatus: 'all' });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0); 
  const [totalUsers, setTotalUsers] = useState(0); 
  const itemsPerPage = 10;
  const [invitationStatus, setInvitationStatus] = useState<Record<string, { message: string; type: 'success' | 'error' | 'loading' }>>({});

  const fetchData = useCallback(async (page: number = 1) => {
    if (!currentUser || currentUser.role !== 'admin') return;
    setIsLoading(true);
    setError(null);
    try {
      const params: { search_term?: string; role?: string; is_active?: boolean; hr_status?: string; limit?: number; skip?: number } = {
        limit: itemsPerPage,
        skip: (page - 1) * itemsPerPage,
      };
      if (filters.searchTerm) params.search_term = filters.searchTerm;
      // Ensure role is always set, defaulting to 'candidate' if 'all' is somehow selected by manipulation
      params.role = filters.role === 'all' ? 'candidate' : filters.role; 
      if (filters.isActive !== 'all') params.is_active = filters.isActive === 'true';
      // hrStatus filter is not relevant for candidates, so it's fine as is.
      
      const data = await getAllUsers(params); 
      setUsers(data); 
      setTotalUsers(data.length);
      setTotalPages(1); 
      setCurrentPage(1); 
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to load users.');
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, filters, itemsPerPage, setIsLoading, setError, setUsers, setTotalUsers, setTotalPages, setCurrentPage]);

  useEffect(() => {
    // Automatically fetch data with default filter (candidate) on component mount
    fetchData(1);
  }, [fetchData]); // Removed currentPage from dependency array to prevent re-fetch on page change before filters are applied by user

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // If role is changed away from candidate, allow it. If it's changed to 'all', default back to 'candidate'.
    const newRole = (name === 'role' && value === 'all') ? 'candidate' : value;
    setFilters(prev => ({ ...prev, [name]: name === 'role' ? newRole : value }));
    setCurrentPage(1); 
  };
  
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(1); 
  };

  const handlePageChange = (newPage: number) => {
    fetchData(newPage);
  };

  const handleSendInterviewInvitation = async (candidateId: string, candidateName: string) => {
    console.log(`Attempting to send interview invitation to ${candidateName} (ID: ${candidateId})`);
    setInvitationStatus(prev => ({ ...prev, [candidateId]: { message: 'Sending...', type: 'loading' } }));
    try {
      const response = await sendCandidateInterviewInvitation(candidateId);
      setInvitationStatus(prev => ({ ...prev, [candidateId]: { message: response.message || 'Invitation sent successfully!', type: 'success' } }));
      // Optionally, display response.invitation_link if provided and useful
    } catch (err) {
      const error = err as Error;
      setInvitationStatus(prev => ({ ...prev, [candidateId]: { message: error.message || 'Failed to send invitation.', type: 'error' } }));
    }
  };

  if (isLoading && users.length === 0) {
    return <MainLayout><div>Loading Candidate Management...</div></MainLayout>;
  }

  if (error && users.length === 0) {
    return <MainLayout><div className={styles.error}>{error}</div></MainLayout>;
  }

  return (
    <MainLayout>
      <div className={styles.userManagementContainer}> {/* Consider renaming CSS class too */}
        <h1>Candidate Management</h1>
        {error && <p className={styles.errorMessage}>{error}</p>}

        <form onSubmit={handleSearchSubmit} className={styles.filters}>
          <div className={styles.filterControls}>
            <div className={styles.formGroup}>
              <label htmlFor="searchTerm">Search by Username/Email:</label>
            <input
              type="text"
              id="searchTerm"
              name="searchTerm"
              value={filters.searchTerm}
              onChange={handleInputChange}
              placeholder="Enter username or email"
            />
          </div>
          {/* Role filter could be hidden or locked to 'candidate' if this page is strictly for candidates */}
          <div className={styles.formGroup}>
            <label htmlFor="roleFilter">Filter by Role:</label>
            <select id="roleFilter" name="role" value={filters.role} onChange={handleInputChange}>
              <option value="candidate">Candidate</option>
              {/* Optionally allow viewing other roles, or remove this filter */}
              <option value="hr">HR</option> 
              <option value="all">All Roles (Defaults to Candidate)</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="statusFilter">Filter by Status:</label>
            <select id="statusFilter" name="isActive" value={filters.isActive} onChange={handleInputChange}>
              <option value="all">All Statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          {/* HR Status filter is not applicable if we are focusing on candidates */}
          {filters.role === 'hr' && ( // This block can be removed if page is candidate-only
            <div className={styles.formGroup}>
              <label htmlFor="hrStatusFilter">Filter by HR Status:</label>
              <select id="hrStatusFilter" name="hrStatus" value={filters.hrStatus} onChange={handleInputChange}>
                <option value="all">All HR Statuses</option>
                <option value="pending_profile">Pending Profile</option>
                <option value="profile_complete">Profile Complete</option>
                <option value="pending_mapping_approval">Pending Mapping Approval</option>
                <option value="mapped">Mapped</option>
              </select>
            </div>
          )}
          <Button type="submit" variant="primary" className={styles.searchButton}>Search/Filter</Button>
          </div>
        </form>

        {isLoading && <p>Loading candidates...</p>}
        {!isLoading && users.length === 0 && <p>No candidates found matching the criteria.</p>}
        
        {users.length > 0 && (
          <table className={styles.usersTable}>
            <thead>
              <tr>
                <th>User ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>
                    <span className={user.is_active ? styles.activeStatus : styles.inactiveStatus}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td>{user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'N/A'}</td>
                  <td className={styles.actionsCell}>
                    <Link to={`/admin/users/${user.id}`} className={styles.actionLinkButton}> {/* This link will need to be updated if route changes */}
                      View Details
                    </Link>
                    {/* Placeholder for "Send Interview Invitation" button */}
                    {user.role === 'candidate' && (
                      <div style={{ marginTop: '5px' }}>
                        <Button 
                          onClick={() => handleSendInterviewInvitation(user.id, user.username)} 
                          variant="secondary" 
                          size="small"
                          disabled={invitationStatus[user.id]?.type === 'loading' || invitationStatus[user.id]?.type === 'success'}
                        >
                          {invitationStatus[user.id]?.type === 'loading' ? 'Sending...' : 
                           invitationStatus[user.id]?.type === 'success' ? 'Invited' : 'Send Invitation'}
                        </Button>
                        {invitationStatus[user.id] && (
                          <p style={{ fontSize: '0.8em', color: invitationStatus[user.id].type === 'error' ? 'red' : 'green', marginTop: '4px' }}>
                            {invitationStatus[user.id].message}
                          </p>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className={styles.paginationControls}>
          <Button 
            onClick={() => handlePageChange(currentPage - 1)} 
            disabled={currentPage === 1 || isLoading}
          >
            Previous
          </Button>
          <span className={styles.pageInfo}>
            Page {currentPage} of {totalPages} (Total Users: {totalUsers})
          </span>
          <Button 
            onClick={() => handlePageChange(currentPage + 1)} 
            disabled={currentPage === totalPages || isLoading}
          >
            Next
          </Button>
        </div>
        
        <Link to="/admin/dashboard" className={styles.backLink}>Back to Dashboard</Link>
      </div>
    </MainLayout>
  );
};

export default CandidateManagementPage;
