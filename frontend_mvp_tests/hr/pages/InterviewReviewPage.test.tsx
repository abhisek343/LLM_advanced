import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom'; // For Link component
import InterviewReviewPage from '../../../frontend/llm-interviewer-ui/src/features/hr/pages/InterviewReviewPage'; // Adjusted path
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

// Mock common components
jest.mock('../../../frontend/llm-interviewer-ui/src/components/layout/MainLayout', () => ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>);


const mockCurrentUser = { id: 'hrUser1', username: 'hrTestUser', role: 'hr' };
const mockInterviewResultData: interviewAPI.InterviewResult = {
  interview_id: 'interview123',
  candidate_id: 'cand1', // Added based on component usage
  job_title: 'Senior Software Engineer',
  interview_date: new Date().toISOString(),
  overall_score: 78.5,
  overall_feedback: 'Candidate showed good problem-solving skills but lacked depth in system design.',
  status: 'pending_hr_review', // Status indicating AI evaluation is done
  questions: [
    {
      question_id: 'q1',
      question_text: 'Describe a challenging project you worked on.',
      candidate_answer_text: 'I worked on a project that involved migrating a legacy system...',
      ai_score: 80,
      ai_feedback: 'Good description of the project and challenges.',
      // HR fields might be null/undefined initially
      hr_score: undefined,
      hr_feedback: undefined,
    },
    {
      question_id: 'q2',
      question_text: 'Write a function to find the median of two sorted arrays.',
      candidate_code_answer: 'function findMedian(...) { /* ... */ }',
      candidate_video_url: 'http://example.com/video_q2.mp4',
      ai_score: 75,
      ai_feedback: 'The code is partially correct but has some edge case issues.',
      hr_score: undefined,
      hr_feedback: undefined,
    },
  ],
  // hr_overall_feedback, hr_recommendation, hr_overall_score might be null/undefined initially
  hr_overall_feedback: null,
  hr_recommendation: null,
  hr_overall_score: null,
  hr_per_question_evaluations: [], // Initially empty or null
};


