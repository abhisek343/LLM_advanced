import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import ResetPasswordPage from '../../../frontend/llm-interviewer-ui/src/pages/ResetPasswordPage'; // Adjusted path
import * as authAPI from '../../../frontend/llm-interviewer-ui/src/services/authAPI'; // Adjusted path

// Mock react-router-dom's hooks
const mockNavigate = jest.fn();
const mockUseParams = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => mockUseParams(),
}));

// Mock the authAPI module
jest.mock('../../../frontend/llm-interviewer-ui/src/services/authAPI');

describe('ResetPasswordPage Component', () => {
  const mockedAuthAPI = authAPI as jest.Mocked<typeof authAPI>;

  beforeEach(() => {
    mockNavigate.mockClear();
    mockUseParams.mockClear();
    mockedAuthAPI.resetPassword.mockClear();
    jest.useFakeTimers(); // Use fake timers for setTimeout
  });

  afterEach(() => {
    jest.runOnlyPendingTimers(); // Run any pending timers
    jest.useRealTimers(); // Restore real timers
  });

  const renderResetPasswordPage = () => {
    return render(
      <BrowserRouter> {/* BrowserRouter is needed for Link component */}
        <ResetPasswordPage />
      </BrowserRouter>
    );
  };

  it('should render the "Reset Password" form if token is present', () => {
    mockUseParams.mockReturnValue({ token: 'test-token' });
    renderResetPasswordPage();
    expect(screen.getByRole('heading', { name: /reset your password/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
  });

  it('should display an error and disable form if token is missing from URL', () => {
    mockUseParams.mockReturnValue({ token: undefined });
    renderResetPasswordPage();
    expect(screen.getByText('Invalid or missing password reset token.')).toBeVisible();
    // Form might not render or button might be disabled
    const resetButton = screen.queryByRole('button', { name: /reset password/i });
    if(resetButton) { // If form is rendered despite missing token
        expect(resetButton).toBeDisabled();
    }
  });

  it('should show error if passwords do not match', async () => {
    mockUseParams.mockReturnValue({ token: 'test-token' });
    renderResetPasswordPage();
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: 'newPass123!' } });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: 'newPassMismatch!' } });
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByText('Passwords do not match.')).toBeVisible();
    expect(mockedAuthAPI.resetPassword).not.toHaveBeenCalled();
  });

  it('should call authAPI.resetPassword and navigate to login on success', async () => {
    const mockToken = 'valid-token';
    mockUseParams.mockReturnValue({ token: mockToken });
    mockedAuthAPI.resetPassword.mockResolvedValueOnce({ message: 'Password reset successfully.' });
    renderResetPasswordPage();

    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: 'newSecurePassword123!' } });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: 'newSecurePassword123!' } });
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    expect(screen.getByRole('button', { name: /resetting.../i})).toBeDisabled();

    await waitFor(() => {
      expect(mockedAuthAPI.resetPassword).toHaveBeenCalledWith({
        token: mockToken,
        new_password: 'newSecurePassword123!',
      });
    });
    expect(await screen.findByText('Password reset successfully.')).toBeVisible();
    
    // Fast-forward timers
    jest.advanceTimersByTime(3000);
    expect(mockNavigate).toHaveBeenCalledWith('/login', { state: { message: 'Password reset successful. Please login.' } });
  });

  it('should display API error message on failed password reset', async () => {
    const mockToken = 'invalid-token';
    mockUseParams.mockReturnValue({ token: mockToken });
    const errorMessage = 'Token is invalid or expired.';
    mockedAuthAPI.resetPassword.mockRejectedValueOnce(new Error(errorMessage));
    renderResetPasswordPage();

    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: 'newPass123!' } });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: 'newPass123!' } });
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => expect(mockedAuthAPI.resetPassword).toHaveBeenCalled());
    expect(await screen.findByText(errorMessage)).toBeVisible();
  });
  
  it('should have a link back to the Login page', () => {
    mockUseParams.mockReturnValue({ token: 'any-token' }); // Ensure form renders to show the link
    renderResetPasswordPage();
    const loginLink = screen.getByText(/back to login/i);
    expect(loginLink).toBeInTheDocument();
    expect(loginLink.closest('a')).toHaveAttribute('href', '/login');
  });
});
