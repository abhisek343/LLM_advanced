import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom'; // For Link components
import CandidateSearchPage from '../../../frontend/llm-interviewer-ui/src/features/hr/pages/CandidateSearchPage'; // Adjusted path
import { useAuth } from '../../../frontend/llm-interviewer-ui/src/contexts/AuthContext'; // Adjusted path
import * as hrAPI from '../../../frontend/llm-interviewer-ui/src/services/hrAPI'; // Adjusted path

// Mock useAuth
jest.mock('../../../frontend/llm-interviewer-ui/src/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock hrAPI
jest.mock('../../../frontend/llm-interviewer-ui/src/services/hrAPI');

// Mock common components
jest.mock('../../../frontend/llm-interviewer-ui/src/components/layout/MainLayout', () => ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>);
jest.mock('../../../frontend/llm-interviewer-ui/src/components/common/Button/Button', () => (props: any) => <button {...props}>{props.children}</button>);
jest.mock('../../../frontend/llm-interviewer-ui/src/components/common/TagInput/TagInput', () => (props: any) => (
  <input 
    data-testid="tag-input" 
    value={props.tags.join(',')} 
    onChange={(e) => props.setTags(e.target.value ? e.target.value.split(',') : [])} 
    placeholder={props.placeholder}
    id={props.id}
  />
));


const mockCurrentUser = { id: 'hrUser1', username: 'hrTestUser', role: 'hr' };
const mockSearchResults: hrAPI.CandidateSearchResult[] = [
  { id: 'cand1', username: 'johndoe', email: 'john@example.com', full_name: 'John Doe', extracted_skills_list: ['React', 'Node'], estimated_yoe: 3 }, // Removed user_id
  { id: 'cand2', username: 'janesmith', email: 'jane@example.com', full_name: 'Jane Smith', extracted_skills_list: ['Python', 'Django'], estimated_yoe: 5 }, // Removed user_id
];
const mockPaginatedResponse: hrAPI.PaginatedCandidateSearchResults = {
  items: mockSearchResults,
  total: mockSearchResults.length,
  page: 1,
  size: 10,
  pages: 1,
};

describe('CandidateSearchPage Component', () => {
  const useAuthMock = useAuth as jest.Mock;
  const mockedHrAPI = hrAPI as jest.Mocked<typeof hrAPI>;

  beforeEach(() => {
    useAuthMock.mockReturnValue({ currentUser: mockCurrentUser });
    mockedHrAPI.searchCandidates.mockResolvedValue(mockPaginatedResponse);
    mockedHrAPI.sendCandidateInvitation.mockResolvedValue({ message: 'Invitation sent' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderSearchPage = () => {
    return render(
      <BrowserRouter>
        <CandidateSearchPage />
      </BrowserRouter>
    );
  };

  it('should render search filters including TagInput for skills', () => {
    renderSearchPage();
    expect(screen.getByLabelText(/keyword/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/skills/i)).toBeInTheDocument(); // Label for TagInput
    expect(screen.getByTestId('tag-input')).toBeInTheDocument();
    expect(screen.getByLabelText(/min\. years of experience/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/max\. years of experience/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/education level/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  it('should allow input in filter fields and update searchParams', () => {
    renderSearchPage();
    fireEvent.change(screen.getByLabelText(/keyword/i), { target: { value: 'Developer' } });
    // Simulate TagInput change
    const skillsInput = screen.getByTestId('tag-input');
    fireEvent.change(skillsInput, { target: { value: 'React,Node' } });
    
    // Check if state would update (indirectly via search call)
    // Direct state check is harder with useState, focus on behavior
    fireEvent.click(screen.getByRole('button', { name: /search/i }));
    
    expect(mockedHrAPI.searchCandidates).toHaveBeenCalledWith(expect.objectContaining({
      keyword: 'Developer',
      required_skills: 'React,Node', // TagInput mock joins with comma
    }));
  });

  it('should call hrAPI.searchCandidates with correct parameters on search', async () => {
    renderSearchPage();
    fireEvent.change(screen.getByLabelText(/keyword/i), { target: { value: 'Engineer' } });
    fireEvent.change(screen.getByLabelText(/min\. years of experience/i), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => {
      expect(mockedHrAPI.searchCandidates).toHaveBeenCalledWith(expect.objectContaining({
        keyword: 'Engineer',
        yoe_min: 2,
        limit: 10,
        skip: 0,
      }));
    });
  });

  it('should display search results and pagination info', async () => {
    renderSearchPage();
    fireEvent.click(screen.getByRole('button', { name: /search/i })); // Trigger initial search

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText(/page 1 of 1/i)).toBeInTheDocument();
      expect(screen.getByText(`Total Results: ${mockSearchResults.length}`)).toBeInTheDocument();
    });
  });

  it('should handle sending an invitation', async () => {
    renderSearchPage();
    fireEvent.click(screen.getByRole('button', { name: /search/i })); // Trigger search to show results

    await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());
    const inviteButtons = screen.getAllByRole('button', { name: /send invitation/i });
    fireEvent.click(inviteButtons[0]); // Click invite for John Doe

    expect(screen.getByRole('button', { name: /sending.../i })).toBeDisabled();
    await waitFor(() => {
      expect(mockedHrAPI.sendCandidateInvitation).toHaveBeenCalledWith(
        mockSearchResults[0].id, // candidateId
        expect.objectContaining({ subject: 'Interview Invitation' }) // messageData
      );
    });
    expect(screen.getByRole('button', { name: /invitation sent!/i })).toBeDisabled();
  });

  it('should clear filters when "Clear Filters" is clicked', async () => {
    renderSearchPage();
    fireEvent.change(screen.getByLabelText(/keyword/i), { target: { value: 'Developer' } });
    expect(screen.getByLabelText(/keyword/i)).toHaveValue('Developer');
    
    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(screen.getByLabelText(/keyword/i)).toHaveValue('');
    // Optionally, check if search is re-triggered with empty params if designed so
  });
  
  it('should handle pagination correctly', async () => {
    const moreResults = new Array(15).fill(null).map((_, i) => ({
      id: `cand${i}`, username: `user${i}`, email: `user${i}@example.com`, full_name: `User ${i}` // Removed user_id
    }));
    const firstPageResponse: hrAPI.PaginatedCandidateSearchResults = { items: moreResults.slice(0, 10), total: 15, page: 1, size: 10, pages: 2 };
    const secondPageResponse: hrAPI.PaginatedCandidateSearchResults = { items: moreResults.slice(10), total: 15, page: 2, size: 10, pages: 2 };

    mockedHrAPI.searchCandidates.mockResolvedValueOnce(firstPageResponse);
    renderSearchPage();
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => expect(screen.getByText('Page 1 of 2')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    
    mockedHrAPI.searchCandidates.mockResolvedValueOnce(secondPageResponse);
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => expect(mockedHrAPI.searchCandidates).toHaveBeenCalledWith(expect.objectContaining({ skip: 10 })));
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /previous/i })).not.toBeDisabled();
  });

});
