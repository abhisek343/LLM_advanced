import React, { useState, useEffect } from 'react'; // Keep useEffect for now for formData sync
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // Import React Query hooks
import MainLayout from '../../../components/layout/MainLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { getCandidateProfile, updateCandidateProfile, uploadCandidateResume } from '../../../services/candidateAPI';
import type { CandidateProfile } from '../../../services/candidateAPI';
import styles from './CandidateProfilePage.module.css';
import Input from '../../../components/common/Input/Input';
import Textarea from '../../../components/common/Textarea/Textarea';
import Button from '../../../components/common/Button/Button';
import TagInput from '../../../components/common/TagInput/TagInput'; // Import TagInput

// Define a type for the form data, which might be a subset of CandidateProfile
  // For simplicity, we can reuse CandidateProfile or parts of it.
  // CandidateProfile already includes optional experience, education, and skills arrays.
  type ProfileFormData = Partial<CandidateProfile>; 
  // Define ExperienceEntry based on CandidateProfile.experience array element type
  type ExperienceEntry = NonNullable<CandidateProfile['experience']>[0];
  // Define a type for a new experience entry, ensuring all fields are strings for form handling initially
  type NewExperienceEntry = {
    title: string;
    company: string;
    start_date: string;
    end_date: string;
    description: string;
    years?: number; // Optional, might be calculated or entered
  };
  // Define EducationEntry based on CandidateProfile.education array element type
  type EducationEntry = NonNullable<CandidateProfile['education']>[0];
  // Define a type for a new education entry
  type NewEducationEntry = {
    degree: string;
    institution: string;
    graduation_year: string; // Or number, handle conversion
    field_of_study?: string;
  };

