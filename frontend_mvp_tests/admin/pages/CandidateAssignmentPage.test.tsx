import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom'; // For Link components
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import CandidateAssignmentPage from '../../../frontend/llm-interviewer-ui/src/features/admin/pages/CandidateAssignmentPage'; // Adjusted path
import { useAuth } from '../../../frontend/llm-interviewer-ui/src/contexts/AuthContext'; // Adjusted path
import * as adminAPI from '../../../frontend/llm-interviewer-ui/src/services/adminAPI'; // Adjusted path

// Mock useAuth
jest.mock('../../../frontend/llm-interviewer-ui/src/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock adminAPI
jest.mock('../../../frontend/llm-interviewer-ui/src/services/adminAPI');

// Mock common components
jest.mock('../../../frontend/llm-interviewer-ui/src/components/layout/MainLayout', () => ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>);
jest.mock('../../../frontend/llm-interviewer-ui/src/components/common/Button/Button', () => (props: any) => <button {...props} onClick={props.onClick} data-testid={props.children?.toString().toLowerCase().includes('assign') ? 'assign-hr-button' : undefined}>{props.children}</button>);
jest.mock('../../../frontend/llm-interviewer-ui/src/components/common/Select/Select', () => (props: any) => <select data-testid={`select-hr-for-${props['data-candidateid'] || 'candidate'}`} value={props.value} onChange={props.onChange} disabled={props.disabled}>{props.options.map((opt:any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select>);
jest.mock('../../../frontend/llm-interviewer-ui/src/components/common/Input/Input', () => (props: any) => <input {...props} data-testid="search-input" />);


const mockAdminUser = { id: 'admin001', username: 'superadmin', role: 'admin' };
const mockCandidates: adminAPI.UserManagementInfo[] = [
  { id: 'cand1', username: 'candidateone', email: 'c1@test.com', role: 'candidate', is_active: true, created_at: '2023-01-01T00:00:00Z', assigned_hr_id: null },
  { id: 'cand2', username: 'candidatetwo', email: 'c2@test.com', role: 'candidate', is_active: true, created_at: '2023-01-02T00:00:00Z', assigned_hr_id: 'hr1' }, // Already assigned
  { id: 'cand3', username: 'candidatethree', email: 'c3@test.com', role: 'candidate', is_active: true, created_at: '2023-01-03T00:00:00Z', assigned_hr_id: undefined },
];
const mockHrs: adminAPI.UserManagementInfo[] = [
  { id: 'hr1', username: 'hrone', email: 'hr1@test.com', role: 'hr', is_active: true, created_at: '2023-01-01T00:00:00Z', company: 'Company A', assigned_candidates_count: 5 },
  { id: 'hr2', username: 'hrtwo', email: 'hr2@test.com', role: 'hr', is_active: true, created_at: '2023-01-01T00:00:00Z', company: 'Company B', assigned_candidates_count: 2 },
];

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });

describe('CandidateAssignmentPage Component', () => {
  const useAuthMock = useAuth as jest.Mock;
  const mockedAdminAPI = adminAPI as jest.Mocked<typeof adminAPI>;
  
  // Store mock for useQuery to control its return value per queryKey
  let useQueryImplementation: any;

  beforeEach(() => {
    useAuthMock.mockReturnValue({ currentUser: mockAdminUser });
    
    // Default implementation for useQuery
    useQueryImplementation = (options: { queryKey: string[] }) => {
      if (options.queryKey.includes('allCandidatesForAssignment')) {
        return { data: { items: mockCandidates, total: mockCandidates.length, page: 1, pages: 1, size: 10 }, isLoading: false, error: null, refetch: jest.fn() };
      }
      if (options.queryKey.includes('mappedHrsForAdmin')) {
        return { data: { items: mockHrs, total: mockHrs.length, page: 1, pages: 1, size: 10 }, isLoading: false, error: null };
      }
      return { data: undefined, isLoading: false, error: null, refetch: jest.fn() };
    };
    (adminAPI.getAllUsers as jest.Mock).mockImplementation((params) => {
        if(params?.role === 'candidate') return Promise.resolve({ items: mockCandidates, total: mockCandidates.length, page: 1, pages: 1, size: 10 });
        if(params?.role === 'hr') return Promise.resolve({ items: mockHrs, total: mockHrs.length, page: 1, pages: 1, size: 10 });
        return Promise.resolve({ items: [], total: 0, page: 1, pages: 0, size: 10 });
    });
    mockedAdminAPI.assignHrToCandidate.mockImplementation(async (candidateId, hrId) => {
        const candidate = mockCandidates.find(c => c.id === candidateId);
        return {...candidate!, assigned_hr_id: hrId };
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  const renderPage = () => {
    // Apply the current implementation to the mock before rendering
    (useQuery as jest.Mock).mockImplementation(useQueryImplementation);
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <CandidateAssignmentPage />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it('should list unassigned candidates and allow searching', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('candidateone')).toBeInTheDocument(); // Unassigned
      expect(screen.getByText('candidatethree')).toBeInTheDocument(); // Unassigned
      expect(screen.queryByText('candidatetwo')).not.toBeInTheDocument(); // Assigned
    });

    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'one' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => {
      expect(mockedAdminAPI.getAllUsers).toHaveBeenCalledWith(expect.objectContaining({ role: 'candidate', search_term: 'one' }));
    });
  });

  it('should allow selecting a mapped HR from a dropdown displaying HR load', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('candidateone')).toBeInTheDocument());

    // Find select for candidateone (cand1)
    // The data-testid for select is tricky due to its dynamic nature in the mock.
    // Let's find it by its association with the candidate.
    const candidateOneItem = screen.getByText('candidateone').closest('li');
    const hrSelect = candidateOneItem?.querySelector('select');
    expect(hrSelect).toBeInTheDocument();

    if (hrSelect) {
      expect(hrSelect.options.length).toBeGreaterThan(1); // Placeholder + HRs
      expect(hrSelect.options[1].text).toContain(`hrone (Company A) - Load: ${mockHrs[0].assigned_candidates_count}`);
      fireEvent.change(hrSelect, { target: { value: mockHrs[0].id } });
      expect(hrSelect).toHaveValue(mockHrs[0].id);
    }
  });

  it('should call adminAPI.assignHrToCandidate when assigning an HR', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('candidateone')).toBeInTheDocument());

    const candidateOneItem = screen.getByText('candidateone').closest('li');
    const hrSelect = candidateOneItem?.querySelector('select');
    const assignButton = candidateOneItem?.querySelector('button[data-testid="assign-hr-button"]');
    
    expect(hrSelect).toBeInTheDocument();
    expect(assignButton).toBeInTheDocument();

    if (hrSelect && assignButton) {
      fireEvent.change(hrSelect, { target: { value: mockHrs[0].id } }); // Select hrone
      fireEvent.click(assignButton);

      await waitFor(() => {
        expect(mockedAdminAPI.assignHrToCandidate).toHaveBeenCalledWith('cand1', mockHrs[0].id);
      });
      expect(screen.getByText(`HR assigned successfully to candidateone.`)).toBeVisible();
    }
  });
  
  it('should show error if no HR is selected on assign attempt', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('candidateone')).toBeInTheDocument());

    const candidateOneItem = screen.getByText('candidateone').closest('li');
    const assignButton = candidateOneItem?.querySelector('button[data-testid="assign-hr-button"]');
    if (assignButton) fireEvent.click(assignButton);

    expect(await screen.findByText('Please select an HR to assign.')).toBeVisible();
    expect(mockedAdminAPI.assignHrToCandidate).not.toHaveBeenCalled();
  });
});
