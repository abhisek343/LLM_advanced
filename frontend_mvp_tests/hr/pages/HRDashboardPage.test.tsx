import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom'; // For Link components
import HRDashboardPage from '../../../frontend/llm-interviewer-ui/src/features/hr/pages/HRDashboardPage'; // Adjusted path
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

// Define types for mock data
interface MockUserDetails {
  id: string;
  username: string;
  email: string;
  role: 'hr';
}
const mockCurrentUser: MockUserDetails = { id: 'hrUser1', username: 'hrTestUser', email: 'hr@example.com', role: 'hr' };

const mockHrProfile: hrAPI.HrProfile = {
  id: 'hrProfile1',
  username: 'hrTestUser',
  email: 'hr@example.com',
  role: 'hr', // Added
  is_active: true, // Added
  created_at: new Date().toISOString(), // Added
  updated_at: new Date().toISOString(), // Added
  company: 'TestCorp',
  hr_status: 'active_mapped',
  admin_manager_id: 'admin123',
  // other fields...
};
const mockAdminRequests: hrAPI.AdminRequest[] = [
  { id: 'req1', requester_id: 'admin123', requester_username: 'Admin One', created_at: new Date().toISOString(), status: 'pending' },
];
const mockCandidateSummaries: hrAPI.CandidateSummary[] = [
  // { user_id: 'cand1', username: 'John Doe', status: 'pending_interview' }, // Assuming CandidateSummary uses user_id and username
  // Correcting based on TS error: 'user_id' does not exist. Assuming 'id' might be the identifier.
  // If 'id' is not correct, the type definition for CandidateSummary needs to be checked.
  // For now, providing a structure that might pass if 'id' is the key.
  // Added email as it's also required by CandidateSummary type.
  { id: 'cand1', username: 'John Doe', email: 'john.doe@example.com', status: 'pending_interview' },
];
// Recent activities are mocked within the component itself, so we don't need to mock an API for it here.

describe('HRDashboardPage Component', () => {
  const useAuthMock = useAuth as jest.Mock;
  const mockedHrAPI = hrAPI as jest.Mocked<typeof hrAPI>;

  beforeEach(() => {
    useAuthMock.mockReturnValue({ currentUser: mockCurrentUser });
    mockedHrAPI.getHrProfileDetails.mockResolvedValue(mockHrProfile);
    mockedHrAPI.getPendingAdminRequestsForHr.mockResolvedValue(mockAdminRequests);
    mockedHrAPI.getHRAssignedCandidatesSummary.mockResolvedValue(mockCandidateSummaries);
    // Note: fetchRecentActivities is an internal mock in the component, not from hrAPI module.
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderDashboardPage = () => {
    return render(
      <BrowserRouter>
        <HRDashboardPage />
      </BrowserRouter>
    );
  };

  it('should display loading state initially', () => {
    // To test loading, we need to make promises not resolve immediately
    mockedHrAPI.getHrProfileDetails.mockImplementation(() => new Promise(() => {})); // Pending promise
    renderDashboardPage();
    expect(screen.getByText(/loading hr dashboard.../i)).toBeInTheDocument();
  });

  it('should display welcome message and HR status details', async () => {
    renderDashboardPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: `Welcome, ${mockHrProfile.username}!` })).toBeInTheDocument();
      expect(screen.getByText(`Company: ${mockHrProfile.company}`)).toBeInTheDocument();
      expect(screen.getByText(`Status: ${mockHrProfile.hr_status}`)).toBeInTheDocument();
      expect(screen.getByText(`Mapped Admin ID: ${mockHrProfile.admin_manager_id}`)).toBeInTheDocument();
    });
  });

  it('should display pending admin requests', async () => {
    renderDashboardPage();
    await waitFor(() => {
      expect(screen.getByText(/request from admin: admin one/i)).toBeInTheDocument();
    });
  });
  
  it('should display "No pending requests" if none exist', async () => {
    mockedHrAPI.getPendingAdminRequestsForHr.mockResolvedValue([]);
    renderDashboardPage();
    await waitFor(() => {
      expect(screen.getByText('No pending requests from Admins.')).toBeInTheDocument();
    });
  });

  it('should display assigned candidates summary', async () => {
    renderDashboardPage();
    await waitFor(() => {
      expect(screen.getByText(`You have ${mockCandidateSummaries.length} active candidate(s).`)).toBeInTheDocument();
    });
  });

  it('should display recent activities (from internal mock)', async () => {
    renderDashboardPage();
    await waitFor(() => {
      // Based on the component's internal mock for fetchRecentActivities
      expect(screen.getByText('Interview for John Doe completed.')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith assigned to you.')).toBeInTheDocument();
    });
  });

  it('should display quick action links', async () => {
    renderDashboardPage();
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /view\/edit profile/i })).toHaveAttribute('href', '/hr/profile');
      expect(screen.getByRole('link', { name: /manage admin connections/i })).toHaveAttribute('href', '/hr/admin-connections');
      expect(screen.getByRole('link', { name: /view all assigned candidates/i })).toHaveAttribute('href', '/hr/assigned-candidates');
      expect(screen.getByRole('link', { name: /search new candidates/i })).toHaveAttribute('href', '/hr/search-candidates');
      expect(screen.getByRole('link', { name: /schedule an interview/i })).toHaveAttribute('href', '/hr/schedule-interview');
      expect(screen.getByRole('link', { name: /view messages/i })).toHaveAttribute('href', '/hr/messages');
    });
  });
  
  it('should display an error message if data fetching fails', async () => {
    const errorMessage = "Network Error";
    mockedHrAPI.getHrProfileDetails.mockRejectedValue(new Error(errorMessage));
    renderDashboardPage();
    await waitFor(() => {
        expect(screen.getByText(`Failed to load HR dashboard data.`)).toBeInTheDocument();
    });
  });
});
