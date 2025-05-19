import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom'; // For Link component
import AdminStatsPage from '../../../frontend/llm-interviewer-ui/src/features/admin/pages/AdminStatsPage'; // Adjusted path
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
jest.mock('../../../frontend/llm-interviewer-ui/src/components/common/Button/Button', () => (props: any) => <button {...props}>{props.children}</button>);


const mockAdminUser = { id: 'admin001', username: 'superadmin', role: 'admin' };
const mockSystemStatsData: adminAPI.SystemStats = {
  total_users: 150,
  total_candidates: 70,
  total_hrs: 30,
  total_admins: 5,
  total_hr_mapped: 25,
  total_candidates_assigned: 60, // Added based on component usage
  total_interviews_scheduled: 250,
  total_interviews_conducted: 200,
  llm_service_status: 'Operational',
};

describe('AdminStatsPage Component', () => {
  const useAuthMock = useAuth as jest.Mock;
  const mockedAdminAPI = adminAPI as jest.Mocked<typeof adminAPI>;

  beforeEach(() => {
    useAuthMock.mockReturnValue({ currentUser: mockAdminUser });
    mockedAdminAPI.getSystemStats.mockResolvedValue(mockSystemStatsData);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderStatsPage = () => {
    return render(
      <BrowserRouter>
        <AdminStatsPage />
      </BrowserRouter>
    );
  };

  it('should display loading state initially', () => {
    mockedAdminAPI.getSystemStats.mockImplementation(() => new Promise(() => {})); // Keep pending
    renderStatsPage();
    expect(screen.getByText(/loading system statistics.../i)).toBeInTheDocument();
  });

  it('should display basic system statistics once loaded', async () => {
    renderStatsPage();
    await waitFor(() => expect(mockedAdminAPI.getSystemStats).toHaveBeenCalled());
    
    expect(screen.getByRole('heading', { name: /system statistics/i })).toBeInTheDocument();
    expect(screen.getByText(`Total Users: ${mockSystemStatsData.total_users}`)).toBeInTheDocument();
    expect(screen.getByText(`Candidates: ${mockSystemStatsData.total_candidates}`)).toBeInTheDocument();
    expect(screen.getByText(`HR Personnel: ${mockSystemStatsData.total_hrs}`)).toBeInTheDocument();
    expect(screen.getByText(`Administrators: ${mockSystemStatsData.total_admins}`)).toBeInTheDocument();
    expect(screen.getByText(`Mapped HRs: ${mockSystemStatsData.total_hr_mapped}`)).toBeInTheDocument();
    expect(screen.getByText(`Candidates Assigned to HR: ${mockSystemStatsData.total_candidates_assigned}`)).toBeInTheDocument();
    expect(screen.getByText(`Total Interviews Scheduled: ${mockSystemStatsData.total_interviews_scheduled}`)).toBeInTheDocument();
    expect(screen.getByText(`Total Interviews Conducted: ${mockSystemStatsData.total_interviews_conducted}`)).toBeInTheDocument();
    expect(screen.getByText(`LLM Service Status: ${mockSystemStatsData.llm_service_status}`)).toBeInTheDocument();
  });

  it('should display UI stubs for Date Range Filters (disabled)', async () => {
    renderStatsPage();
    await waitFor(() => expect(mockedAdminAPI.getSystemStats).toHaveBeenCalled());

    expect(screen.getByLabelText(/start date/i)).toBeDisabled();
    expect(screen.getByLabelText(/end date/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /apply date filter/i })).toBeDisabled();
  });

  it('should display enhanced placeholders for detailed stats and charts', async () => {
    renderStatsPage();
    await waitFor(() => expect(mockedAdminAPI.getSystemStats).toHaveBeenCalled());

    expect(screen.getByRole('heading', { name: /detailed analytics \(future enhancements\)/i })).toBeInTheDocument();
    expect(screen.getByText(/user registrations & activity/i)).toBeInTheDocument();
    expect(screen.getByText(/hr performance & status/i)).toBeInTheDocument();
    expect(screen.getByText(/candidate funnel & profile completion/i)).toBeInTheDocument();
    expect(screen.getByText(/interview lifecycle & effectiveness/i)).toBeInTheDocument();
  });
  
  it('should display an error message if data fetching fails', async () => {
    const errorMessage = "API is down";
    mockedAdminAPI.getSystemStats.mockRejectedValue(new Error(errorMessage));
    renderStatsPage();
    await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });
  
  it('should display "Could not load system statistics." if stats are null after loading', async () => {
    mockedAdminAPI.getSystemStats.mockResolvedValue(null as any); // Simulate null response
    renderStatsPage();
    await waitFor(() => {
        expect(screen.getByText("Could not load system statistics.")).toBeInTheDocument();
    });
  });
});
