import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom'; // For Link component
import ScheduleInterviewPage from '../../../frontend/llm-interviewer-ui/src/features/hr/pages/ScheduleInterviewPage'; // Adjusted path
import { useAuth } from '../../../frontend/llm-interviewer-ui/src/contexts/AuthContext'; // Adjusted path
import * as interviewAPI from '../../../frontend/llm-interviewer-ui/src/services/interviewAPI'; // Adjusted path

// Mock react-router-dom's useLocation
const mockUseLocation = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => mockUseLocation(),
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
jest.mock('../../../frontend/llm-interviewer-ui/src/components/common/TagInput/TagInput', () => (props: any) => (
  <input 
    data-testid="tag-input-tech_stack"
    value={(props.tags || []).join(',')} 
    onChange={(e) => props.setTags(e.target.value ? e.target.value.split(',') : [])} 
    placeholder={props.placeholder}
    id={props.id}
  />
));


const mockCurrentUser = { id: 'hrUser1', username: 'hrTestUser', role: 'hr' };
const mockScheduledInterview: Partial<interviewAPI.Interview> = { // Assuming Interview type from API
  id: 'interviewNew123',
  job_title: 'Senior Developer',
  // ... other relevant fields returned by scheduleInterview
};


describe('ScheduleInterviewPage Component', () => {
  const useAuthMock = useAuth as jest.Mock;
  const mockedInterviewAPI = interviewAPI as jest.Mocked<typeof interviewAPI>;

  beforeEach(() => {
    useAuthMock.mockReturnValue({ currentUser: mockCurrentUser });
    mockUseLocation.mockReturnValue({ state: null }); // Default no location state
    mockedInterviewAPI.scheduleInterview.mockResolvedValue(mockScheduledInterview as interviewAPI.Interview);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderSchedulePage = () => {
    return render(
      <BrowserRouter>
        <ScheduleInterviewPage />
      </BrowserRouter>
    );
  };

  it('should render the schedule interview form with all fields', () => {
    renderSchedulePage();
    expect(screen.getByLabelText(/candidate id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/job title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/job description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/role \(for question tailoring, optional\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/key skills\/tech stack \(optional\)/i)).toBeInTheDocument(); // Label for TagInput
    expect(screen.getByTestId('tag-input-tech_stack')).toBeInTheDocument();
    expect(screen.getByLabelText(/number of questions/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/interview type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/difficulty level/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/specific instructions for candidate/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /schedule interview/i })).toBeInTheDocument();
  });

  it('should prefill Candidate ID if passed via location state', () => {
    mockUseLocation.mockReturnValue({ state: { candidateId: 'cand123' } });
    renderSchedulePage();
    expect(screen.getByLabelText(/candidate id/i)).toHaveValue('cand123');
  });

  it('should allow input in all fields and update form data', () => {
    renderSchedulePage();
    fireEvent.change(screen.getByLabelText(/candidate id/i), { target: { value: 'candXYZ' } });
    fireEvent.change(screen.getByLabelText(/job title/i), { target: { value: 'Lead Engineer' } });
    fireEvent.change(screen.getByLabelText(/job description/i), { target: { value: 'Lead a team...' } });
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'Team Lead' } });
    // Simulate TagInput for tech_stack
    const techStackInput = screen.getByTestId('tag-input-tech_stack');
    fireEvent.change(techStackInput, { target: { value: 'Java,Spring' } });
    fireEvent.change(screen.getByLabelText(/number of questions/i), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText(/interview type/i), { target: { value: 'AI_TECHNICAL_SCREENING' } });
    fireEvent.change(screen.getByLabelText(/difficulty level/i), { target: { value: 'SENIOR' } });
    fireEvent.change(screen.getByLabelText(/specific instructions for candidate/i), { target: { value: 'Focus on system design.' } });

    // Check a few values to confirm state update (indirectly via submit payload)
    // Direct state check is complex, so we'll verify in the submit test.
    expect(screen.getByLabelText(/candidate id/i)).toHaveValue('candXYZ');
    expect(screen.getByLabelText(/job title/i)).toHaveValue('Lead Engineer');
    expect(techStackInput).toHaveValue('Java,Spring');
  });

  it('should call interviewAPI.scheduleInterview with correct payload on submission', async () => {
    renderSchedulePage();
    // Fill form
    fireEvent.change(screen.getByLabelText(/candidate id/i), { target: { value: 'cand789' } });
    fireEvent.change(screen.getByLabelText(/job title/i), { target: { value: 'Data Scientist' } });
    fireEvent.change(screen.getByLabelText(/job description/i), { target: { value: 'Analyze data...' } });
    const techStackInput = screen.getByTestId('tag-input-tech_stack');
    fireEvent.change(techStackInput, { target: { value: 'Python,Pandas' } });
    fireEvent.change(screen.getByLabelText(/number of questions/i), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(/interview type/i), { target: { value: 'AI_TECHNICAL_SCREENING' } });
    fireEvent.change(screen.getByLabelText(/difficulty level/i), { target: { value: 'INTERMEDIATE' } });


    fireEvent.click(screen.getByRole('button', { name: /schedule interview/i }));
    
    expect(screen.getByRole('button', { name: /scheduling.../i})).toBeDisabled();

    await waitFor(() => {
      expect(mockedInterviewAPI.scheduleInterview).toHaveBeenCalledWith({
        candidate_id: 'cand789',
        job_title: 'Data Scientist',
        job_description: 'Analyze data...',
        role: undefined, // Was not filled in this test case
        tech_stack: ['Python', 'Pandas'],
        num_questions: 3,
        interview_type: 'AI_TECHNICAL_SCREENING',
        difficulty_level: 'INTERMEDIATE',
        specific_instructions: undefined,
        scheduled_by_id: mockCurrentUser.id,
      });
    });
    expect(await screen.findByText(/interview scheduled successfully/i)).toBeVisible();
  });

  it('should show error if required fields (Candidate ID, Job Title) are missing', async () => {
    renderSchedulePage();
    fireEvent.click(screen.getByRole('button', { name: /schedule interview/i }));
    expect(await screen.findByText('Candidate ID and Job Title are required.')).toBeVisible();
    expect(mockedInterviewAPI.scheduleInterview).not.toHaveBeenCalled();
  });
  
  it('should display API error message on failed scheduling', async () => {
    const errorMessage = 'Candidate not found.';
    mockedInterviewAPI.scheduleInterview.mockRejectedValueOnce(new Error(errorMessage));
    renderSchedulePage();

    fireEvent.change(screen.getByLabelText(/candidate id/i), { target: { value: 'unknownCand' } });
    fireEvent.change(screen.getByLabelText(/job title/i), { target: { value: 'Test Job' } });
    fireEvent.change(screen.getByLabelText(/job description/i), { target: { value: 'Test Desc' } });
    fireEvent.click(screen.getByRole('button', { name: /schedule interview/i }));

    await waitFor(() => expect(mockedInterviewAPI.scheduleInterview).toHaveBeenCalled());
    expect(await screen.findByText(errorMessage)).toBeVisible();
  });
});
