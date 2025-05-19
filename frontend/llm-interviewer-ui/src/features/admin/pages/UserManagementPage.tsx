import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../../../components/layout/MainLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { getAllUsers } from '../../../services/adminAPI'; 
import type { UserManagementInfo } from '../../../services/adminAPI';
// import type { Role } from '../../../services/authAPI'; // Role type no longer needed here
import styles from './UserManagementPage.module.css';
import Button from '../../../components/common/Button/Button'; 
// import Select from '../../../components/common/Select/Select'; // Select might still be used for filters

const UserManagementPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<UserManagementInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<{ searchTerm: string; role: string; isActive: string; hrStatus: string }>({ searchTerm: '', role: 'all', isActive: 'all', hrStatus: 'all' });
  // const [actionStatus, setActionStatus] = useState<Record<string, { message: string, type: 'success' | 'error' }>>({}); // Removed as it's unused
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0); 
  const [totalUsers, setTotalUsers] = useState(0); 
  const itemsPerPage = 10;

  // State for Edit Role Modal removed
  // const [isEditRoleModalOpen, setIsEditRoleModalOpen] = useState(false);
  // const [editingUser, setEditingUser] = useState<UserManagementInfo | null>(null);
  // const [newRole, setNewRole] = useState<Role | ''>('');


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
      if (filters.role !== 'all') params.role = filters.role;
      if (filters.isActive !== 'all') params.is_active = filters.isActive === 'true';
      if (filters.role === 'hr' && filters.hrStatus !== 'all') params.hr_status = filters.hrStatus;
      
      const data = await getAllUsers(params); // Expects UserManagementInfo[]
      setUsers(data); // Set users directly from the array
      // Since the API returns an array, pagination info is not available directly.
      // The UI pagination controls might not work correctly without backend pagination.
      // Adjusting state to reflect non-paginated response.
      setTotalUsers(data.length);
      setTotalPages(1); // Assuming all results are on a single "page"
      setCurrentPage(1); // Always on the first "page" with non-paginated data
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to load users.');
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, filters, itemsPerPage, setIsLoading, setError, setUsers, setTotalUsers, setTotalPages, setCurrentPage]); // Updated dependencies

  useEffect(() => {
    fetchData(currentPage); // Fetch data based on current page and filters
  }, [fetchData, currentPage]); 

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setCurrentPage(1); // Reset to first page on filter change
  };
  
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(1); // Re-fetch data with current filters, starting from page 1
  };

  const handlePageChange = (newPage: number) => {
    fetchData(newPage);
  };

  // Edit Role functions removed
  // const openEditRoleModal = (user: UserManagementInfo) => { ... };
  // const handleRoleChangeSubmit = async () => { ... };

  // toggleUserActivation function removed
  // const toggleUserActivation = async (userId: string, currentIsActive: boolean) => { ... };

  // handleDeleteUser function removed
  // const handleDeleteUser = async (userId: string, username: string) => { ... };

  if (isLoading && users.length === 0) {
    return <MainLayout><div>Loading User Management...</div></MainLayout>;
  }

  if (error && users.length === 0) {
    return <MainLayout><div className={styles.error}>{error}</div></MainLayout>;
  }

  return (
    <MainLayout>
      <div className={styles.userManagementContainer}>
        <h1>User Management</h1>
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
          <div className={styles.formGroup}>
            <label htmlFor="roleFilter">Filter by Role:</label>
            <select id="roleFilter" name="role" value={filters.role} onChange={handleInputChange}>
              <option value="all">All Roles</option>
              <option value="candidate">Candidate</option>
              <option value="hr">HR</option>
              {/* <option value="admin">Admin</option> Removed Admin filter option */}
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
          {filters.role === 'hr' && (
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
          {/* Link to "/admin/create-user" removed */}
        </form>

        {isLoading && <p>Loading users...</p>}
        {!isLoading && users.length === 0 && <p>No users found matching the criteria.</p>}
        
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
                    {/* Activate/Deactivate Button Removed */}
                    {/* Delete Button Removed */}
                    {/* Edit Role Button Removed */}
                    <Link to={`/admin/users/${user.id}`} className={styles.actionLinkButton}>
                      View Details
                    </Link>
                    {/* Removed actionStatus display as it's no longer used */}
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
        
        {/* Edit Role Modal Removed */}

        <Link to="/admin/dashboard" className={styles.backLink}>Back to Dashboard</Link>
      </div>
    </MainLayout>
  );
};

export default UserManagementPage;
