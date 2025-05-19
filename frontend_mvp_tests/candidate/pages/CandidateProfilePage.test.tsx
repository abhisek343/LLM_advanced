import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom'; // For Link components
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // For useQuery/useMutation
import CandidateProfilePage from '../../../frontend/llm-interviewer-ui/src/features/candidate/pages/CandidateProfilePage'; // Adjusted path
import { useAuth } from '../../../frontend/llm-interviewer-ui/src/contexts/AuthContext'; // Adjusted path
import * as candidateAPI from '../../../frontend/llm-interviewer-ui/src/services/candidateAPI'; // Adjusted path

// Mock useAuth
jest.mock('../../../frontend/llm-interviewer-ui/src/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock candidateAPI
jest.mock('../../../frontend/llm-interviewer-ui/src/services/candidateAPI');

// Mock common components
jest.mock('../../../frontend/llm-interviewer-ui/src/components/layout/MainLayout', () => ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>);
jest.mock('../../../frontend/llm-interviewer-ui/src/components/common/Input/Input', () => (props: any) => <input data-testid={`input-${props.name || props.id}`} {...props} />);
jest.mock('../../../frontend/llm-interviewer-ui/src/components/common/Textarea/Textarea', () => (props: any) => <textarea data-testid={`textarea-${props.name || props.id}`} {...props} />);
jest.mock('../../../frontend/llm-interviewer-ui/src/components/common/Button/Button', () => (props: any) => {
  const label = typeof props.children === 'string'
    ? props.children.toLowerCase().replace(/\s+/g, '-')
    : 'button';
  return (
    <button data-testid={`button-${label}`} {...props}>
      {props.isLoading ? 'Loading...' : props.children}
    </button>
  );
});
jest.mock('../../../frontend/llm-interviewer-ui/src/components/common/TagInput/TagInput', () => (props: any) => <div data-testid="tag-input"><input type="text" value={props.tags.join(',')} onChange={(e) => props.setTags(e.target.value.split(','))} placeholder={props.placeholder} /></div>);


const mockCurrentUser = { id: 'user1', username: 'testCandidate', email: 'test@example.com', role: 'candidate' };
const mockInitialProfile: candidateAPI.CandidateProfile = {
  id: 'profile1', // This is likely the profile's own ID
  // user_id: 'user1', // Still keeping this commented based on the specific error for this field
  username: mockCurrentUser.username, // Added from mockCurrentUser
  role: mockCurrentUser.role as candidateAPI.CandidateProfile['role'], // Added from mockCurrentUser, asserting type
  is_active: true, // Added placeholder
  created_at: new Date().toISOString(), // Added placeholder
  updated_at: new Date().toISOString(), // Added placeholder
  full_name: 'Test Candidate',
  email: 'test@example.com', // This might be redundant if also in user part, but profile can have its own contact email
  phone_number: '1234567890',
  linkedin_profile: 'linkedin.com/in/testCandidate',
  professional_summary: 'A dedicated candidate.',
  resume_path: 'uploads/resumes/resume.pdf',
  extracted_skills_list: ['React', 'Node.js'],
  skills: ['React', 'Node.js', 'TypeScript'],
  experience: [
    { title: 'Dev', company: 'Old Co', start_date: '2020-01-01', end_date: '2021-01-01', description: 'Old job' }
  ],
  education: [
    { degree: 'BSc', institution: 'Old Uni', year: 2019, field_of_study: 'CS' }
  ],
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Disable retries for tests
    },
  },
});

