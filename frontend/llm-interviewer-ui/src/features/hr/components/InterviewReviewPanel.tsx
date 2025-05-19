import React, { useState } from 'react';
import styles from './InterviewReviewPanel.module.css'; 
import Button from '../../../components/common/Button';   // Already using common Button
import Textarea from '../../../components/common/Textarea'; // Import common Textarea
import Select from '../../../components/common/Select';   // Import common Select
import Input from '../../../components/common/Input';     // Import common Input for score

// Local mock Button removed.

// Types from InterviewReviewPage
export interface Answer {
  questionText: string;
  candidateAnswer: string;
  aiScore?: number | string;
  aiFeedback?: string;
  // hrNotes and hrScore will be managed internally by this component or passed if needed
}

export interface InterviewData {
  interviewId: string;
  jobTitle: string;
  candidateName: string;
  interviewDate: string;
  overallAIScore?: number | string;
  answers: Answer[];
}

export interface HREvaluation {
  overallFeedback: string;
  overallScore: string;
  recommendation: string;
}

export interface HREvaluationPayload extends HREvaluation {
    answers: Array<{ questionText: string; hrNotes?: string; hrScore?: string | number }>;
}

interface InterviewReviewPanelProps {
  interviewData: InterviewData;
  onSubmitEvaluation: (evaluation: HREvaluationPayload) => Promise<void>;
  isSubmitting: boolean;
  submissionError?: string | null;
  submissionSuccess?: string | null;
}

const InterviewReviewPanel: React.FC<InterviewReviewPanelProps> = ({
  interviewData,
  onSubmitEvaluation,
  isSubmitting,
  submissionError,
  submissionSuccess,
}) => {
  const [hrEvaluation, setHrEvaluation] = useState<HREvaluation>({
    overallFeedback: '',
    overallScore: '',
    recommendation: '',
  });
  const [answerEvals, setAnswerEvals] = useState<Array<{hrNotes?: string, hrScore?: string | number}>>(
    interviewData.answers.map(() => ({ hrNotes: '', hrScore: '' }))
  );

  const handleHrEvalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setHrEvaluation(prev => ({ ...prev, [name]: value }));
  };
  
  const handleAnswerEvalChange = (index: number, field: 'hrNotes' | 'hrScore', value: string) => {
    setAnswerEvals(prev => {
        const newEvals = [...prev];
        newEvals[index] = {...newEvals[index], [field]: value};
        return newEvals;
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const finalEvaluation: HREvaluationPayload = {
      ...hrEvaluation,
      answers: interviewData.answers.map((ans, idx) => ({
        questionText: ans.questionText,
        hrNotes: answerEvals[idx]?.hrNotes,
        hrScore: answerEvals[idx]?.hrScore,
      }))
    };
    onSubmitEvaluation(finalEvaluation);
  };

  return (
    <>
      <section className={styles.questionsAnswersSection}>
        <h2>Questions & Answers</h2>
        {interviewData.answers.map((answer, index) => (
          <div key={index} className={styles.qaBlock}>
            <h3 className={styles.questionText}>Question {index + 1}: {answer.questionText}</h3>
            <div className={styles.answerContent}>
              <h4>Candidate's Answer:</h4>
              <p className={styles.candidateAnswer}>{answer.candidateAnswer}</p>
            </div>
            {answer.aiFeedback && (
              <div className={styles.aiFeedback}>
                <h4>AI Analysis:</h4>
                {answer.aiScore && <p><strong>AI Score:</strong> {answer.aiScore}</p>}
                <p>{answer.aiFeedback}</p>
              </div>
            )}
            <div className={styles.hrNotesForAnswer}>
                <Textarea
                    label="Your Notes for this Answer (Optional):"
                    id={`hrNotesQ${index}_panel`}
                    value={answerEvals[index]?.hrNotes || ''}
                    onChange={(e) => handleAnswerEvalChange(index, 'hrNotes', e.target.value)}
                    rows={2}
                    textareaClassName={styles.textareaFieldSmall}
                    placeholder="Your notes on this specific answer..."
                    disabled={isSubmitting}
                    containerClassName={styles.formGroupSmall}
                />
                <Input
                    label="Your Score for this Answer (Optional):"
                    type="text" 
                    id={`hrScoreQ${index}_panel`}
                    value={answerEvals[index]?.hrScore || ''}
                    onChange={(e) => handleAnswerEvalChange(index, 'hrScore', e.target.value)}
                    inputClassName={styles.inputFieldSmall}
                    placeholder="e.g., 1-5, A-F"
                    disabled={isSubmitting}
                    containerClassName={styles.formGroupSmall}
                />
            </div>
          </div>
        ))}
      </section>

      <form onSubmit={handleSubmit} className={styles.hrEvaluationForm}>
        <h2>HR Overall Evaluation</h2>
        {submissionError && <p className={styles.errorMessage}>{submissionError}</p>}
        {submissionSuccess && <p className={styles.successMessage}>{submissionSuccess}</p>}

        <Textarea
          label="Overall Feedback"
          id="overallFeedback_panel"
          name="overallFeedback"
          value={hrEvaluation.overallFeedback}
          onChange={handleHrEvalChange}
          rows={5}
          required
          containerClassName={styles.formGroup}
          textareaClassName={styles.textareaField}
          disabled={isSubmitting}
        />

        <div className={styles.formRow}>
            <Input
                label="Overall Score/Rating (e.g., 1-5)"
                type="text"
                id="overallScore_panel"
                name="overallScore"
                value={hrEvaluation.overallScore}
                onChange={handleHrEvalChange}
                containerClassName={styles.formGroup}
                inputClassName={styles.inputField}
                placeholder="e.g., 4/5, Strong Hire"
                disabled={isSubmitting}
            />
            <Select
                label="Recommendation"
                id="recommendation_panel"
                name="recommendation"
                value={hrEvaluation.recommendation}
                onChange={handleHrEvalChange}
                required
                options={[
                    { value: "", label: "Select Recommendation" },
                    { value: "Proceed to Next Step", label: "Proceed to Next Step" },
                    { value: "Hold", label: "Hold" },
                    { value: "Reject", label: "Reject" },
                    { value: "Further Review Needed", label: "Further Review Needed" },
                ]}
                placeholder="Select Recommendation"
                containerClassName={styles.formGroup}
                selectClassName={styles.selectField}
                disabled={isSubmitting}
            />
        </div>
        
        <Button type="submit" className={styles.submitButton} isLoading={isSubmitting} disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit HR Evaluation'}
        </Button>
      </form>
    </>
  );
};

export default InterviewReviewPanel;
