import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom'; // For Link components
import UserManagementPage from '../../../frontend/llm-interviewer-ui/src/features/admin/pages/UserManagementPage'; // Adjusted path
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
jest.mock('../../../frontend/llm-interviewer-ui/src/components/common/Button/Button', () => (props: any) => <button {...props} onClick={props.onClick}>{props.children}</button>);
jest.mock('../../../frontend/llm-interviewer-ui/src/components/common/Select/Select', () => (props: any) => <select {...props} onChange={props.onChange} data-testid={`select-${props.name || props.id}`}>{props.options.map((opt:any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select>);


const mockAdminUser = { id: 'admin001', username: 'superadmin', role: 'admin' };
const mockUsers: adminAPI.UserManagementInfo[] = [
  { id: 'user1', username: 'johndoe', email: 'john@example.com', role: 'candidate', is_active: true, created_at: new Date().toISOString(), last_login_at: new Date().toISOString() },
  { id: 'user2', username: 'janeroe', email: 'jane@example.com', role: 'hr', is_active: false, created_at: new Date().toISOString(), hr_status: 'mapped' },
  { id: 'user3', username: 'adminuser', email: 'admin@example.com', role: 'admin', is_active: true, created_at: new Date().toISOString() },
];
const mockPaginatedResponse: adminAPI.PaginatedUsersResponse = {
  items: mockUsers,
  total: mockUsers.length,
  page: 1,
  size: 10,
  pages: 1,
};

describe('UserManagementPage Component', () => {
  const useAuthMock = useAuth as jest.Mock;
  const mockedAdminAPI = adminAPI as jest.Mocked<typeof adminAPI>;

  beforeEach(() => {
    useAuthMock.mockReturnValue({ currentUser: mockAdminUser });
    mockedAdminAPI.getAllUsers.mockResolvedValue(mockPaginatedResponse);
    // Error on L45 suggests this returns UserManagementInfo
    mockedAdminAPI.updateUserActivationStatus.mockResolvedValue({ ...mockUsers[0], is_active: !mockUsers[0].is_active }); // Return a modified user
    // Error on L47 suggests this returns Promise<void>
    mockedAdminAPI.deleteUser.mockResolvedValue(undefined);
    // Error on L49 suggests this returns UserManagementInfo
    mockedAdminAPI.updateUserRole.mockResolvedValue({ ...mockUsers[0], role: 'hr' }); // Return a modified user
    window.confirm = jest.fn(() => true); // Auto-confirm window.confirm
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderUserManagementPage = () => {
    return render(
      <BrowserRouter>
        <UserManagementPage />
      </BrowserRouter>
    );
  };

  it('should list users with details and actions', async () => {
    renderUserManagementPage();
    await waitFor(() => expect(mockedAdminAPI.getAllUsers).toHaveBeenCalled());
    
    expect(screen.getByText('johndoe')).toBeInTheDocument();
    expect(screen.getByText('janeroe')).toBeInTheDocument();
    expect(screen.getByText('adminuser')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /deactivate/i }).length).toBeGreaterThan(0); // johndoe and adminuser are active
    expect(screen.getByRole('button', { name: /activate/i })).toBeInTheDocument(); // janeroe is inactive
  });

  it('should allow filtering users by role', async () => {
    renderUserManagementPage();
    await waitFor(() => expect(mockedAdminAPI.getAllUsers).toHaveBeenCalledTimes(1)); // Initial fetch
    
    const roleFilter = screen.getByLabelText(/filter by role/i);
    fireEvent.change(roleFilter, { target: { value: 'hr' } });
    // The component refetches on filter change via useEffect -> fetchData
    await waitFor(() => expect(mockedAdminAPI.getAllUsers).toHaveBeenCalledWith(expect.objectContaining({ role: 'hr', skip: 0 })));
  });
  
  it('should handle pagination', async () => {
    const manyUsers = new Array(15).fill(null).map((_, i) => ({ ...mockUsers[0], id: `user${i}`, username: `user${i}`}));
    mockedAdminAPI.getAllUsers
        .mockResolvedValueOnce({ items: manyUsers.slice(0,10), total: 15, page: 1, size: 10, pages: 2 })
        .mockResolvedValueOnce({ items: manyUsers.slice(10), total: 15, page: 2, size: 10, pages: 2 });

    renderUserManagementPage();
    await waitFor(() => expect(screen.getByText('Page 1 of 2')).toBeInTheDocument());
    expect(screen.getByRole('button', {name: /previous/i})).toBeDisabled();

    fireEvent.click(screen.getByRole('button', {name: /next/i}));
    await waitFor(() => expect(mockedAdminAPI.getAllUsers).toHaveBeenCalledWith(expect.objectContaining({ skip: 10 })));
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: /next/i})).toBeDisabled();
  });

  it('should allow activating/deactivating a user', async () => {
    renderUserManagementPage();
    await waitFor(() => expect(screen.getByText('johndoe')).toBeInTheDocument()); // Wait for users to load

    const deactivateButton = screen.getAllByRole('button', { name: /deactivate/i })[0]; // For johndoe
    fireEvent.click(deactivateButton);
    await waitFor(() => expect(mockedAdminAPI.updateUserActivationStatus).toHaveBeenCalledWith(mockUsers[0].id, false));
    expect(screen.getByText(/user deactivated successfully/i)).toBeVisible();
  });

  it('should allow deleting a user with confirmation', async () => {
    renderUserManagementPage();
    await waitFor(() => expect(screen.getByText('johndoe')).toBeInTheDocument());

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    // Assuming johndoe is the first user with a delete button that's not disabled
    fireEvent.click(deleteButtons[0]); 
    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => expect(mockedAdminAPI.deleteUser).toHaveBeenCalledWith(mockUsers[0].id));
    expect(screen.getByText(/user "johndoe" deleted successfully/i)).toBeVisible();
  });
  
  it('should prevent admin from deleting self', async () => {
    renderUserManagementPage();
    await waitFor(() => expect(screen.getByText('adminuser')).toBeInTheDocument());
    
    // Find the row for 'adminuser' and its delete button
    const adminRow = screen.getByText('adminuser').closest('tr');
    const deleteSelfButton = adminRow?.querySelector('button[data-testid="button-delete"]'); // Assuming testid from mock
    expect(deleteSelfButton).toBeDisabled();
  });

  it('should open edit role modal and allow role change', async () => {
    renderUserManagementPage();
    await waitFor(() => expect(screen.getByText('johndoe')).toBeInTheDocument());

    const editRoleButtons = screen.getAllByRole('button', { name: /edit role/i });
    fireEvent.click(editRoleButtons[0]); // Edit johndoe (candidate)

    expect(screen.getByRole('heading', { name: /edit role for johndoe/i })).toBeVisible();
    const roleSelect = screen.getByTestId('select-undefined'); // Mocked Select might not get name/id properly
    
    fireEvent.change(roleSelect, { target: { value: 'hr' } });
    fireEvent.click(screen.getByRole('button', { name: /save role/i }));

    await waitFor(() => expect(mockedAdminAPI.updateUserRole).toHaveBeenCalledWith(mockUsers[0].id, { new_role: 'hr' }));
    expect(screen.getByText(/role updated successfully!/i)).toBeVisible();
    expect(screen.queryByRole('heading', { name: /edit role for johndoe/i })).not.toBeInTheDocument(); // Modal closes
  });
  
  it('should have a "Create New User" button linking to the correct page', async () => {
    renderUserManagementPage();
    await waitFor(() => expect(screen.getByRole('link', { name: /create new user/i })).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /create new user/i })).toHaveAttribute('href', '/admin/create-user');
  });

});
