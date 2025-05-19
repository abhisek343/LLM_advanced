import React, { useState } from 'react'; // Removed useEffect as React Query handles fetching
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import HRProfileForm from '../components/HRProfileForm';
import styles from './HRProfilePage.module.css';
import hrService, { type HrProfileOut, type HrProfileUpdate } from '../../../services/hrService'; 
import Button from '../../../components/common/Button'; 
import AlertMessage from '../../../components/common/AlertMessage'; 
import Spinner from '../../../components/common/Spinner'; 
import { useAuth } from '../../../contexts/AuthContext'; // Import actual useAuth

const HR_PROFILE_QUERY_KEY = 'hrProfileDetails';

const HRProfilePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth(); // Use actual useAuth
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [generalSuccess, setGeneralSuccess] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);


  const { 
    data: profileData, 
    isLoading: isLoadingProfile, 
    error: profileLoadError,
  } = useQuery<HrProfileOut, Error>({
    queryKey: [HR_PROFILE_QUERY_KEY, currentUser?.id], // Add currentUser.id to queryKey if data is user-specific
    queryFn: hrService.getProfileDetails,
    enabled: !!currentUser, // Only fetch if currentUser is available
  });

  const { mutate: updateProfileMutate, isPending: isUpdatingProfile } = useMutation<
    HrProfileOut,
    Error,
    HrProfileUpdate
  >({
    mutationFn: hrService.updateProfileDetails,
    onSuccess: (data) => {
      queryClient.setQueryData([HR_PROFILE_QUERY_KEY, currentUser?.id], data); // Optimistic update with user ID
      queryClient.invalidateQueries({ queryKey: [HR_PROFILE_QUERY_KEY, currentUser?.id] }); // Refetch with user ID
      setGeneralSuccess("Professional details updated successfully!");
      setGeneralError(null);
      setIsEditMode(false); // Exit edit mode on successful save
    },
    onError: (error) => {
      setGeneralError("Failed to update professional details: " + error.message);
      setGeneralSuccess(null);
    },
  });

  const { mutate: uploadResumeMutate, isPending: isUploadingResume } = useMutation< // Renamed isLoading to isPending
    HrProfileOut,
    Error,
    File
  >({
    mutationFn: hrService.uploadResume,
    onSuccess: (data) => {
      queryClient.setQueryData([HR_PROFILE_QUERY_KEY, currentUser?.id], data);
      queryClient.invalidateQueries({ queryKey: [HR_PROFILE_QUERY_KEY, currentUser?.id] });
      setGeneralSuccess("Resume uploaded successfully!");
      setGeneralError(null);
      // setIsEditMode(false); // Optionally exit edit mode after resume upload too
    },
    onError: (error) => {
      setGeneralError("Failed to upload resume: " + error.message);
      setGeneralSuccess(null);
    },
  });

  const { mutate: unmapAdminMutate, isPending: isUnmapping } = useMutation< // Renamed isLoading to isPending
    HrProfileOut,
    Error
  >({
    mutationFn: hrService.unmapFromAdmin,
    onSuccess: (data) => {
      queryClient.setQueryData([HR_PROFILE_QUERY_KEY, currentUser?.id], data);
      queryClient.invalidateQueries({ queryKey: [HR_PROFILE_QUERY_KEY, currentUser?.id] });
      setGeneralSuccess("Successfully unmapped from admin.");
      setGeneralError(null);
    },
    onError: (error) => {
      setGeneralError("Failed to unmap from admin: " + error.message);
      setGeneralSuccess(null);
    },
  });


  const handleProfileUpdate = (updatedDetails: HrProfileUpdate) => {
    // Include username if it's part of updatedDetails from the form
    updateProfileMutate(updatedDetails);
  };

  const handleResumeUpload = (file: File) => {
    uploadResumeMutate(file);
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    setGeneralError(null); // Clear errors when toggling mode
    setGeneralSuccess(null); // Clear success messages
  };
  
  const handleUnmapAdmin = () => {
    if (!profileData || profileData.hr_status !== 'mapped') return;
    if (window.confirm(`Are you sure you want to unmap from ${profileData.admin_manager_name || 'the admin'}?`)) {
      unmapAdminMutate();
    }
  };

  const isSubmitting = isUpdatingProfile || isUploadingResume || isUnmapping;

  if (isLoadingProfile) {
    return (
      <div className={styles.profileContainer} style={{ textAlign: 'center' as any, paddingTop: '50px' }}>
        <Spinner size="large" />
        <p>Loading profile...</p>
      </div>
    );
  }

  if (profileLoadError) { 
    return (
      <div className={styles.profileContainer}>
        <AlertMessage type="error" message={`Error loading profile: ${profileLoadError.message}`} />
      </div>
    );
  }
  
  if (!profileData) {
    return (
      <div className={styles.profileContainer}>
        <AlertMessage type="warning" message="Profile data not available." />
      </div>
    );
  }

  const calculateProfileCompletion = (profile: HrProfileOut): number => {
    let completedItems = 0;
    const totalItems = 2; // YoE and Resume

    if (profile.years_of_experience !== null && profile.years_of_experience !== undefined) {
      completedItems++;
    }
    if (profile.resume_path) {
      completedItems++;
    }
    return (completedItems / totalItems) * 100;
  };

  const completionPercentage = calculateProfileCompletion(profileData);
  const hrStatusDisplay = profileData.hr_status ? profileData.hr_status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Unknown';


  return (
    <div className={styles.profileContainer}>
      <header className={styles.profileHeader}>
        <h1>My HR Profile</h1>
        <div className={styles.profileStatusInfo}>
          <p><strong>Status:</strong> {hrStatusDisplay}</p>
          <p><strong>Completion:</strong> {completionPercentage}%</p>
          {/* Basic progress bar */}
          <div className={styles.progressBarContainer}>
            <div className={styles.progressBar} style={{ width: `${completionPercentage}%` }}>
              {completionPercentage > 10 && `${completionPercentage}%`}
            </div>
          </div>
        </div>
      </header>

      {generalError && 
        <AlertMessage 
          type="error" 
          message={generalError} 
          closable 
          onClose={() => setGeneralError(null)} 
        />
      }
      {generalSuccess && 
        <AlertMessage 
          type="success" 
          message={generalSuccess} 
          closable 
          onClose={() => setGeneralSuccess(null)} 
        />
      }

      {/* Personal Information section will be part of HRProfileForm when in edit mode */}
      {!isEditMode && (
        <section className={styles.profileSection}>
          <h2>Personal Information</h2>
          <p><strong>Name:</strong> {profileData.username}</p>
          <p><strong>Email:</strong> {profileData.email} (Read-only)</p>
        </section>
      )}

      <HRProfileForm
        initialData={{
          username: profileData.username || '', // Add username
          email: profileData.email || '', // Pass email for display, though not editable here
          company: profileData.company || '',
          yearsOfExperience: profileData.years_of_experience || '', // Ensure this is number or string as form expects
          specialization: profileData.specialization || '',
          resumeFileName: profileData.resume_path ? profileData.resume_path.split('/').pop() || null : null,
          resumeUploadDate: profileData.resume_path ? (profileData.updated_at || null) : null, 
        }}
        onProfileSubmit={handleProfileUpdate}
        onResumeSubmit={handleResumeUpload}
        isSubmitting={isSubmitting}
        isEditMode={isEditMode}
        toggleEditMode={toggleEditMode}
      />
      
      <section className={styles.profileSection}>
        <h2>Admin Mapping Status</h2>
        {profileData.hr_status === 'mapped' && profileData.admin_manager_name ? (
          <>
            <p>Currently Mapped to: <strong>{profileData.admin_manager_name}</strong></p>
            <Button onClick={handleUnmapAdmin} className={`${styles.actionButton} ${styles.unmapButton}`} disabled={isSubmitting}>
                {isSubmitting ? 'Unmapping...' : 'Unmap from Admin'}
            </Button>
          </>
        ) : (
          <p>
            {profileData.hr_status === 'application_pending' 
              ? "Your application to an Admin is pending." 
              : "Not Mapped to an Admin."}
          </p>
        )}
        <Button to="/hr/admin-connections" className={styles.actionButton} disabled={isSubmitting}>
          Manage Admin Connections
        </Button>
      </section>
    </div>
  );
};

export default HRProfilePage;
