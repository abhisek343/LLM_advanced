import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom'; // For Link component
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CandidateInterviewResultsPage from '../../../frontend/llm-interviewer-ui/src/features/candidate/pages/CandidateInterviewResultsPage'; // Adjusted path
import { useAuth } from '../../../frontend/llm-interviewer-ui/src/contexts/AuthContext'; // Adjusted path
import * as interviewAPI from '../../../frontend/llm-interviewer-ui/src/services/interviewAPI'; // Adjusted path

// Mock react-router-dom hooks
const mockUseParams = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => mockUseParams(),
  Link: ({ children, to }: { children: React.ReactNode, to: string }) => <a href={to}>{children}</a>,
}));

// Mock useAuth
jest.mock('../../../frontend/llm-interviewer-ui/src/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock @tanstack/react-query's useQuery
const mockUseQuery = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: (options: any) => mockUseQuery(options), // Allow passing options to mock
}));


// Mock common components
jest.mock('../../../frontend/llm-interviewer-ui/src/components/layout/MainLayout', () => ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>);


const mockCurrentUser = { id: 'user1', username: 'testcandidate', role: 'candidate' };
const mockInterviewResult: interviewAPI.InterviewResult = {
  interview_id: 'interview1',
  candidate_id: 'user1', // Added missing field
  job_title: 'Software Engineer',
  interview_date: new Date().toISOString(),
  overall_score: 85,
  overall_feedback: 'Good performance overall.',
  status: 'evaluated_by_hr', // Or 'completed_hr_review'
  hr_recommendation: 'Proceed to next round',
  questions: [
    {
      question_id: 'q1',
      question_text: 'Tell me about yourself.',
      candidate_answer_text: 'I am a dedicated developer...',
      ai_score: 80,
      ai_feedback: 'Good summary.',
      hr_score: 85,
      hr_feedback: 'Confident answer.',
    },
    {
      question_id: 'q2',
      question_text: 'Explain a complex project.',
      candidate_video_url: 'http://example.com/video.mp4',
      ai_score: 90,
      ai_feedback: 'Clear explanation.',
      hr_score: 88,
      hr_feedback: 'Well-articulated.',
    },
  ],
};

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } } 
});


describe('CandidateInterviewResultsPage Component', () => {
  const useAuthMock = useAuth as jest.Mock;

  beforeEach(() => {
    useAuthMock.mockReturnValue({ currentUser: mockCurrentUser });
    mockUseParams.mockReturnValue({ interviewId: 'interview1' });
    mockUseQuery.mockReset(); // Reset mock before each test
  });

  const renderPage = () => render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <CandidateInterviewResultsPage />
      </BrowserRouter>
    </QueryClientProvider>
  );

  it('should display loading state initially', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true, error: null });
    renderPage();
    expect(screen.getByText(/loading interview results.../i)).toBeInTheDocument();
  });

  it('should display error message if data fetching fails', async () => {
    const errorMessage = 'Failed to fetch results';
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: new Error(errorMessage) });
    renderPage();
    await waitFor(() => expect(screen.getByText(`Error loading results: ${errorMessage}`)).toBeInTheDocument());
  });

  it('should display "results not found" if no data is returned', async () => {
    mockUseQuery.mockReturnValue({ data: null, isLoading: false, error: null });
    renderPage();
    await waitFor(() => expect(screen.getByText(/interview results not found/i)).toBeInTheDocument());
  });

  it('should display overall interview summary including interview date', async () => {
    mockUseQuery.mockReturnValue({ data: mockInterviewResult, isLoading: false, error: null });
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: `Interview Results: ${mockInterviewResult.job_title}` })).toBeInTheDocument();
      expect(screen.getByText(`Interview ID: ${mockInterviewResult.interview_id}`)).toBeInTheDocument();
      expect(screen.getByText(`Date: ${new Date(mockInterviewResult.interview_date!).toLocaleString()}`)).toBeInTheDocument();
      expect(screen.getByText(`Overall Score: ${mockInterviewResult.overall_score}`)).toBeInTheDocument();
      expect(screen.getByText(mockInterviewResult.overall_feedback!)).toBeInTheDocument();
      expect(screen.getByText(mockInterviewResult.status)).toBeInTheDocument();
      expect(screen.getByText(`HR Recommendation: ${mockInterviewResult.hr_recommendation}`)).toBeInTheDocument();
    });
  });

  it('should display per-question breakdown with answers and feedback', async () => {
    mockUseQuery.mockReturnValue({ data: mockInterviewResult, isLoading: false, error: null });
    renderPage();
    const question1 = mockInterviewResult.questions[0];
    const question2 = mockInterviewResult.questions[1];

    await waitFor(() => {
      expect(screen.getByText(`Question 1: ${question1.question_text}`)).toBeInTheDocument();
      expect(screen.getByText(question1.candidate_answer_text!)).toBeInTheDocument();
      expect(screen.getByText(`AI Score: ${question1.ai_score}`)).toBeInTheDocument();
      expect(screen.getByText(question1.ai_feedback!)).toBeInTheDocument();
      expect(screen.getByText(`HR Score: ${question1.hr_score}`)).toBeInTheDocument();
      expect(screen.getByText(question1.hr_feedback!)).toBeInTheDocument();

      expect(screen.getByText(`Question 2: ${question2.question_text}`)).toBeInTheDocument();
    });
  });

  it('should render an HTML5 video player for video answers', async () => {
    mockUseQuery.mockReturnValue({ data: mockInterviewResult, isLoading: false, error: null });
    renderPage();
    await waitFor(() => {
      const videoElement = screen.getByRole('region', { name: /your video answer/i }).querySelector('video');
      expect(videoElement).toBeInTheDocument();
      expect(videoElement).toHaveAttribute('src', mockInterviewResult.questions[1].candidate_video_url);
      expect(videoElement).toHaveAttribute('controls');
    });
  });
  
  it('should display "Back to My Interviews" link', async () => {
    mockUseQuery.mockReturnValue({ data: mockInterviewResult, isLoading: false, error: null });
    renderPage();
    await waitFor(() => {
        const backLink = screen.getByRole('link', { name: /back to my interviews/i });
        expect(backLink).toBeInTheDocument();
        expect(backLink).toHaveAttribute('href', '/candidate/interviews');
    });
  });
});
