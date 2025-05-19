import React, { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '../../../components/layout/MainLayout';
import { useAuth } from '../../../contexts/AuthContext'; // Import useAuth
import { getUserById } from '../../../services/adminAPI';
import type { UserManagementInfo } from '../../../services/adminAPI';
import styles from './AdminUserDetailPage.module.css';

const AdminUserDetailPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { currentUser, isLoading: authLoading } = useAuth(); // Get currentUser
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && (!currentUser || currentUser.role !== 'admin')) {
      navigate('/login'); // Redirect if not an authenticated admin
    }
  }, [currentUser, authLoading, navigate]);

  const { data: user, error, isLoading: userLoading } = useQuery<UserManagementInfo, Error>({
    queryKey: ['userDetail', userId, currentUser?.id], // Add currentUser.id to key to re-fetch if admin changes (though unlikely here)
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return getUserById(userId);
    },
    enabled: !!userId && !!currentUser && currentUser.role === 'admin', // Only run if userId and admin is logged in
  });

  if (authLoading || userLoading) {
    return <MainLayout><div>Loading user details...</div></MainLayout>;
  }

  // This check is now more robust due to useEffect redirect
  if (!currentUser || currentUser.role !== 'admin') {
    return <MainLayout><div>Access Denied. You must be an admin to view this page.</div></MainLayout>;
  }

  if (error) {
    return <MainLayout><div className={styles.error}>Error loading user details: {error.message}</div></MainLayout>;
  }

  if (!user) {
    return <MainLayout><div>User not found or you do not have permission to view this user.</div></MainLayout>;
  }

  return (
    <MainLayout>
      <div className={styles.userDetailContainer}>
        <h1>User Details: {user.username}</h1>
        <div className={styles.detailGrid}>
          <p><strong>ID:</strong> {user.id}</p>
          <p><strong>Username:</strong> {user.username}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Role:</strong> <span className={`${styles.role} ${styles[user.role]}`}>{user.role}</span></p>
          <p><strong>Status:</strong> {user.is_active ? <span className={styles.active}>Active</span> : <span className={styles.inactive}>Inactive</span>}</p>
          <p><strong>Created At:</strong> {new Date(user.created_at).toLocaleString()}</p>
          {user.last_login_at && <p><strong>Last Login:</strong> {new Date(user.last_login_at).toLocaleString()}</p>}
          
          {user.role === 'hr' && (
            <>
              <p><strong>Company:</strong> {user.company || 'N/A'}</p>
              <p><strong>HR Status:</strong> {user.hr_status || 'N/A'}</p>
              <p><strong>Years of Experience:</strong> {user.years_of_experience ?? 'N/A'}</p>
              <p><strong>Mapped Admin ID:</strong> {user.assigned_admin_id || 'N/A'}</p>
            </>
          )}
          {user.role === 'candidate' && (
            <>
              <p><strong>Candidate Mapping Status:</strong> {user.mapping_status || 'N/A'}</p>
              <p><strong>Assigned HR ID:</strong> {user.assigned_hr_id || 'N/A'}</p>
            </>
          )}
          {/* Add more role-specific details if available in UserManagementInfo or a more detailed UserDetail type */}
        </div>
        <Link to="/admin/user-management" className={styles.backLink}>Back to User Management</Link>
      </div>
    </MainLayout>
  );
};

export default AdminUserDetailPage;
