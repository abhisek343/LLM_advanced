import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom'; // For Link components
import CandidateDashboardPage from '../../../frontend/llm-interviewer-ui/src/features/candidate/pages/CandidateDashboardPage'; // Adjusted path
import { useAuth } from '../../../frontend/llm-interviewer-ui/src/contexts/AuthContext'; // Adjusted path
import { useQuery } from '@tanstack/react-query';

// Mock react-router-dom (if Link components need specific behavior beyond href)
// For now, BrowserRouter should be enough for href checks.

// Mock useAuth
jest.mock('../../../frontend/llm-interviewer-ui/src/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock @tanstack/react-query
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'), // Import and retain default behavior
  useQuery: jest.fn(),
}));

// Mock common components (optional, but can simplify tests if they have complex internal logic)
jest.mock('../../../frontend/llm-interviewer-ui/src/components/layout/MainLayout', () => ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>);
jest.mock('../../../frontend/llm-interviewer-ui/src/components/common/Spinner/Spinner', () => ({ text }: { text: string }) => <div data-testid="spinner">{text}</div>);
jest.mock('../../../frontend/llm-interviewer-ui/src/components/common/Card/Card', () => ({ title, children, className }: { title: string, children: React.ReactNode, className?:string }) => <div data-testid={`card-${title.toLowerCase().replace(/\s+/g, '-')}`} className={className}><h2>{title}</h2><div>{children}</div></div>);
jest.mock('../../../frontend/llm-interviewer-ui/src/components/common/AlertMessage/AlertMessage', () => ({ type, message }: { type: string, message: string }) => <div data-testid="alert-message" className={`alert-${type}`}>{message}</div>);


// Define types for mock data
interface MockUserDetails {
  id: string;
  username: string;
  email: string;
  role: 'candidate';
}
interface MockCandidateProfile {
  id: string;
  user_id: string;
  full_name?: string;
  phone_number?: string;
  linkedin_profile?: string;
  professional_summary?: string;
  resume_path?: string;
  extracted_skills_list?: string[];
  experience?: any[];
  education?: any[];
  profile_status?: string;
}
interface MockInterviewSummary {
  id: string;
  job_title: string;
  scheduled_at: string;
  status: 'scheduled' | 'completed' | 'pending_review';
}
interface MockMessage {
    id: string;
    subject: string;
    content: string;
    sender_username?: string;
    sent_at: string;
    is_read: boolean;
}


const mockCurrentUser: MockUserDetails = { id: 'user1', username: 'testcandidate', email: 'test@example.com', role: 'candidate' };

