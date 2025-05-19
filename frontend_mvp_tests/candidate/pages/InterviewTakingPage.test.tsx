import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import InterviewTakingPage from '../../../frontend/llm-interviewer-ui/src/features/interview/pages/InterviewTakingPage'; // Adjusted path
import { useAuth } from '../../../frontend/llm-interviewer-ui/src/contexts/AuthContext'; // Adjusted path
import * as interviewAPI from '../../../frontend/llm-interviewer-ui/src/services/interviewAPI'; // Adjusted path

// Mock react-router-dom hooks
const mockNavigate = jest.fn();
const mockUseParams = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => mockUseParams(),
  Link: ({ children, to }: { children: React.ReactNode, to: string }) => <a href={to}>{children}</a>,
}));

// Mock useAuth
jest.mock('../../../frontend/llm-interviewer-ui/src/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock interviewAPI
jest.mock('../../../frontend/llm-interviewer-ui/src/services/interviewAPI');

// Mock sub-components
jest.mock('../../../frontend/llm-interviewer-ui/src/features/interview/components/CodeEditor', () => (props: any) => <textarea data-testid="code-editor" value={props.value} onChange={(e) => props.onChange(e.target.value)} disabled={props.disabled} />);
jest.mock('../../../frontend/llm-interviewer-ui/src/features/interview/components/VideoRecorder', () => (props: any) => <button data-testid="video-recorder" onClick={() => props.onRecordingComplete('fake-video-url.mp4')} disabled={props.disabled}>Record Video</button>);
jest.mock('../../../frontend/llm-interviewer-ui/src/components/layout/MainLayout', () => ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>);


const mockCurrentUser = { id: 'user1', username: 'testcandidate', role: 'candidate' };
const mockInterviewDetails: interviewAPI.Interview = {
  id: 'interview1',
  job_title: 'Software Engineer',
  status: 'scheduled', // or 'pending_questions'
  candidate_id: 'user1',
  // hr_id: 'hr1', // Removed as it's not in Interview type as per TS error
  scheduled_at: new Date().toISOString(),
  questions: [
    { id: 'q1', text: 'Tell me about yourself.', question_type: 'text', category: 'Behavioral', difficulty: 'Easy', expected_duration_minutes: 2, language: undefined },
    { id: 'q2', text: 'Write a function to reverse a string.', question_type: 'code', category: 'Technical', difficulty: 'Medium', expected_duration_minutes: 5, language: 'javascript' },
    { id: 'q3', text: 'Why are you interested in this role?', question_type: 'video', category: 'Motivational', difficulty: 'Easy', expected_duration_minutes: 3, language: undefined },
  ],
  // other fields as per Interview type
};

describe('InterviewTakingPage Component', () => {
  const useAuthMock = useAuth as jest.Mock;
  const mockedInterviewAPI = interviewAPI as jest.Mocked<typeof interviewAPI>;

  beforeEach(() => {
    useAuthMock.mockReturnValue({ currentUser: mockCurrentUser });
    mockUseParams.mockReturnValue({ interviewId: 'interview1' });
    mockedInterviewAPI.getInterviewDetails.mockResolvedValue(mockInterviewDetails);
    // Assuming submitInterviewResponse returns the Answer object or similar, not { message: ... }
    // Using a placeholder that would conform to a generic object type if Answer is complex.
    // If Answer is void, this should be undefined. The error suggests 'message' is not a property.
    mockedInterviewAPI.submitInterviewResponse.mockResolvedValue({} as any); // Placeholder, actual Answer type needed for precise mock
    // submitAllInterviewResponses expects an object with interview_id and status
    mockedInterviewAPI.submitAllInterviewResponses.mockResolvedValue({
      message: 'Interview submitted successfully', // Assuming message is still part of it
      interview_id: 'interview1',
      status: 'completed' // Example status
    });
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const renderPage = () => render(
    <BrowserRouter><InterviewTakingPage /></BrowserRouter>
  );

  it('should initially show instructions and then start the interview', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByRole('heading', { name: /welcome to your interview/i })).toBeInTheDocument());
    expect(screen.getByText(/this interview consists of 3 questions/i)).toBeInTheDocument();
    
    const startButton = screen.getByRole('button', { name: /start interview/i });
    fireEvent.click(startButton);

    await waitFor(() => expect(screen.getByText(`Question 1 of ${mockInterviewDetails.questions.length}`)).toBeInTheDocument());
    expect(screen.getByText(mockInterviewDetails.questions[0].text)).toBeInTheDocument();
  });

  it('should display question details and timer', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /start interview/i })); // Start interview
    await waitFor(() => expect(screen.getByText(mockInterviewDetails.questions[0].text)).toBeInTheDocument());
    
    expect(screen.getByText(/question 1 of 3/i)).toBeInTheDocument();
    expect(screen.getByText(/time left:/i)).toBeInTheDocument(); // Timer should be running
  });

  it('should allow answering different question types', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /start interview/i }));
    await waitFor(() => expect(screen.getByText(mockInterviewDetails.questions[0].text)).toBeInTheDocument());

    // Text question
    const textArea = screen.getByPlaceholderText(/type your answer here/i);
    fireEvent.change(textArea, { target: { value: 'My text answer' } });
    expect(textArea).toHaveValue('My text answer');

    // Navigate to code question
    fireEvent.click(screen.getByRole('button', { name: /save & next/i }));
    await waitFor(() => expect(screen.getByText(mockInterviewDetails.questions[1].text)).toBeInTheDocument());
    const codeEditor = screen.getByTestId('code-editor') as HTMLTextAreaElement;
    fireEvent.change(codeEditor, { target: { value: 'function reverse() {}' } });
    expect(codeEditor.value).toBe('function reverse() {}');

    // Navigate to video question
    fireEvent.click(screen.getByRole('button', { name: /save & next/i }));
    await waitFor(() => expect(screen.getByText(mockInterviewDetails.questions[2].text)).toBeInTheDocument());
    const videoRecorderButton = screen.getByTestId('video-recorder');
    fireEvent.click(videoRecorderButton); // Simulates recording complete
    // Check if answer state updated (indirectly, by checking payload on submit)
  });

  it('should submit individual answer on "Save Answer" and "Save & Next"', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /start interview/i }));
    await waitFor(() => expect(screen.getByText(mockInterviewDetails.questions[0].text)).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/type your answer here/i), { target: { value: 'Answer 1' } });
    fireEvent.click(screen.getByRole('button', { name: /save answer/i }));
    await waitFor(() => expect(mockedInterviewAPI.submitInterviewResponse).toHaveBeenCalledWith(
      expect.objectContaining({ interview_id: 'interview1', question_id: 'q1', answer_text: 'Answer 1' })
    ));
    expect(screen.getByText(/answer submitted/i)).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: /save & next/i })); // This will try to save again if not already submitted
    // If already submitted, it just navigates. If not, it saves then navigates.
    // The mock for submitInterviewResponse is generic, so it will "succeed"
    await waitFor(() => expect(screen.getByText(mockInterviewDetails.questions[1].text)).toBeInTheDocument());
  });
  
  it('should navigate between questions', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /start interview/i }));
    await waitFor(() => expect(screen.getByText(mockInterviewDetails.questions[0].text)).toBeInTheDocument());

    // Next
    fireEvent.click(screen.getByRole('button', { name: /save & next/i }));
    await waitFor(() => expect(screen.getByText(mockInterviewDetails.questions[1].text)).toBeInTheDocument());
    expect(screen.getByText(/question 2 of 3/i)).toBeInTheDocument();

    // Previous
    fireEvent.click(screen.getByRole('button', { name: /previous/i }));
    await waitFor(() => expect(screen.getByText(mockInterviewDetails.questions[0].text)).toBeInTheDocument());
    expect(screen.getByText(/question 1 of 3/i)).toBeInTheDocument();
  });

  it('should enter review mode after the last question', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /start interview/i }));
    // Navigate to last question
    await waitFor(() => expect(screen.getByText(mockInterviewDetails.questions[0].text)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /save & next/i }));
    await waitFor(() => expect(screen.getByText(mockInterviewDetails.questions[1].text)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /save & next/i }));
    await waitFor(() => expect(screen.getByText(mockInterviewDetails.questions[2].text)).toBeInTheDocument());

    // Click "Save & Review Answers" (which is what "Save & Next" becomes on last question)
    fireEvent.click(screen.getByRole('button', { name: /save & review answers/i }));
    await waitFor(() => expect(screen.getByRole('heading', { name: /review your answers/i })).toBeInTheDocument());
    expect(screen.getByText(mockInterviewDetails.questions[0].text)).toBeInTheDocument(); // Check if questions are listed for review
  });
  
  it('should allow editing an answer from review mode', async () => {
    renderPage();
    // Go through to review mode
    fireEvent.click(screen.getByRole('button', { name: /start interview/i }));
    await waitFor(() => {}); // initial load
    fireEvent.click(screen.getByRole('button', { name: /save & next/i })); // Q1 -> Q2
    await waitFor(() => {});
    fireEvent.click(screen.getByRole('button', { name: /save & next/i })); // Q2 -> Q3
    await waitFor(() => {});
    fireEvent.click(screen.getByRole('button', { name: /save & review answers/i })); // Q3 -> Review
    await waitFor(() => expect(screen.getByRole('heading', { name: /review your answers/i })).toBeInTheDocument());

    // Click edit for Q1
    fireEvent.click(screen.getByRole('button', { name: /edit answer for q1/i }));
    await waitFor(() => expect(screen.getByText(mockInterviewDetails.questions[0].text)).toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: /review your answers/i })).not.toBeInTheDocument(); // Exited review mode
  });

  it('should auto-submit when timer reaches zero', async () => {
    mockInterviewDetails.questions[0].expected_duration_minutes = 0.02; // ~1 second for testing
    mockedInterviewAPI.getInterviewDetails.mockResolvedValueOnce(mockInterviewDetails); // Use this modified detail
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /start interview/i }));
    await waitFor(() => expect(screen.getByText(mockInterviewDetails.questions[0].text)).toBeInTheDocument());

    act(() => { jest.advanceTimersByTime( (mockInterviewDetails.questions.reduce((sum, q) => sum + q.expected_duration_minutes, 0) * 60 * 1000) + 1000 ); }); // Advance past total time

    await waitFor(() => expect(mockedInterviewAPI.submitAllInterviewResponses).toHaveBeenCalled());
    expect(mockNavigate).toHaveBeenCalledWith('/candidate/interviews');
  });

  it('should submit all answers on final submission and navigate', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /start interview/i }));
    // Go to review mode
    await waitFor(() => {}); 
    fireEvent.click(screen.getByRole('button', { name: /save & next/i })); 
    await waitFor(() => {});
    fireEvent.click(screen.getByRole('button', { name: /save & next/i })); 
    await waitFor(() => {});
    fireEvent.click(screen.getByRole('button', { name: /save & review answers/i }));
    await waitFor(() => expect(screen.getByRole('heading', { name: /review your answers/i })).toBeInTheDocument());

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /finish & submit interview/i }));
    expect(screen.getByRole('button', { name: /submitting.../i})).toBeDisabled();
    await waitFor(() => expect(mockedInterviewAPI.submitAllInterviewResponses).toHaveBeenCalledWith(
      expect.objectContaining({ interview_id: 'interview1' })
    ));
    expect(mockNavigate).toHaveBeenCalledWith('/candidate/interviews');
  });
});
