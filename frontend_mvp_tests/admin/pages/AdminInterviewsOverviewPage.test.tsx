import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom'; // For Link components
import AdminInterviewsOverviewPage from '../../../frontend/llm-interviewer-ui/src/features/admin/pages/AdminInterviewsOverviewPage'; // Adjusted path
import { useAuth } from '../../../frontend/llm-interviewer-ui/src/contexts/AuthContext'; // Adjusted path
import * as interviewAPI from '../../../frontend/llm-interviewer-ui/src/services/interviewAPI'; // Adjusted path

// Mock useAuth
jest.mock('../../../frontend/llm-interviewer-ui/src/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock interviewAPI
jest.mock('../../../frontend/llm-interviewer-ui/src/services/interviewAPI');

// Mock common components
jest.mock('../../../frontend/llm-interviewer-ui/src/components/layout/MainLayout', () => ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>);
jest.mock('../../../frontend/llm-interviewer-ui/src/components/common/Button/Button', () => (props: any) => <button {...props}>{props.children}</button>);


const mockAdminUser = { id: 'admin001', username: 'superadmin', role: 'admin' };
const mockInterviews: interviewAPI.InterviewSummary[] = [
  { id: 'int1', job_title: 'Software Engineer', status: 'completed', scheduled_at: new Date(Date.now() - 200000).toISOString(), completed_at: new Date(Date.now() - 100000).toISOString() /*, candidate_id: 'cand1', hr_id: 'hr1' */ },
  { id: 'int2', job_title: 'Product Manager', status: 'scheduled', scheduled_at: new Date().toISOString() /*, candidate_id: 'cand2', hr_id: 'hr1' */ },
  { id: 'int3', job_title: 'Data Analyst', status: 'evaluated', scheduled_at: new Date(Date.now() - 300000).toISOString(), completed_at: new Date(Date.now() - 250000).toISOString() /*, candidate_id: 'cand3', hr_id: 'hr2' */ },
];

describe('AdminInterviewsOverviewPage Component', () => {
  const useAuthMock = useAuth as jest.Mock;
  const mockedInterviewAPI = interviewAPI as jest.Mocked<typeof interviewAPI>;

  beforeEach(() => {
    useAuthMock.mockReturnValue({ currentUser: mockAdminUser });
    // Default mock for getAllInterviews to return all items for non-paginated tests
    // The component currently doesn't implement full backend pagination for this endpoint.
    // It sets totalInterviews = data.length, so pagination tests will be illustrative.
    mockedInterviewAPI.getAllInterviews.mockResolvedValue([...mockInterviews]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderOverviewPage = () => {
    return render(
      <BrowserRouter>
        <AdminInterviewsOverviewPage />
      </BrowserRouter>
    );
  };

  it('should display a list of all interviews with key details', async () => {
    renderOverviewPage();
    await waitFor(() => expect(mockedInterviewAPI.getAllInterviews).toHaveBeenCalled());
    
    expect(screen.getByRole('heading', { name: /all interviews overview/i })).toBeInTheDocument();
    expect(screen.getByText(mockInterviews[0].job_title)).toBeInTheDocument();
    expect(screen.getByText(mockInterviews[1].job_title)).toBeInTheDocument();
    expect(screen.getByText(mockInterviews[2].job_title)).toBeInTheDocument();
    expect(screen.getAllByText(/view details/i).length).toBe(mockInterviews.length);
  });

  it('should allow filtering interviews by status', async () => {
    renderOverviewPage();
    await waitFor(() => expect(mockedInterviewAPI.getAllInterviews).toHaveBeenCalledTimes(1)); // Initial fetch
    
    const statusFilter = screen.getByLabelText(/status/i);
    fireEvent.change(statusFilter, { target: { value: 'completed' } });
    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));

    await waitFor(() => expect(mockedInterviewAPI.getAllInterviews).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed', limit: 15, skip: 0 })
    ));
  });
  
  it('should allow filtering by Candidate ID and HR ID', async () => {
    renderOverviewPage();
    await waitFor(() => expect(mockedInterviewAPI.getAllInterviews).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText(/candidate id/i), { target: { value: 'cand1' } });
    fireEvent.change(screen.getByLabelText(/hr id/i), { target: { value: 'hr1' } });
    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));

    await waitFor(() => expect(mockedInterviewAPI.getAllInterviews).toHaveBeenCalledWith(
      expect.objectContaining({ candidate_id: 'cand1', hr_id: 'hr1', limit: 15, skip: 0 })
    ));
  });

  it('should handle illustrative pagination (Previous/Next buttons)', async () => {
    // Simulate more items than ITEMS_PER_PAGE for pagination to appear
    // The component's pagination is illustrative as it sets totalInterviews = data.length
    const manyInterviews = new Array(20).fill(null).map((_, i) => ({ ...mockInterviews[0], id: `int${i}`}));
    mockedInterviewAPI.getAllInterviews.mockResolvedValue(manyInterviews); // First call returns all
    
    renderOverviewPage();
    await waitFor(() => expect(screen.getByText(`Page 1 of ${Math.ceil(20 / 15)}`)).toBeInTheDocument()); // 20 items, 15 per page = 2 pages
    
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(nextButton).not.toBeDisabled();

    // Simulate fetching next page (component logic will refetch with new skip)
    // For this test, we'll assume the component's internal currentPage state updates correctly
    // and would trigger a new fetch if backend pagination was fully supported.
    // Here, we just test the button click and assume the component's useEffect handles the refetch.
    mockedInterviewAPI.getAllInterviews.mockResolvedValue(manyInterviews.slice(15)); // Simulate data for page 2
    fireEvent.click(nextButton);
    
    await waitFor(() => expect(mockedInterviewAPI.getAllInterviews).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 15 }) // skip for page 2
    ));
    // The text might still say "Page 2 of 2" or similar based on how totalPages is calculated
    // and how many items are returned for the second page.
    // For this illustrative pagination, the totalInterviews is based on the last fetch.
    expect(screen.getByText(`Page 2 of ${Math.ceil(5 / 15)}`)).toBeInTheDocument(); // 5 items on page 2, totalPages becomes 1
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });
  
  it('should display "No interviews found" message when appropriate', async () => {
    mockedInterviewAPI.getAllInterviews.mockResolvedValue([]);
    renderOverviewPage();
    await waitFor(() => expect(screen.getByText(/no interviews found matching criteria/i)).toBeInTheDocument());
  });
});
