import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import MainLayout from '../../../components/layout/MainLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { getInterviewDetails, submitAllInterviewResponses, submitInterviewResponse } from '../../../services/interviewAPI'; // Added submitInterviewResponse
import type { Interview, Question, AnswerSubmitPayload } from '../../../services/interviewAPI'; // Removed Answer type
import CodeEditor from '../components/CodeEditor';
import VideoRecorder from '../components/VideoRecorder';
import styles from './InterviewTakingPage.module.css';

const InterviewTakingPage: React.FC = () => {
  const { interviewId } = useParams<{ interviewId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [interview, setInterview] = useState<Interview | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Partial<AnswerSubmitPayload>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // For final submission
  const [isSavingAnswer, setIsSavingAnswer] = useState(false); // For individual answer saving
  const [timeLeft, setTimeLeft] = useState<number | null>(null); // For timer
  const [submittedAnswers, setSubmittedAnswers] = useState<Set<string>>(new Set()); // Track submitted question IDs
  const [showInstructions, setShowInstructions] = useState(true); // New state for instruction view
  const [isReviewing, setIsReviewing] = useState(false); // New state for review mode

  const calculateTotalDuration = useCallback((questions: Question[]): number => {
    return questions.reduce((total, q) => total + q.expected_duration_minutes, 0) * 60; // in seconds
  }, []);

  const handleSubmitInterview = useCallback(async () => {
    if (!interviewId || !interview) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const allAnswersPayload = Object.values(answers).map(a => {
        const payload: Partial<AnswerSubmitPayload> & { question_id: string } = {
          question_id: a.question_id!,
        };
        if (a.answer_text) payload.answer_text = a.answer_text;
        if (a.code_answer) payload.code_answer = a.code_answer;
        if (a.video_url) payload.video_url = a.video_url;
        return payload;
      });
      
      // Filter out answers that are completely empty (e.g. if a question type was not answered)
      // This depends on whether backend expects all answer types or only provided ones.
      // For now, sending all fields even if empty string.
      // Modify if backend expects only non-empty fields.

      await submitAllInterviewResponses({ interview_id: interviewId, answers: allAnswersPayload as Array<Omit<AnswerSubmitPayload, 'interview_id'>> });
      alert('Interview submitted successfully!');
      setTimeLeft(null); // Stop timer
      navigate('/candidate/interviews'); 
    } catch (err) {
      const error = err as Error; // Type assertion
      setError(error.message || 'Failed to submit interview.');
      setIsSubmitting(false);
    }
  }, [interviewId, interview, answers, navigate, setAnswers, setIsSubmitting, setError, setTimeLeft]);

  useEffect(() => {
    if (!interviewId || !currentUser) {
      navigate('/'); // Or to an error page
      return;
    }

    const fetchInterview = async () => {
      setIsLoading(true);
      try {
        const data = await getInterviewDetails(interviewId);
        if (data.status !== 'scheduled' && data.status !== 'pending_questions') { // Or whatever status allows taking
          setError('This interview cannot be taken at this time or is already completed.');
          setInterview(null);
        } else {
          setInterview(data);
          const initialAnswers: Record<string, Partial<AnswerSubmitPayload>> = {};
          let totalDuration = 0;
          data.questions.forEach(q => {
            initialAnswers[q.id] = { 
              question_id: q.id, 
              answer_text: '', 
              code_answer: '', 
              video_url: '' 
            };
            totalDuration += q.expected_duration_minutes;
          });
          setAnswers(initialAnswers);
          setTimeLeft(totalDuration * 60); // Initialize timer
        }
      } catch (err) {
        const error = err as Error; // Type assertion
        setError(error.message || 'Failed to load interview details.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchInterview();
  }, [interviewId, currentUser, navigate, calculateTotalDuration]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) {
      if (timeLeft === 0) {
        console.log("Time is up! Auto-submitting interview...");
        handleSubmitInterview(); // Auto-submit when time is up
      }
      return;
    }
    const timerId = setInterval(() => {
      setTimeLeft(prevTime => (prevTime ? prevTime - 1 : 0));
    }, 1000);
    return () => clearInterval(timerId);
  }, [timeLeft, handleSubmitInterview]);

  const currentQuestion: Question | undefined = interview?.questions[currentQuestionIndex];

  const handleAnswerChange = (value: string, type: 'text' | 'code' | 'video_url') => {
    if (!currentQuestion || submittedAnswers.has(currentQuestion.id)) return; // Prevent changes if answer submitted (optional)
    setAnswers(prev => {
      const currentAnswer = prev[currentQuestion.id] || { question_id: currentQuestion.id };
      if (type === 'text') {
        return { ...prev, [currentQuestion.id]: { ...currentAnswer, answer_text: value } };
      } else if (type === 'code') {
        return { ...prev, [currentQuestion.id]: { ...currentAnswer, code_answer: value } };
      } else if (type === 'video_url') {
        return { ...prev, [currentQuestion.id]: { ...currentAnswer, video_url: value } };
      }
      return prev;
    });
  };

  const submitCurrentAnswer = async (): Promise<boolean> => {
    if (!interviewId || !currentQuestion || !answers[currentQuestion.id]) return false;
    
    const answerPayload: AnswerSubmitPayload = {
      interview_id: interviewId,
      question_id: currentQuestion.id,
      answer_text: answers[currentQuestion.id]?.answer_text || undefined,
      code_answer: answers[currentQuestion.id]?.code_answer || undefined,
      video_url: answers[currentQuestion.id]?.video_url || undefined,
    };

    // Ensure at least one answer type is present
    if (!answerPayload.answer_text && !answerPayload.code_answer && !answerPayload.video_url) {
      // Optionally inform user or just don't submit empty answers
      // For now, we'll allow submitting "empty" if user interacts and then clears.
      // Or, add a check here: console.log("No answer provided for question:", currentQuestion.id); return true; // Skip submission
    }

    setIsSavingAnswer(true);
    setError(null);
    try {
      await submitInterviewResponse(answerPayload);
      setSubmittedAnswers(prev => new Set(prev).add(currentQuestion.id));
      // Optionally show a small success indicator for the saved answer
      console.log(`Answer for question ${currentQuestion.id} saved.`);
      return true;
    } catch (err) {
      const e = err as Error;
      setError(`Failed to save answer for Q${currentQuestionIndex + 1}: ${e.message}`);
      return false;
    } finally {
      setIsSavingAnswer(false);
    }
  };

  const handleNextQuestion = async () => {
    if (currentQuestion && !submittedAnswers.has(currentQuestion.id)) {
      const saved = await submitCurrentAnswer();
      if (!saved && error) { // If saving failed and set an error, don't navigate
        return;
      }
    }
    if (currentQuestionIndex < (interview?.questions.length || 0) - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // If it's the last question, and "Save & Next" is clicked, go to review mode
      setIsReviewing(true);
    }
  };

  const handlePreviousQuestion = () => {
    // Navigation to previous questions might be restricted if answers are final once submitted.
    // For now, allowing it. Consider implications if answers are already submitted.
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const formatTime = (seconds: number | null): string => {
    if (seconds === null) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) return <MainLayout><div>Loading interview...</div></MainLayout>;
  if (error) return <MainLayout><div className={styles.error}>{error} <Link to="/candidate/dashboard">Go to Dashboard</Link></div></MainLayout>;
  
  // Moved interview and currentQuestion check to after instruction display logic
  // if (!interview || !currentQuestion) return <MainLayout><div>Interview data not available.</div></MainLayout>;

  const handleStartInterview = () => {
    setShowInstructions(false);
    // Timer is initialized in the useEffect that fetches interview details.
  };

  const handleEditAnswer = (questionIndex: number) => {
    // Allow jumping back to a question from review mode if answers are not yet final
    // This assumes answers are not "hard-submitted" until the final "Finish & Submit Interview"
    // Or, if per-question submission is final, this button might not be shown or would be disabled.
    // For now, let's assume it allows going back to edit before final submission.
    if (interview && questionIndex >= 0 && questionIndex < interview.questions.length) {
      setCurrentQuestionIndex(questionIndex);
      setIsReviewing(false); // Exit review mode to edit
      // Optionally, clear the 'submitted' status for this question if it was marked
      // setSubmittedAnswers(prev => {
      //   const newSet = new Set(prev);
      //   newSet.delete(interview.questions[questionIndex].id);
      //   return newSet;
      // });
    }
  };
  
  if (showInstructions) {
    return (
      <MainLayout>
        <div className={styles.interviewContainer}>
          <header className={styles.interviewHeader}>
            <h1>Welcome to Your Interview: {interview?.job_title || 'Loading...'}</h1>
          </header>
          <section className={styles.instructionsSection}>
            <h2>Instructions</h2>
            <p>Please read the following instructions carefully before you begin:</p>
            <ul>
              <li>This interview consists of {interview?.questions.length || 'several'} questions.</li>
              <li>Each question may have an expected time duration. A total timer may also be present.</li>
              <li>Ensure you have a stable internet connection.</li>
              <li>For coding questions, you will be provided with a code editor.</li>
              <li>For video questions, ensure your camera and microphone are enabled.</li>
              <li>You can save your answer for each question. Once saved, you might not be able to edit it.</li>
              <li>Navigate using the "Previous" and "Save & Next" buttons.</li>
              <li>Click "Finish & Submit Interview" when you have completed all questions.</li>
            </ul>
            <p>Good luck!</p>
            <button onClick={handleStartInterview} className={styles.startInterviewButton} disabled={isLoading || !interview}>
              {isLoading || !interview ? 'Loading Interview...' : 'Start Interview'}
            </button>
          </section>
        </div>
      </MainLayout>
    );
  }
  
  // Moved these checks here, after instruction display logic
  if (!interview) return <MainLayout><div>Interview data not available. <Link to="/candidate/dashboard">Go to Dashboard</Link></div></MainLayout>;
  // currentQuestion might be undefined if in review mode and no specific question is selected for viewing,
  // but the main interview loop relies on it. For review, we iterate over all questions.

  if (isReviewing) {
    return (
      <MainLayout>
        <div className={styles.interviewContainer}>
          <header className={styles.interviewHeader}>
            <h1>Review Your Answers: {interview.job_title}</h1>
          </header>
          <section className={styles.reviewSection}>
            <h2>Your Submitted Answers</h2>
            {interview.questions.map((q, index) => (
              <div key={q.id} className={styles.reviewQuestionItem}>
                <h3>Question {index + 1}: {q.text}</h3>
                <div className={styles.reviewAnswer}>
                  {q.question_type === 'text' && <p><strong>Your Answer:</strong> {answers[q.id]?.answer_text || 'Not answered'}</p>}
                  {q.question_type === 'code' && <pre><strong>Your Code:</strong><br />{answers[q.id]?.code_answer || 'Not answered'}</pre>}
                  {q.question_type === 'video' && <p><strong>Your Video:</strong> {answers[q.id]?.video_url ? <a href={answers[q.id]?.video_url} target="_blank" rel="noopener noreferrer">View Video</a> : 'Not recorded'}</p>}
                </div>
                <button onClick={() => handleEditAnswer(index)} className={styles.editAnswerButton}>Edit Answer for Q{index + 1}</button>
              </div>
            ))}
          </section>
          <footer className={styles.interviewFooter}>
            <button 
              onClick={handleSubmitInterview} 
              disabled={isSubmitting || isSavingAnswer} // isSavingAnswer might not be relevant here
              className={`${styles.navButton} ${styles.submitAllButton}`}
            >
              {isSubmitting ? 'Submitting...' : 'Finish & Submit Interview'}
            </button>
          </footer>
        </div>
      </MainLayout>
    );
  }
  
  // This check is now critical after the review mode block
  if (!currentQuestion) return <MainLayout><div>Error: Current question not found. <Link to="/candidate/dashboard">Go to Dashboard</Link></div></MainLayout>;

  const renderAnswerInput = () => {
    if (!currentQuestion) return null;

    switch (currentQuestion.question_type) {
      case 'text':
        return (
          <textarea
            className={styles.answerTextarea}
            value={answers[currentQuestion.id]?.answer_text || ''}
            onChange={(e) => handleAnswerChange(e.target.value, 'text')}
            placeholder="Type your answer here..."
            rows={10}
            disabled={isSubmitting || isSavingAnswer || submittedAnswers.has(currentQuestion.id)}
          />
        );
      case 'code':
        return (
          <CodeEditor
            value={answers[currentQuestion.id]?.code_answer || ''}
            onChange={(value) => handleAnswerChange(value, 'code')}
            language={currentQuestion.language || 'javascript'} // Pass language, default to javascript
            disabled={isSubmitting || isSavingAnswer || submittedAnswers.has(currentQuestion.id)}
          />
        );
      case 'video':
        return (
          <VideoRecorder
            onRecordingComplete={(videoUrl) => handleAnswerChange(videoUrl, 'video_url')}
            disabled={isSubmitting || isSavingAnswer || submittedAnswers.has(currentQuestion.id)}
          />
        );
      default:
        return <p>Unsupported question type.</p>;
    }
  };

  return (
    <MainLayout>
      <div className={styles.interviewContainer}>
        <header className={styles.interviewHeader}>
          <h1>{interview.job_title}</h1>
          <div className={styles.interviewMeta}>
            <p>Question {currentQuestionIndex + 1} of {interview.questions.length}</p>
            {timeLeft !== null && <p className={styles.timer}>Time Left: {formatTime(timeLeft)}</p>}
          </div>
        </header>

        <section className={styles.questionSection}>
          <h2>{currentQuestion.category} - {currentQuestion.difficulty} ({currentQuestion.question_type})</h2>
          <p className={styles.questionText}>{currentQuestion.text}</p>
          <p className={styles.durationHint}>Expected duration for this question: {currentQuestion.expected_duration_minutes} mins</p>
        </section>

        <section className={styles.answerSection}>
          {renderAnswerInput()}
          {currentQuestion && !submittedAnswers.has(currentQuestion.id) && (
            <button
              onClick={submitCurrentAnswer}
              disabled={isSavingAnswer || isSubmitting}
              className={styles.saveAnswerButton}
            >
              {isSavingAnswer ? 'Saving...' : 'Save Answer'}
            </button>
          )}
           {currentQuestion && submittedAnswers.has(currentQuestion.id) && (
            <p className={styles.answerSubmittedIndicator}>Answer Submitted &#10004;</p>
          )}
        </section>

        <footer className={styles.interviewFooter}>
          <button 
            onClick={handlePreviousQuestion} 
            disabled={currentQuestionIndex === 0 || isSubmitting || isSavingAnswer}
            className={styles.navButton}
          >
            Previous
          </button>
          {currentQuestionIndex < interview.questions.length - 1 ? (
            <button 
              onClick={handleNextQuestion} 
              disabled={isSubmitting || isSavingAnswer}
              className={styles.navButton}
            >
              {isSavingAnswer && !submittedAnswers.has(currentQuestion?.id || '') ? 'Saving...' : 
               (currentQuestionIndex === interview.questions.length - 1 ? 'Save & Review Answers' : 'Save & Next')}
            </button>
          ) : ( // This case should ideally not be reached if "Save & Review" leads to review mode
            <button 
              onClick={handleSubmitInterview} 
              disabled={isSubmitting || isSavingAnswer}
              className={`${styles.navButton} ${styles.submitAllButton}`}
            >
              {isSubmitting ? 'Submitting...' : 'Finish & Submit Interview'}
            </button>
          )}
        </footer>
      </div>
    </MainLayout>
  );
};

export default InterviewTakingPage;
