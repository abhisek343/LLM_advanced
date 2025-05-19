import React, { useState, useEffect } from 'react';
import Button from '../../../components/common/Button'; 
import Input from '../../../components/common/Input';   
import Textarea from '../../../components/common/Textarea'; 
import FileUpload from '../../../components/common/FileUpload'; // Import common FileUpload
import styles from './HRProfileForm.module.css'; 

export interface HRProfileFormData { // Exporting for HRProfilePage
  username: string;
  email: string; // For display
  company: string;
  yearsOfExperience: number | string;
  specialization: string;
  resumeFileName: string | null;
  resumeUploadDate: string | null;
}

interface HRProfileFormProps {
  initialData: HRProfileFormData;
  onProfileSubmit: (data: Pick<HRProfileFormData, 'username' | 'company' | 'yearsOfExperience' | 'specialization'>) => void;
  onResumeSubmit: (file: File) => void;
  isSubmitting?: boolean;
  isEditMode: boolean;
  toggleEditMode: () => void;
}

const HRProfileForm: React.FC<HRProfileFormProps> = ({ 
  initialData, 
  onProfileSubmit, 
  onResumeSubmit, 
  isSubmitting,
  isEditMode,
  toggleEditMode
}) => {
  const [username, setUsername] = useState(initialData.username);
  const [email, setEmail] = useState(initialData.email); // For display
  const [company, setCompany] = useState(initialData.company);
  const [yearsOfExperience, setYearsOfExperience] = useState(initialData.yearsOfExperience);
  const [specialization, setSpecialization] = useState(initialData.specialization);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [currentResumeFileName, setCurrentResumeFileName] = useState(initialData.resumeFileName);
  const [currentResumeUploadDate, setCurrentResumeUploadDate] = useState(initialData.resumeUploadDate);

  useEffect(() => {
    setUsername(initialData.username);
    setEmail(initialData.email);
    setCompany(initialData.company);
    setYearsOfExperience(initialData.yearsOfExperience);
    setSpecialization(initialData.specialization);
    setCurrentResumeFileName(initialData.resumeFileName);
    setCurrentResumeUploadDate(initialData.resumeUploadDate);
  }, [initialData]);

  const handleProfessionalDetailsSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onProfileSubmit({ username, company, yearsOfExperience, specialization });
  };

  const handleCancelEdit = () => {
    // Reset form fields to initial data
    setUsername(initialData.username);
    setCompany(initialData.company);
    setYearsOfExperience(initialData.yearsOfExperience);
    setSpecialization(initialData.specialization);
    setResumeFile(null); // Clear any selected file not yet uploaded
    toggleEditMode(); // Exit edit mode
  };

  const handleResumeFileChange = (file: File | null) => {
    setResumeFile(file);
  };

  const handleResumeUploadSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (resumeFile) {
      onResumeSubmit(resumeFile);
      // Optionally clear the file input after submission or update display
      setResumeFile(null); 
    } else {
      alert("Please select a resume file to upload.");
    }
  };

  return (
    <div className={styles.profileFormContainer}>
      <form onSubmit={isEditMode ? handleProfessionalDetailsSubmit : (e) => e.preventDefault()} className={styles.profileFormSection}>
        <div className={styles.formHeader}>
          <h2>Profile Information</h2>
          {!isEditMode && (
            <Button onClick={toggleEditMode} className={styles.editButton} variant="secondary">
              Edit Profile
            </Button>
          )}
        </div>

        <Input
          label="Username"
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={styles.formGroup}
          inputClassName={styles.inputField}
          disabled={!isEditMode || isSubmitting}
          placeholder="Enter your username"
        />
        <Input
          label="Email"
          id="email"
          type="email"
          value={email}
          readOnly // Email is not editable as per current page display
          className={styles.formGroup}
          inputClassName={styles.inputField}
          disabled // Always disabled
        />
        <Input
          label="Company"
          id="company"
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className={styles.formGroup}
          inputClassName={styles.inputField}
          disabled={!isEditMode || isSubmitting}
          placeholder="Your current or last company"
        />
        <Input
          label="Years of Experience"
          id="yearsOfExperience"
          type="number"
          value={yearsOfExperience}
          onChange={(e) => setYearsOfExperience(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
          className={styles.formGroup}
          inputClassName={styles.inputField}
          min="0"
          disabled={!isEditMode || isSubmitting}
          placeholder="e.g., 5"
        />
        <Textarea
          label="Specialization/Domain"
          id="specialization"
          value={specialization}
          onChange={(e) => setSpecialization(e.target.value)}
          className={styles.formGroup}
          textareaClassName={styles.textareaField}
          rows={3}
          disabled={!isEditMode || isSubmitting}
          placeholder="e.g., Talent Acquisition, HR Business Partner"
        />

        {isEditMode && (
          <div className={styles.formActions}>
            <Button type="submit" className={styles.submitButton} isLoading={isSubmitting} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button type="button" onClick={handleCancelEdit} className={styles.cancelButton} variant="secondary" disabled={isSubmitting}>
              Cancel
            </Button>
          </div>
        )}
      </form>

      <div className={styles.profileFormSection}> {/* Changed from form to div for resume section if not part of main save */}
        <h2>Edit or Upload Resume</h2>
        {currentResumeFileName && (
          <div className={styles.currentResumeInfo}>
            <p>Current Resume: <strong>{currentResumeFileName}</strong></p>
            {currentResumeUploadDate && <p>Uploaded on: {new Date(currentResumeUploadDate).toLocaleDateString()}</p>}
          </div>
        )}
        <FileUpload
          onFileSelect={handleResumeFileChange}
          label={isEditMode ? "Drag & drop new resume (PDF, DOCX), or click to select" : "Resume (View current or edit to upload new)"}
          acceptedFileTypes=".pdf,.docx"
          disabled={!isEditMode || isSubmitting}
          className={styles.formGroup}
          dropzoneClassName={styles.dropzone}
          fileNameDisplayClassName={styles.selectedFile}
        />
        {isEditMode && resumeFile && (
           <p className={styles.selectedFilePreview}>Selected file for upload: {resumeFile.name}</p>
        )}
        {isEditMode && (
          <Button 
            onClick={handleResumeUploadSubmit} // Changed to onClick as it's not a form submit for this button alone
            className={styles.submitButton} 
            isLoading={isSubmitting && !!resumeFile} // Show loading only if this action is in progress
            disabled={!resumeFile || isSubmitting}
          >
            {isSubmitting && !!resumeFile ? (currentResumeFileName ? 'Replacing...' : 'Uploading...') : (currentResumeFileName ? 'Replace Resume' : 'Upload New Resume')}
          </Button>
        )}
      </div>
    </div>
  );
};

export default HRProfileForm;