describe('InterviewReviewPage (HR View) Component', () => {
  const useAuthMock = useAuth as jest.Mock;
  const mockedInterviewAPI = interviewAPI as jest.Mocked<typeof interviewAPI>;

  beforeEach(() => {
    useAuthMock.mockReturnValue({ currentUser: mockCurrentUser });
    mockUseParams.mockReturnValue({ interviewId: 'interview123' });
    mockedInterviewAPI.getInterviewResults.mockResolvedValue(mockInterviewResultData);
    mockedInterviewAPI.submitHrEvaluation.mockImplementation(async (_id, payload) => {
      // Simulate backend merging evaluation into results
      return { 
        ...mockInterviewResultData, 
        hr_overall_feedback: payload.hr_feedback,
        hr_recommendation: payload.hr_recommendation,
        hr_overall_score: payload.hr_score,
        hr_per_question_evaluations: payload.per_question_evaluations?.map(pqe => ({...pqe, question_text: 'mock text'})), // Add question_text if needed by type
        status: 'evaluated_by_hr'
      };
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderReviewPage = () => {
    return render(
      <BrowserRouter>
        <InterviewReviewPage />
      </BrowserRouter>
    );
  };

  it('should display AI evaluation summary, candidate ID, and interview date', async () => {
    renderReviewPage();
    await waitFor(() => expect(mockedInterviewAPI.getInterviewResults).toHaveBeenCalledWith('interview123'));
    
    expect(screen.getByRole('heading', { name: /review interview: senior software engineer/i })).toBeInTheDocument();
    expect(screen.getByText(`Candidate ID: ${mockInterviewResultData.candidate_id} (Name: Placeholder)`)).toBeInTheDocument();
    expect(screen.getByText(`Interview Date: ${new Date(mockInterviewResultData.interview_date!).toLocaleDateString()}`)).toBeInTheDocument();
    expect(screen.getByText(`Overall AI Score: ${mockInterviewResultData.overall_score?.toFixed(1)}`)).toBeInTheDocument();
    expect(screen.getByText(mockInterviewResultData.overall_feedback!)).toBeInTheDocument();
  });

  it('should display per-question breakdown with candidate answers and AI feedback', async () => {
    renderReviewPage();
    await waitFor(() => expect(screen.getByText(mockInterviewResultData.questions[0].question_text)).toBeInTheDocument());

    const q1 = mockInterviewResultData.questions[0];
    expect(screen.getByText(q1.candidate_answer_text!)).toBeInTheDocument();
    expect(screen.getByText(`Score: ${q1.ai_score?.toFixed(1)}`)).toBeInTheDocument(); // AI Score for Q1
    expect(screen.getByText(q1.ai_feedback!)).toBeInTheDocument();
  });

  it('should render video player for video answers', async () => {
    renderReviewPage();
    await waitFor(() => expect(screen.getByText(mockInterviewResultData.questions[1].question_text)).toBeInTheDocument());
    
    const videoPlayer = screen.getByRole('video', { hidden: true }); // Videos might be hidden until interacted with or by CSS
    expect(videoPlayer).toBeInTheDocument();
    expect(videoPlayer).toHaveAttribute('src', mockInterviewResultData.questions[1].candidate_video_url);
  });

  it('should allow HR to input overall evaluation and per-question notes/scores', async () => {
    renderReviewPage();
    await waitFor(() => expect(screen.getByLabelText(/overall feedback/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/overall feedback/i), { target: { value: 'Excellent candidate.' } });
    fireEvent.change(screen.getByLabelText(/overall score/i), { target: { value: '4.5' } });
    fireEvent.change(screen.getByLabelText(/recommendation/i), { target: { value: 'proceed_to_next_round' } });
    
    const q1NotesInput = screen.getByLabelText(`Notes:`, { selector: `#hr_notes_${mockInterviewResultData.questions[0].question_id}` });
    fireEvent.change(q1NotesInput, { target: { value: 'Very articulate.' } });
    const q1ScoreInput = screen.getByLabelText(`Score (1-5):`, { selector: `#hr_question_score_${mockInterviewResultData.questions[0].question_id}` });
    fireEvent.change(q1ScoreInput, { target: { value: '5' } });

    expect(screen.getByLabelText(/overall feedback/i)).toHaveValue('Excellent candidate.');
    expect(q1NotesInput).toHaveValue('Very articulate.');
    expect(q1ScoreInput).toHaveValue(5);
  });

  it('should call submitHrEvaluation with correct payload on form submission', async () => {
    renderReviewPage();
    await waitFor(() => expect(screen.getByLabelText(/overall feedback/i)).toBeInTheDocument());

    // Fill form
    fireEvent.change(screen.getByLabelText(/overall feedback/i), { target: { value: 'Great fit.' } });
    fireEvent.change(screen.getByLabelText(/recommendation/i), { target: { value: 'proceed_to_next_round' } });
    fireEvent.change(screen.getByLabelText(/overall score/i), { target: { value: '4' } });
    
    const q1Id = mockInterviewResultData.questions[0].question_id;
    fireEvent.change(screen.getByLabelText('Notes:', { selector: `#hr_notes_${q1Id}` }), { target: { value: 'Good answer for Q1.' } });
    fireEvent.change(screen.getByLabelText('Score (1-5):', { selector: `#hr_question_score_${q1Id}` }), { target: { value: '4' } });

    fireEvent.click(screen.getByRole('button', { name: /submit evaluation/i }));
    
    expect(screen.getByRole('button', { name: /submitting evaluation.../i})).toBeDisabled();

    await waitFor(() => {
      expect(mockedInterviewAPI.submitHrEvaluation).toHaveBeenCalledWith(
        'interview123',
        expect.objectContaining({
          hr_feedback: 'Great fit.',
          hr_recommendation: 'proceed_to_next_round',
          hr_score: 4,
          per_question_evaluations: expect.arrayContaining([
            expect.objectContaining({
              question_id: q1Id,
              hr_notes: 'Good answer for Q1.',
              hr_question_score: 4,
            })
          ])
        })
      );
    });
    expect(await screen.findByText('HR evaluation submitted successfully!')).toBeVisible();
  });
  
  it('should show error if required overall fields are missing on submit', async () => {
    renderReviewPage();
    await waitFor(() => expect(screen.getByLabelText(/overall feedback/i)).toBeInTheDocument());
    
    fireEvent.click(screen.getByRole('button', { name: /submit evaluation/i }));
    expect(await screen.findByText('Overall HR Feedback and Recommendation are required.')).toBeVisible();
    expect(mockedInterviewAPI.submitHrEvaluation).not.toHaveBeenCalled();
  });
});
