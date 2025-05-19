import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom'; // For Link components
import AdminDashboardPage from '../../../frontend/llm-interviewer-ui/src/features/admin/pages/AdminDashboardPage'; // Adjusted path
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
jest.mock('../../../frontend/llm-interviewer-ui/src/components/common/Card/Card', () => ({ title, children }: { title: string, children: React.ReactNode }) => <div data-testid={`card-${title.toLowerCase().replace(/\s+/g, '-')}`}><h2>{title}</h2><div>{children}</div></div>);
jest.mock('../../../frontend/llm-interviewer-ui/src/components/common/AlertMessage/AlertMessage', () => ({ message }: { message: string }) => <div role="alert">{message}</div>);
jest.mock('../../../frontend/llm-interviewer-ui/src/components/common/Spinner/Spinner', () => ({ text }: { text: string }) => <div data-testid="spinner">{text}</div>);


const mockAdminUser = { id: 'admin001', username: 'superadmin', role: 'admin' };
const mockSystemStats: adminAPI.SystemStats = {
  total_users: 100,
  total_candidates: 50,
  total_hrs: 20,
  total_admins: 5,
  total_hr_mapped: 15,
  total_interviews_scheduled: 200,
  total_interviews_conducted: 150,
};
const mockPendingHRApps: any[] = [ // Using any[] due to AdminApplicationRequestOut not being exported
  { id: 'app1', hr_user_id: 'hr1', admin_id: 'admin1', status: 'pending', created_at: new Date().toISOString(), hr_username: 'hrUserOne' },
  { id: 'app2', hr_user_id: 'hr2', admin_id: 'admin1', status: 'pending', created_at: new Date().toISOString(), hr_username: 'hrUserTwo' },
];
const mockCandidateUsers: adminAPI.PaginatedUsersResponse = { // For unassigned count
    items: [
        { id: 'cand1', username: 'candone', email: 'c1@e.com', role: 'candidate', is_active: true, created_at: 'date', assigned_hr_id: 'hr1' },
        { id: 'cand2', username: 'candtwo', email: 'c2@e.com', role: 'candidate', is_active: true, created_at: 'date', assigned_hr_id: null }, // Unassigned
        { id: 'cand3', username: 'candthree', email: 'c3@e.com', role: 'candidate', is_active: true, created_at: 'date', assigned_hr_id: undefined }, // Unassigned
    ],
    total: 3, page: 1, pages: 1, size: 10,
};


describe('AdminDashboardPage Component', () => {
  const useAuthMock = useAuth as jest.Mock;
  const mockedAdminAPI = adminAPI as jest.Mocked<typeof adminAPI>;

  beforeEach(() => {
    useAuthMock.mockReturnValue({ currentUser: mockAdminUser });
    mockedAdminAPI.getSystemStats.mockResolvedValue(mockSystemStats);
    mockedAdminAPI.getPendingHRApplications.mockResolvedValue(mockPendingHRApps);
    mockedAdminAPI.getAllUsers.mockResolvedValue(mockCandidateUsers); // For candidate count
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderAdminDashboardPage = () => {
    return render(
      <BrowserRouter>
        <AdminDashboardPage />
      </BrowserRouter>
    );
  };

  it('should display loading state initially', () => {
    mockedAdminAPI.getSystemStats.mockImplementation(() => new Promise(() => {})); // Keep pending
    renderAdminDashboardPage();
    expect(screen.getByTestId('spinner')).toHaveTextContent('Loading Admin Dashboard...');
  });

  it('should display welcome message and system statistics', async () => {
    renderAdminDashboardPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: `Welcome, ${mockAdminUser.username}!` })).toBeInTheDocument();
      expect(screen.getByText(`Total Users: ${mockSystemStats.total_users}`)).toBeInTheDocument();
      expect(screen.getByText(`Candidates: ${mockSystemStats.total_candidates}`)).toBeInTheDocument();
      expect(screen.getByText(`Interviews Scheduled: ${mockSystemStats.total_interviews_scheduled}`)).toBeInTheDocument();
    });
  });

  it('should display pending actions counts', async () => {
    renderAdminDashboardPage();
    await waitFor(() => {
      expect(screen.getByText(`Manage HR Applications & Mappings (${mockPendingHRApps.length} Pending)`)).toBeInTheDocument();
      // Based on mockCandidateUsers, 2 are unassigned (null or undefined assigned_hr_id)
      expect(screen.getByText(`Assign Candidates to HR (2 Pending)`)).toBeInTheDocument(); 
    });
  });

  it('should display quick navigation links', async () => {
    renderAdminDashboardPage();
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /user management/i })).toHaveAttribute('href', '/admin/users');
      expect(screen.getByRole('link', { name: /hr management/i })).toHaveAttribute('href', '/admin/hr-management');
      expect(screen.getByRole('link', { name: /assign candidates to hr/i })).toHaveAttribute('href', '/admin/candidates/assign');
      expect(screen.getByRole('link', { name: /create new user/i })).toHaveAttribute('href', '/admin/create-user');
      expect(screen.getByRole('link', { name: /view all interviews/i })).toHaveAttribute('href', '/admin/interviews-overview');
      expect(screen.getByRole('link', { name: /system statistics/i })).toHaveAttribute('href', '/admin/stats');
    });
  });
  
  it('should display an error message if data fetching fails', async () => {
    const errorMessage = "Failed to load stats";
    mockedAdminAPI.getSystemStats.mockRejectedValue(new Error(errorMessage));
    renderAdminDashboardPage();
    await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(`Failed to load admin dashboard data.`);
    });
  });
});