const renderProfilePage = () => {
  (useAuth as jest.Mock).mockReturnValue({ currentUser: mockCurrentUser });
  (candidateAPI.getCandidateProfile as jest.Mock).mockResolvedValue(mockInitialProfile);
  
  // Mock mutations
  (candidateAPI.updateCandidateProfile as jest.Mock).mockImplementation(async (data) => {
    return { ...mockInitialProfile, ...data }; // Simulate backend update
  });
  (candidateAPI.uploadCandidateResume as jest.Mock).mockImplementation(async () => {
    return { ...mockInitialProfile, resume_path: 'uploads/resumes/new_resume.pdf', extracted_skills_list: ['Python', 'Django'] };
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <CandidateProfilePage />
      </BrowserRouter>
    </QueryClientProvider>
  );
};


describe('CandidateProfilePage Component', () => {
  beforeEach(() => {
    // Clear mock call history
    (candidateAPI.getCandidateProfile as jest.Mock).mockClear();
    (candidateAPI.updateCandidateProfile as jest.Mock).mockClear();
    (candidateAPI.uploadCandidateResume as jest.Mock).mockClear();
    queryClient.clear(); // Clear react-query cache
  });

  it('should display fetched profile information', async () => {
    renderProfilePage();
    await waitFor(() => expect(candidateAPI.getCandidateProfile).toHaveBeenCalledTimes(1));
    
    expect(screen.getByTestId('input-full_name')).toHaveValue(mockInitialProfile.full_name);
    expect(screen.getByTestId('input-email')).toHaveValue(mockInitialProfile.email); // Email is read-only
    expect(screen.getByTestId('input-phone_number')).toHaveValue(mockInitialProfile.phone_number);
    expect(screen.getByTestId('input-linkedin_profile')).toHaveValue(mockInitialProfile.linkedin_profile);
    expect(screen.getByTestId('textarea-professional_summary')).toHaveValue(mockInitialProfile.professional_summary);
    expect(screen.getByTestId('tag-input').querySelector('input')).toHaveValue(mockInitialProfile.skills?.join(','));

    const experienceTitle = mockInitialProfile.experience?.[0]?.title;
    if (typeof experienceTitle === 'string') {
      expect(screen.getByText(experienceTitle)).toBeInTheDocument();
    } else {
      throw new Error("Experience title is undefined, but was expected in the document.");
    }

    const educationDegree = mockInitialProfile.education?.[0]?.degree;
    if (typeof educationDegree === 'string') {
      expect(screen.getByText(educationDegree)).toBeInTheDocument();
    } else {
      throw new Error("Education degree is undefined, but was expected in the document.");
    }
  });

  it('should allow updating personal information and professional summary', async () => {
    renderProfilePage();
    await waitFor(() => expect(candidateAPI.getCandidateProfile).toHaveBeenCalled());

    fireEvent.change(screen.getByTestId('input-full_name'), { target: { value: 'Updated Name' } });
    fireEvent.change(screen.getByTestId('textarea-professional_summary'), { target: { value: 'Updated summary.' } });
    
    fireEvent.click(screen.getByTestId('button-save-profile-changes'));

    await waitFor(() => expect(candidateAPI.updateCandidateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        full_name: 'Updated Name',
        professional_summary: 'Updated summary.',
      })
    ));
    expect(screen.getByText('Profile updated successfully!')).toBeVisible();
  });

  it('should allow adding, editing, and deleting work experience', async () => {
    renderProfilePage();
    await waitFor(() => expect(candidateAPI.getCandidateProfile).toHaveBeenCalled());

    // Add
    fireEvent.click(screen.getByTestId('button-add-new-experience'));
    // It's possible the inputs are not immediately available after the click,
    // so we'll wrap the input interactions in a waitFor.
    await waitFor(() => {
      const jobTitleInput = screen.getByLabelText(/Job Title:/i);
      expect(jobTitleInput).toBeInTheDocument();
      fireEvent.change(jobTitleInput, { target: { value: 'New Job' } });
    });

    await waitFor(() => {
      const companyInput = screen.getByLabelText(/Company:/i);
      expect(companyInput).toBeInTheDocument();
      fireEvent.change(companyInput, { target: { value: 'New Co' } });
    });

    fireEvent.click(screen.getByTestId('button-save-experience'));
    expect(screen.getByText('New Job')).toBeInTheDocument();

    // Edit (the newly added one, assuming it's last)
    const experienceItems = screen.getAllByText(/at New Co/i);
    const editButton = experienceItems[0].closest('li')?.querySelector('button[data-testid="button-edit"]');
    expect(editButton).toBeInTheDocument();
    if(editButton) fireEvent.click(editButton);
    
    fireEvent.change(screen.getByLabelText(/Job Title:/i), { target: { value: 'Updated Job Title' } });
    fireEvent.click(screen.getByTestId('button-update-experience'));
    expect(screen.getByText('Updated Job Title')).toBeInTheDocument();

    // Delete
    const deleteButton = screen.getByText('Updated Job Title').closest('li')?.querySelector('button[data-testid="button-delete"]');
    expect(deleteButton).toBeInTheDocument();
    if(deleteButton) fireEvent.click(deleteButton);
    expect(screen.queryByText('Updated Job Title')).not.toBeInTheDocument();
    
    // Save profile to trigger mutation with updated experience
    fireEvent.click(screen.getByTestId('button-save-profile-changes'));
    await waitFor(() => expect(candidateAPI.updateCandidateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        experience: expect.not.arrayContaining([expect.objectContaining({ title: 'Updated Job Title' })])
      })
    ));
  });
  
  it('should allow adding, editing, and deleting education', async () => {
    renderProfilePage();
    await waitFor(() => expect(candidateAPI.getCandidateProfile).toHaveBeenCalled());

    // Add
    fireEvent.click(screen.getByTestId('button-add-new-education'));
    fireEvent.change(screen.getByLabelText(/Degree:/i), { target: { value: 'MSc' } });
    fireEvent.change(screen.getByLabelText(/Institution:/i), { target: { value: 'New Tech' } });
    fireEvent.change(screen.getByLabelText(/Graduation Year:/i), { target: { value: '2025' } });
    fireEvent.click(screen.getByTestId('button-save-education'));
    expect(screen.getByText('MSc')).toBeInTheDocument();

    // Edit
    const educationItems = screen.getAllByText(/from New Tech/i);
    const editButton = educationItems[0].closest('li')?.querySelector('button[data-testid="button-edit"]');
    expect(editButton).toBeInTheDocument();
    if(editButton) fireEvent.click(editButton);
    
    fireEvent.change(screen.getByLabelText(/Degree:/i), { target: { value: 'PhD' } });
    fireEvent.click(screen.getByTestId('button-update-education'));
    expect(screen.getByText('PhD')).toBeInTheDocument();

    // Delete
    const deleteButton = screen.getByText('PhD').closest('li')?.querySelector('button[data-testid="button-delete"]');
    expect(deleteButton).toBeInTheDocument();
    if(deleteButton) fireEvent.click(deleteButton);
    expect(screen.queryByText('PhD')).not.toBeInTheDocument();

    // Save profile
    fireEvent.click(screen.getByTestId('button-save-profile-changes'));
    await waitFor(() => expect(candidateAPI.updateCandidateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        education: expect.not.arrayContaining([expect.objectContaining({ degree: 'PhD' })])
      })
    ));
  });


  it('should handle resume upload', async () => {
    renderProfilePage();
    await waitFor(() => expect(candidateAPI.getCandidateProfile).toHaveBeenCalled());

    const file = new File(['dummy content'], 'new_resume.pdf', { type: 'application/pdf' });
    const resumeInput = screen.getByLabelText(/upload new\/replace resume/i);
    fireEvent.change(resumeInput, { target: { files: [file] } });
    
    expect(screen.getByText(`Selected: ${file.name}`)).toBeVisible();
    
    fireEvent.click(screen.getByTestId('button-upload-resume'));

    await waitFor(() => expect(candidateAPI.uploadCandidateResume).toHaveBeenCalled());
    expect(screen.getByText('Resume uploaded successfully!')).toBeVisible();
    expect(screen.getByText('new_resume.pdf')).toBeInTheDocument(); // Check if new resume path is displayed
    expect(screen.getByText(/Extracted Skills: Python, Django/i)).toBeInTheDocument(); // Check for new skills
  });
  
  it('should allow updating skills using TagInput', async () => {
    renderProfilePage();
    await waitFor(() => expect(candidateAPI.getCandidateProfile).toHaveBeenCalled());

    const tagInput = screen.getByTestId('tag-input').querySelector('input') as HTMLInputElement;
    fireEvent.change(tagInput, { target: { value: 'Jest,RTL' } }); // Simulate TagInput behavior
    
    fireEvent.click(screen.getByTestId('button-save-profile-changes'));
    await waitFor(() => expect(candidateAPI.updateCandidateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        skills: expect.arrayContaining(['Jest', 'RTL'])
      })
    ));
  });

});