const CandidateProfilePage: React.FC = () => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient(); // For invalidating queries on mutation

  // State for form data, success/error messages, and selected file
  const [formData, setFormData] = useState<ProfileFormData>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // Local error state for mutations, distinct from query error
  const [mutationError, setMutationError] = useState<string | null>(null);
  
  const [isAddingExperience, setIsAddingExperience] = useState(false);
  const [editingExperienceIndex, setEditingExperienceIndex] = useState<number | null>(null);
  const [currentExperience, setCurrentExperience] = useState<Partial<NewExperienceEntry>>({
    title: '', company: '', start_date: '', end_date: '', description: ''
  });
  const [isAddingEducation, setIsAddingEducation] = useState(false);
  const [editingEducationIndex, setEditingEducationIndex] = useState<number | null>(null);
  const [currentEducation, setCurrentEducation] = useState<Partial<NewEducationEntry>>({
    degree: '', institution: '', graduation_year: '', field_of_study: ''
  });

  // Fetch candidate profile using React Query
  const { data: profile, error: queryError, isLoading: isQueryLoading } = useQuery<CandidateProfile, Error>({
    queryKey: ['candidateProfile', currentUser?.id], // Query key includes user ID
    queryFn: getCandidateProfile,
    enabled: !!currentUser && currentUser.role === 'candidate', // Only run query if user is logged in and is a candidate
  });

  // Effect to update formData when profile data is fetched or changes
  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name,
        phone_number: profile.phone_number,
        linkedin_profile: profile.linkedin_profile,
        professional_summary: profile.professional_summary,
        resume_path: profile.resume_path,
        extracted_skills_list: profile.extracted_skills_list,
        experience: profile.experience || [], // Initialize with empty array if undefined
        education: profile.education || [],   // Initialize with empty array if undefined
        skills: profile.skills || [],         // Initialize with empty array if undefined
        // Note: email is read-only from profile, not part of formData for update
      });
    }
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleExperienceChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCurrentExperience({ ...currentExperience, [e.target.name]: e.target.value });
  };

  // handleAddExperience is now merged into handleSaveExperience
  // const handleAddExperience = () => { ... }; 

  const handleEditExperience = (indexToEdit: number) => {
    const expToEdit = formData.experience?.[indexToEdit];
    if (expToEdit) {
      setCurrentExperience({
        title: expToEdit.title,
        company: expToEdit.company,
        start_date: expToEdit.start_date,
        end_date: expToEdit.end_date || '',
        description: expToEdit.description || ''
      });
      setEditingExperienceIndex(indexToEdit);
      setIsAddingExperience(true); // Reuse the same form for editing
      setMutationError(null);
    }
  };

  const handleSaveExperience = () => {
    if (!currentExperience.title || !currentExperience.company) {
      setMutationError("Title and Company are required for experience.");
      return;
    }
    const newExp = { ...currentExperience } as ExperienceEntry;

    if (editingExperienceIndex !== null) { // Editing existing
      setFormData(prev => ({
        ...prev,
        experience: prev.experience?.map((exp, index) => 
          index === editingExperienceIndex ? newExp : exp
        ) || []
      }));
      setEditingExperienceIndex(null);
    } else { // Adding new
      setFormData(prev => ({
        ...prev,
        experience: [...(prev.experience || []), newExp]
      }));
    }
    setCurrentExperience({ title: '', company: '', start_date: '', end_date: '', description: '' });
    setIsAddingExperience(false);
    setMutationError(null);
  };

  const handleDeleteExperience = (indexToDelete: number) => {
    setFormData(prev => ({
      ...prev,
      experience: prev.experience?.filter((_, index) => index !== indexToDelete) || []
    }));
  };

  const handleEducationChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCurrentEducation({ ...currentEducation, [e.target.name]: e.target.value });
  };

  // handleAddEducation is now merged into handleSaveEducation
  // const handleAddEducation = () => { ... };

  const handleEditEducation = (indexToEdit: number) => {
    const eduToEdit = formData.education?.[indexToEdit];
    if (eduToEdit) {
      setCurrentEducation({
        degree: eduToEdit.degree,
        institution: eduToEdit.institution,
        graduation_year: String(eduToEdit.year), // Convert number back to string for form
        field_of_study: eduToEdit.field_of_study || ''
      });
      setEditingEducationIndex(indexToEdit);
      setIsAddingEducation(true); // Reuse the same form for editing
      setMutationError(null);
    }
  };
  
  const handleSaveEducation = () => {
    if (!currentEducation.degree || !currentEducation.institution || !currentEducation.graduation_year) {
      setMutationError("Degree, Institution, and Graduation Year are required for education.");
      return;
    }
    const yearValue = parseInt(currentEducation.graduation_year, 10);
    if (isNaN(yearValue)) {
      setMutationError("Please enter a valid number for Graduation Year.");
      return;
    }
    const newEdu = {
      ...currentEducation,
      year: yearValue,
      graduation_year: undefined // Remove string version
    } as EducationEntry;

    if (editingEducationIndex !== null) { // Editing existing
      setFormData(prev => ({
        ...prev,
        education: prev.education?.map((edu, index) =>
          index === editingEducationIndex ? newEdu : edu
        ) || []
      }));
      setEditingEducationIndex(null);
    } else { // Adding new
      setFormData(prev => ({
        ...prev,
        education: [...(prev.education || []), newEdu]
      }));
    }
    setCurrentEducation({ degree: '', institution: '', graduation_year: '', field_of_study: '' });
    setIsAddingEducation(false);
    setMutationError(null);
  };

  const handleDeleteEducation = (indexToDelete: number) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education?.filter((_, index) => index !== indexToDelete) || []
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMutationError(null); // Clear previous mutation errors
    setSuccessMessage(null);
    // Mutations will handle their own loading states
    updateProfileMutation.mutate(formData as CandidateProfile);
  };

  const updateProfileMutation = useMutation<CandidateProfile, Error, CandidateProfile>({
    mutationFn: updateCandidateProfile,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['candidateProfile', currentUser?.id] }); // Invalidate and refetch profile
      setFormData(data); // Update form with potentially backend-modified data
      setSuccessMessage('Profile updated successfully!');
    },
    onError: (error) => {
      setMutationError(error.message || 'Failed to update profile.');
    },
  });

  const resumeUploadMutation = useMutation<CandidateProfile, Error, FormData>({
    mutationFn: uploadCandidateResume,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['candidateProfile', currentUser?.id] });
      // Update formData with new resume path and skills from the response
      setFormData(prev => ({
        ...prev, 
        resume_path: data.resume_path, 
        extracted_skills_list: data.extracted_skills_list
      }));
      setSelectedFile(null);
      setSuccessMessage('Resume uploaded successfully!');
    },
    onError: (error) => {
      setMutationError(error.message || 'Failed to upload resume.');
    },
  });

  const handleResumeUpload = async () => {
    if (!selectedFile) {
      setMutationError('Please select a resume file to upload.');
      return;
    }
    setMutationError(null);
    setSuccessMessage(null);
    const resumeFormData = new FormData();
    resumeFormData.append('resume', selectedFile);
    resumeUploadMutation.mutate(resumeFormData);
  };

  if (isQueryLoading && !profile) { // Show loading only on initial load
    return <MainLayout><div>Loading profile...</div></MainLayout>;
  }

  if (queryError && !profile) { // Show full page error if profile couldn't load
    return <MainLayout><div className={styles.error}>{queryError.message}</div></MainLayout>;
  }
  
  return (
    <MainLayout>
      <div className={styles.profileContainer}>
        <h1>My Profile</h1>
        {mutationError && <p className={styles.errorMessage}>{mutationError}</p>}
        {successMessage && <p className={styles.successMessage}>{successMessage}</p>}

        <form onSubmit={handleSubmit} className={styles.profileForm}>
          <section className={styles.formSection}>
            <h2>Personal Information</h2>
            <Input
              label="Full Name:"
              id="full_name"
              name="full_name"
              type="text"
              value={formData.full_name || ''}
              onChange={handleChange}
              className={styles.formGroup}
            />
            <Input
              label="Email:"
              id="email"
              name="email"
              type="email"
              value={profile?.email || ''} // Display from fetched profile, not formData
              readOnly
              disabled
              className={styles.formGroup}
            />
            <Input
              label="Phone Number:"
              id="phone_number"
              name="phone_number"
              type="text"
              value={formData.phone_number || ''}
              onChange={handleChange}
              className={styles.formGroup}
            />
            <Input
              label="LinkedIn Profile URL:"
              id="linkedin_profile"
              name="linkedin_profile"
              type="text"
              value={formData.linkedin_profile || ''}
              onChange={handleChange}
              className={styles.formGroup}
            />
          </section>

          <section className={styles.formSection}>
            <h2>Professional Summary</h2>
            <Textarea
              label="Summary/Objective:"
              id="professional_summary"
              name="professional_summary"
              value={formData.professional_summary || ''}
              onChange={handleChange}
              rows={5}
              className={styles.formGroup}
            />
          </section>
          
          <section className={styles.formSection}>
            <h2>Work Experience</h2>
            {formData.experience && formData.experience.length > 0 ? (
              <ul className={styles.listSection}>
                {formData.experience.map((exp, index) => (
                  <li key={index} className={styles.listItem}>
                    <div className={styles.experienceDetails}>
                      <strong>{exp.title || 'N/A'}</strong> at {exp.company || 'N/A'}
                      <p>{exp.start_date} - {exp.end_date || 'Present'}</p>
                      <p>{exp.description || ''}</p>
                    </div>
                    <div className={styles.experienceActions}>
                      <Button type="button" onClick={() => handleEditExperience(index)} variant="secondary" size="small">Edit</Button>
                      <Button type="button" onClick={() => handleDeleteExperience(index)} variant="danger" size="small">Delete</Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No work experience added yet.</p>
            )}
            {!isAddingExperience && (
              <Button type="button" onClick={() => { 
                setIsAddingExperience(true); 
                setEditingExperienceIndex(null); // Ensure not in edit mode when adding new
                setCurrentExperience({ title: '', company: '', start_date: '', end_date: '', description: '' }); // Clear form
                setMutationError(null); 
              }} variant="secondary" size="small">
                Add New Experience
              </Button>
            )}
          </section>

          {isAddingExperience && ( // This form is now used for both Add and Edit
            <section className={`${styles.formSection} ${styles.experienceFormSection}`}>
              <h3>{editingExperienceIndex !== null ? 'Edit Work Experience' : 'Add New Work Experience'}</h3>
              <Input label="Job Title:" name="title" value={currentExperience.title || ''} onChange={handleExperienceChange} required />
              <Input label="Company:" name="company" value={currentExperience.company || ''} onChange={handleExperienceChange} required />
              <Input label="Start Date (YYYY-MM-DD):" name="start_date" type="date" value={currentExperience.start_date || ''} onChange={handleExperienceChange} />
              <Input label="End Date (YYYY-MM-DD, leave blank if current):" name="end_date" type="date" value={currentExperience.end_date || ''} onChange={handleExperienceChange} />
              <Textarea label="Description:" name="description" value={currentExperience.description || ''} onChange={handleExperienceChange} rows={3} />
              <div className={styles.formActions}>
                <Button type="button" onClick={handleSaveExperience} variant="primary" size="small">
                  {editingExperienceIndex !== null ? 'Update Experience' : 'Save Experience'}
                </Button>
                <Button type="button" onClick={() => { 
                  setIsAddingExperience(false); 
                  setEditingExperienceIndex(null);
                  setCurrentExperience({ title: '', company: '', start_date: '', end_date: '', description: '' }); // Clear form
                  setMutationError(null); 
                }} variant="secondary" size="small">Cancel</Button>
              </div>
            </section>
          )}

          <section className={styles.formSection}>
            <h2>Education</h2>
            {formData.education && formData.education.length > 0 ? (
              <ul className={styles.listSection}>
                {formData.education.map((edu, index) => (
                  <li key={index} className={styles.listItem}>
                    <div className={styles.educationDetails}>
                      <strong>{edu.degree}</strong> from {edu.institution} ({edu.year})
                      <p>Field of Study: {edu.field_of_study || 'N/A'}</p>
                    </div>
                    <div className={styles.educationActions}>
                      <Button type="button" onClick={() => handleEditEducation(index)} variant="secondary" size="small">Edit</Button>
                      <Button type="button" onClick={() => handleDeleteEducation(index)} variant="danger" size="small">Delete</Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No education details added yet.</p>
            )}
            {!isAddingEducation && (
              <Button type="button" onClick={() => { 
                setIsAddingEducation(true); 
                setEditingEducationIndex(null); // Ensure not in edit mode when adding new
                setCurrentEducation({ degree: '', institution: '', graduation_year: '', field_of_study: '' }); // Clear form
                setMutationError(null); 
              }} variant="secondary" size="small">
                Add New Education
              </Button>
            )}
          </section>

          {isAddingEducation && ( // This form is now used for both Add and Edit Education
            <section className={`${styles.formSection} ${styles.educationFormSection}`}>
              <h3>{editingEducationIndex !== null ? 'Edit Education' : 'Add New Education'}</h3>
              <Input label="Degree:" name="degree" value={currentEducation.degree || ''} onChange={handleEducationChange} required />
              <Input label="Institution:" name="institution" value={currentEducation.institution || ''} onChange={handleEducationChange} required />
              <Input label="Graduation Year:" name="graduation_year" type="text" value={currentEducation.graduation_year || ''} onChange={handleEducationChange} required />
              <Input label="Field of Study (Optional):" name="field_of_study" value={currentEducation.field_of_study || ''} onChange={handleEducationChange} />
              <div className={styles.formActions}>
                <Button type="button" onClick={handleSaveEducation} variant="primary" size="small">
                  {editingEducationIndex !== null ? 'Update Education' : 'Save Education'}
                </Button>
                <Button type="button" onClick={() => { 
                  setIsAddingEducation(false); 
                  setEditingEducationIndex(null);
                  setCurrentEducation({ degree: '', institution: '', graduation_year: '', field_of_study: '' }); // Clear form
                  setMutationError(null); 
                }} variant="secondary" size="small">Cancel</Button>
              </div>
            </section>
          )}

          <section className={styles.formSection}>
            <h2>Skills</h2>
            <TagInput
              label="Your Skills (add by pressing Enter or comma):"
              id="skills"
              tags={formData.skills || []}
              setTags={(newSkills) => setFormData(prev => ({ ...prev, skills: newSkills }))}
              placeholder="e.g., JavaScript, React, Node.js"
              className={styles.formGroup} // Apply formGroup styling if needed, or specific TagInput styling
            />
            {formData.extracted_skills_list && formData.extracted_skills_list.length > 0 && (
              <div className={styles.skillsPreview}>
                <strong>Skills Extracted from Resume:</strong>
                <div className={styles.extractedSkillsTags}>
                  {formData.extracted_skills_list.map((skill, index) => (
                    <span key={index} className={styles.extractedSkillTag}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          <Button
            type="submit"
            isLoading={updateProfileMutation.isPending}
            disabled={updateProfileMutation.isPending || resumeUploadMutation.isPending}
            className={styles.submitButton}
            fullWidth
          >
            {updateProfileMutation.isPending ? 'Saving...' : 'Save Profile Changes'}
          </Button>
        </form>

        <section className={`${styles.formSection} ${styles.resumeSection}`}>
          <h2>Resume</h2>
          {/* Display resume_path from formData as it's updated by both query and mutation */}
          {formData.resume_path && (
            <p>Current resume: <a href={formData.resume_path} target="_blank" rel="noopener noreferrer">{formData.resume_path.split('/').pop()}</a></p>
          )}
          {/* Using a standard input for file upload for now. Could be wrapped in a FileUpload common component later. */}
          <div className={styles.formGroup}>
            <label htmlFor="resumeFile">Upload New/Replace Resume (PDF, DOCX):</label>
            <input type="file" id="resumeFile" onChange={handleFileChange} accept=".pdf,.docx" />
          </div>
          {selectedFile && <p>Selected: {selectedFile.name}</p>}
          <Button 
            onClick={handleResumeUpload} 
            isLoading={resumeUploadMutation.isPending}
            disabled={updateProfileMutation.isPending || resumeUploadMutation.isPending || !selectedFile} 
            className={styles.submitButton}
            variant="secondary"
          >
            {resumeUploadMutation.isPending ? 'Uploading...' : 'Upload Resume'}
          </Button>
          {/* Display extracted_skills_list from formData */}
          {formData.extracted_skills_list && formData.extracted_skills_list.length > 0 && (
            <div className={styles.skillsPreview}>
              <strong>Extracted Skills:</strong> {formData.extracted_skills_list.join(', ')}
            </div>
          )}
        </section>
        
        <Link to="/candidate/dashboard" className={styles.backLink}>Back to Dashboard</Link>
      </div>
    </MainLayout>
  );
};

export default CandidateProfilePage;
