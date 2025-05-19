import React, { useState, useEffect } from 'react';
import styles from './ScheduleInterviewForm.module.css'; 
import Button from '../../../components/common/Button'; // Already using common Button
import Input from '../../../components/common/Input';   // Import common Input
import Select from '../../../components/common/Select'; // Import common Select
import Textarea from '../../../components/common/Textarea'; // Import common Textarea

// Local mock Button removed.

export interface Candidate {
  id: string;
  name: string;
}

export interface InterviewScheduleData {
  candidateId: string;
  jobTitle: string;
  jobDescription: string;
  interviewType: string;
  keySkills: string;
  numberOfQuestions?: number | string;
  difficultyLevel?: string;
  specificInstructions?: string;
}

interface ScheduleInterviewFormProps {
  assignedCandidates: Candidate[];
  initialSelectedCandidateId?: string;
  onSubmit: (data: InterviewScheduleData) => Promise<void>; // Make it async to handle submission status
  isSubmitting: boolean;
  formError?: string | null;
  formSuccess?: string | null;
}

const ScheduleInterviewForm: React.FC<ScheduleInterviewFormProps> = ({
  assignedCandidates,
  initialSelectedCandidateId,
  onSubmit,
  isSubmitting,
  formError,
  formSuccess,
}) => {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(initialSelectedCandidateId || '');
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [interviewType, setInterviewType] = useState('');
  const [keySkills, setKeySkills] = useState('');
  const [numberOfQuestions, setNumberOfQuestions] = useState<string>('');
  const [difficultyLevel, setDifficultyLevel] = useState('');
  const [specificInstructions, setSpecificInstructions] = useState('');
  
  const [internalFormError, setInternalFormError] = useState<string | null>(null);


  useEffect(() => {
    if (initialSelectedCandidateId) {
      setSelectedCandidateId(initialSelectedCandidateId);
    }
  }, [initialSelectedCandidateId]);
  
  const selectedCandidateName = assignedCandidates.find(c => c.id === selectedCandidateId)?.name;


  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setInternalFormError(null);

    if (!selectedCandidateId) {
      setInternalFormError("Please select a candidate.");
      return;
    }
    if (!jobTitle.trim()) {
      setInternalFormError("Job Title is required.");
      return;
    }
    if (!jobDescription.trim()) {
      setInternalFormError("Job Description is required.");
      return;
    }
    if (!interviewType.trim()) {
      setInternalFormError("Interview Type is required.");
      return;
    }

    const scheduleData: InterviewScheduleData = {
      candidateId: selectedCandidateId,
      jobTitle,
      jobDescription,
      interviewType,
      keySkills,
      numberOfQuestions: numberOfQuestions ? parseInt(numberOfQuestions, 10) : undefined,
      difficultyLevel: difficultyLevel || undefined,
      specificInstructions: specificInstructions || undefined,
    };
    onSubmit(scheduleData);
  };
  
  const displayError = formError || internalFormError;

  return (
    <form onSubmit={handleSubmit} className={styles.scheduleForm}>
      {displayError && <p className={styles.errorMessage}>{displayError}</p>}
      {formSuccess && <p className={styles.successMessage}>{formSuccess}</p>}

      {selectedCandidateName && <p className={styles.formSubHeader}>Scheduling for: <strong>{selectedCandidateName}</strong></p>}

      <Select
        label="Candidate"
        id="candidate"
        value={selectedCandidateId}
        onChange={(e) => setSelectedCandidateId(e.target.value)}
        required
        options={assignedCandidates.map(candidate => ({ value: candidate.id, label: candidate.name }))}
        placeholder="Select a Candidate"
        containerClassName={styles.formGroup}
        selectClassName={styles.selectField}
        disabled={assignedCandidates.length === 0 || isSubmitting}
      />

      <Input
        label="Job Title"
        id="jobTitle"
        type="text"
        value={jobTitle}
        onChange={(e) => setJobTitle(e.target.value)}
        required
        containerClassName={styles.formGroup}
        inputClassName={styles.inputField}
        disabled={isSubmitting}
      />

      <Textarea
        label="Job Description"
        id="jobDescription"
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
        required
        rows={5}
        containerClassName={styles.formGroup}
        textareaClassName={styles.textareaField}
        disabled={isSubmitting}
      />
      
      <Select
        label="Interview Type"
        id="interviewType"
        value={interviewType}
        onChange={(e) => setInterviewType(e.target.value)}
        required
        options={[
            { value: "", label: "Select Interview Type" },
            { value: "AI_SCREENING_TECHNICAL", label: "AI Screening - Technical" },
            { value: "AI_SCREENING_BEHAVIORAL", label: "AI Screening - Behavioral" },
            { value: "HR_INITIAL_CHAT", label: "HR Initial Chat (Manual)" },
        ]}
        placeholder="Select Interview Type"
        containerClassName={styles.formGroup}
        selectClassName={styles.selectField}
        disabled={isSubmitting}
      />

      <Input
        label="Key Skills/Topics for AI Questions (comma-separated)"
        id="keySkills"
        type="text"
        value={keySkills}
        onChange={(e) => setKeySkills(e.target.value)}
        placeholder="e.g., JavaScript, Problem Solving"
        containerClassName={styles.formGroup}
        inputClassName={styles.inputField}
        disabled={isSubmitting}
      />

      <div className={styles.formRow}>
        <Input
            label="Number of Questions (Optional)"
            id="numberOfQuestions"
            type="number"
            value={numberOfQuestions}
            onChange={(e) => setNumberOfQuestions(e.target.value)}
            min="1"
            containerClassName={styles.formGroup}
            inputClassName={styles.inputField}
            disabled={isSubmitting}
        />
        <Select
            label="Difficulty Level (Optional)"
            id="difficultyLevel"
            value={difficultyLevel}
            onChange={(e) => setDifficultyLevel(e.target.value)}
            options={[
                { value: "", label: "Default" },
                { value: "Easy", label: "Easy" },
                { value: "Medium", label: "Medium" },
                { value: "Hard", label: "Hard" },
            ]}
            placeholder="Default"
            containerClassName={styles.formGroup}
            selectClassName={styles.selectField}
            disabled={isSubmitting}
        />
      </div>

      <Textarea
        label="Specific Instructions for Candidate (Optional)"
        id="specificInstructions"
        value={specificInstructions}
        onChange={(e) => setSpecificInstructions(e.target.value)}
        rows={3}
        containerClassName={styles.formGroup}
        textareaClassName={styles.textareaField}
        disabled={isSubmitting}
      />

      <Button type="submit" className={styles.submitButton} isLoading={isSubmitting} disabled={isSubmitting}>
        {isSubmitting ? 'Scheduling...' : 'Schedule Interview'}
      </Button>
    </form>
  );
};

export default ScheduleInterviewForm;
