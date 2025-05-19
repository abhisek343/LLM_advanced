import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SettingsPage from '../../../frontend/llm-interviewer-ui/src/pages/common/SettingsPage'; // Adjusted path
import { useAuth } from '../../../frontend/llm-interviewer-ui/src/contexts/AuthContext'; // Adjusted path
import * as authAPI from '../../../frontend/llm-interviewer-ui/src/services/authAPI'; // Adjusted path

// Mock the useAuth hook
jest.mock('../../../frontend/llm-interviewer-ui/src/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock the authAPI module
jest.mock('../../../frontend/llm-interviewer-ui/src/services/authAPI');

// Define a UserDetails type for mocks
interface MockUserDetails {
  id: string;
  username: string;
  email: string;
  role: 'candidate' | 'hr' | 'admin';
}

const mockUser: MockUserDetails = { id: '1', username: 'testuser', email: 'test@example.com', role: 'candidate' };

describe('SettingsPage Component', () => {
  const useAuthMock = useAuth as jest.Mock;
  const mockedAuthAPI = authAPI as jest.Mocked<typeof authAPI>;

  beforeEach(() => {
    useAuthMock.mockReturnValue({ currentUser: mockUser });
    mockedAuthAPI.changePassword.mockClear();
  });

  it('should render the "Change Password" section with form elements', () => {
    render(<SettingsPage />);
    expect(screen.getByRole('heading', { name: /change password/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument();
  });

  it('should display the current user email', () => {
    render(<SettingsPage />);
    expect(screen.getByText(`Logged in as: ${mockUser.email}`)).toBeInTheDocument();
  });

  it('should allow user to input current password, new password, and confirm password', () => {
    render(<SettingsPage />);
    fireEvent.change(screen.getByLabelText(/current password/i), { target: { value: 'oldPass123' } });
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: 'newPass123!' } });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: 'newPass123!' } });

    expect(screen.getByLabelText(/current password/i)).toHaveValue('oldPass123');
    expect(screen.getByLabelText(/new password/i)).toHaveValue('newPass123!');
    expect(screen.getByLabelText(/confirm new password/i)).toHaveValue('newPass123!');
  });

  it('should show error if new passwords do not match', async () => {
    render(<SettingsPage />);
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: 'newPass123!' } });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: 'newPassMismatch!' } });
    fireEvent.submit(screen.getByRole('button', { name: /change password/i }));

    expect(await screen.findByText('New passwords do not match.')).toBeVisible();
    expect(mockedAuthAPI.changePassword).not.toHaveBeenCalled();
  });
  
  it('should show error if new password is less than 8 characters', async () => {
    render(<SettingsPage />);
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: 'short' } });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: 'short' } });
    fireEvent.submit(screen.getByRole('button', { name: /change password/i }));

    expect(await screen.findByText('New password must be at least 8 characters long.')).toBeVisible();
    expect(mockedAuthAPI.changePassword).not.toHaveBeenCalled();
  });

  it('should call authAPI.changePassword on form submission with valid data and show success', async () => {
    mockedAuthAPI.changePassword.mockResolvedValueOnce({ message: 'Password changed successfully!' });
    render(<SettingsPage />);

    fireEvent.change(screen.getByLabelText(/current password/i), { target: { value: 'oldPass123' } });
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: 'newSecurePassword123!' } });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: 'newSecurePassword123!' } });
    fireEvent.submit(screen.getByRole('button', { name: /change password/i }));

    expect(screen.getByRole('button', { name: /changing.../i})).toBeDisabled();

    await waitFor(() => {
      expect(mockedAuthAPI.changePassword).toHaveBeenCalledWith({
        currentPassword: 'oldPass123',
        newPassword: 'newSecurePassword123!',
      });
    });
    expect(await screen.findByText('Password changed successfully!')).toBeVisible();
    expect(screen.getByLabelText(/current password/i)).toHaveValue(''); // Fields should clear
  });

  it('should display API error message on failed password change', async () => {
    const errorMessage = 'Incorrect current password.';
    mockedAuthAPI.changePassword.mockRejectedValueOnce(new Error(errorMessage));
    render(<SettingsPage />);

    fireEvent.change(screen.getByLabelText(/current password/i), { target: { value: 'wrongOldPass' } });
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: 'newSecurePassword123!' } });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: 'newSecurePassword123!' } });
    fireEvent.submit(screen.getByRole('button', { name: /change password/i }));
    
    await waitFor(() => expect(mockedAuthAPI.changePassword).toHaveBeenCalled());
    expect(await screen.findByText(errorMessage)).toBeVisible();
  });

  it('should display placeholders for other settings sections', () => {
    render(<SettingsPage />);
    expect(screen.getByRole('heading', { name: /notification preferences/i })).toBeInTheDocument();
    expect(screen.getByText(/manage your notification settings here/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /theme settings/i })).toBeInTheDocument();
    expect(screen.getByText(/choose your preferred theme/i)).toBeInTheDocument();
  });
});