describe('CandidateDashboardPage Component', () => {
  const useAuthMock = useAuth as jest.Mock;
  const useQueryMock = useQuery as jest.Mock;

  beforeEach(() => {
    useAuthMock.mockReturnValue({ currentUser: mockCurrentUser });
    useQueryMock.mockReset(); // Reset mocks for each test
  });

  const renderDashboard = () => {
    return render(
      <BrowserRouter>
        <CandidateDashboardPage />
      </BrowserRouter>
    );
  };

  it('should display loading spinners initially', () => {
    useQueryMock.mockImplementation((options: { queryKey: string[] }) => {
      if (options.queryKey.includes('candidateProfileDashboard')) return { data: undefined, isLoading: true, error: null };
      if (options.queryKey.includes('upcomingInterviewsDashboard')) return { data: undefined, isLoading: true, error: null };
      if (options.queryKey.includes('candidateRecentMessagesDashboard')) return { data: undefined, isLoading: true, error: null };
      return { data: undefined, isLoading: false, error: null };
    });
    renderDashboard();
    expect(screen.getByTestId('spinner')).toHaveTextContent('Loading dashboard...');
  });

  it('should display welcome message with profile name or username', async () => {
    const profile: MockCandidateProfile = { id: 'p1', user_id: 'user1', full_name: 'Test User FullName' };
    useQueryMock.mockImplementation((options: { queryKey: string[] }) => {
      if (options.queryKey.includes('candidateProfileDashboard')) return { data: profile, isLoading: false, error: null };
      if (options.queryKey.includes('upcomingInterviewsDashboard')) return { data: [], isLoading: false, error: null };
      if (options.queryKey.includes('candidateRecentMessagesDashboard')) return { data: [], isLoading: false, error: null };
      return { data: undefined, isLoading: false, error: null };
    });
    renderDashboard();
    await waitFor(() => expect(screen.getByRole('heading', { name: `Welcome, ${profile.full_name}!` })).toBeInTheDocument());
  });
  
  it('should display profile completion percentage and prompts', async () => {
    const incompleteProfile: MockCandidateProfile = { 
        id: 'p1', user_id: 'user1', full_name: 'Test User', 
        // Missing phone, linkedin, summary, resume, experience, education, skills
    };
    useQueryMock.mockImplementation((options: { queryKey: string[] }) => {
      if (options.queryKey.includes('candidateProfileDashboard')) return { data: incompleteProfile, isLoading: false, error: null };
      // ... other mocks
      return { data: [], isLoading: false, error: null };
    });
    renderDashboard();
    await waitFor(() => {
        expect(screen.getByText(/completion: \d+%$/i)).toBeInTheDocument(); // e.g., Completion: 12%
        expect(screen.getByText(/add your phone number/i)).toBeInTheDocument();
    });
  });

  it('should display "profile is looking great" for 100% completion', async () => {
    const completeProfile: MockCandidateProfile = { 
        id: 'p1', user_id: 'user1', full_name: 'Test User', phone_number: '123', linkedin_profile: 'url',
        professional_summary: 'summary', resume_path: 'path', experience: [{id:'e1'}], education: [{id:'ed1'}], extracted_skills_list: ['skill1']
    };
    useQueryMock.mockImplementation((options: { queryKey: string[] }) => {
      if (options.queryKey.includes('candidateProfileDashboard')) return { data: completeProfile, isLoading: false, error: null };
      return { data: [], isLoading: false, error: null };
    });
    renderDashboard();
    await waitFor(() => {
        expect(screen.getByText(/completion: 100%/i)).toBeInTheDocument();
        expect(screen.getByText(/your profile is looking great!/i)).toBeInTheDocument();
    });
  });

  it('should display upcoming interviews with "Start Interview" links', async () => {
    const interviews: MockInterviewSummary[] = [
      { id: 'int1', job_title: 'Software Engineer', scheduled_at: new Date().toISOString(), status: 'scheduled' },
      { id: 'int2', job_title: 'Product Manager', scheduled_at: new Date().toISOString(), status: 'completed' },
    ];
    useQueryMock.mockImplementation((options: { queryKey: string[] }) => {
      if (options.queryKey.includes('upcomingInterviewsDashboard')) return { data: interviews, isLoading: false, error: null };
      return { data: [], isLoading: false, error: null }; // Default for other queries
    });
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
      expect(screen.getByText('Product Manager')).toBeInTheDocument();
      const startLink = screen.getByRole('link', { name: /start interview/i });
      expect(startLink).toHaveAttribute('href', '/interview/int1/take');
    });
  });

  it('should display "No upcoming interviews scheduled." if none exist', async () => {
    useQueryMock.mockImplementation((options: { queryKey: string[] }) => {
      if (options.queryKey.includes('upcomingInterviewsDashboard')) return { data: [], isLoading: false, error: null };
      return { data: [], isLoading: false, error: null };
    });
    renderDashboard();
    await waitFor(() => expect(screen.getByText('No upcoming interviews scheduled.')).toBeInTheDocument());
  });

  it('should display recent unread messages snippets and count', async () => {
    const messages: MockMessage[] = [
      { id: 'msg1', subject: 'Interview Reminder', content: 'Your interview is tomorrow...', sender_username: 'HR Team', sent_at: new Date().toISOString(), is_read: false },
    ];
     useQueryMock.mockImplementation((options: { queryKey: string[] }) => {
      if (options.queryKey.includes('candidateRecentMessagesDashboard')) return { data: messages, isLoading: false, error: null };
      return { data: [], isLoading: false, error: null };
    });
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText(/you have <strong>1<\/strong> new message\(s\)\./i)).toBeInTheDocument();
      expect(screen.getByText('Interview Reminder')).toBeInTheDocument();
      expect(screen.getByText(/your interview is tomorrow\.\.\./i)).toBeInTheDocument(); // Check for snippet
    });
  });
  
  it('should display "No new messages." if there are no unread messages', async () => {
    useQueryMock.mockImplementation((options: { queryKey: string[] }) => {
      if (options.queryKey.includes('candidateRecentMessagesDashboard')) return { data: [], isLoading: false, error: null };
      return { data: [], isLoading: false, error: null };
    });
    renderDashboard();
    await waitFor(() => expect(screen.getByText('No new messages.')).toBeInTheDocument());
  });

  it('should display quick links', async () => {
    useQueryMock.mockImplementation(() => ({ data: [], isLoading: false, error: null })); // Default for all queries
    renderDashboard();
    await waitFor(() => { // Wait for loading to complete
        expect(screen.getByRole('link', { name: /view my profile/i })).toHaveAttribute('href', '/candidate/profile');
        expect(screen.getByRole('link', { name: /view interview history/i })).toHaveAttribute('href', '/candidate/interviews');
        expect(screen.getByRole('link', { name: /practice questions/i })).toHaveAttribute('href', '/candidate/practice-questions');
    });
  });

  it('should display an overall error message if any query fails', async () => {
    const errorMessage = "Failed to load profile";
    useQueryMock.mockImplementation((options: { queryKey: string[] }) => {
      if (options.queryKey.includes('candidateProfileDashboard')) return { data: null, isLoading: false, error: new Error(errorMessage) };
      return { data: [], isLoading: false, error: null };
    });
    renderDashboard();
    await waitFor(() => {
        expect(screen.getByTestId('alert-message')).toHaveTextContent(`Error loading dashboard data: ${errorMessage}`);
    });
  });
});
