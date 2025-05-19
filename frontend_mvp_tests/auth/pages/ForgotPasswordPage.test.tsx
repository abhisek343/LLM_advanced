import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import ForgotPasswordPage from '../../../frontend/llm-interviewer-ui/src/pages/ForgotPasswordPage'; // Adjusted path
import * as authAPI from '../../../frontend/llm-interviewer-ui/src/services/authAPI'; // Adjusted path

// Mock the authAPI module
jest.mock('../../../frontend/llm-interviewer-ui/src/services/authAPI');

describe('ForgotPasswordPage Component', () => {
  const mockedAuthAPI = authAPI as jest.Mocked<typeof authAPI>;

  beforeEach(() => {
    mockedAuthAPI.requestPasswordReset.mockClear();
  });

  const renderForgotPasswordPage = () => {
    return render(
      <BrowserRouter>
        <ForgotPasswordPage />
      </BrowserRouter>
    );
  };

  it('should render the "Forgot Password" form with an email input and submit button', () => {
    renderForgotPasswordPage();
    expect(screen.getByRole('heading', { name: /forgot password/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  it('should allow user to input an email address', () => {
    renderForgotPasswordPage();
    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    expect(emailInput).toHaveValue('test@example.com');
  });

  it('should call authAPI.requestPasswordReset on form submission with the email and show success message', async () => {
    const successMessage = 'Password reset link sent!';
    mockedAuthAPI.requestPasswordReset.mockResolvedValueOnce({ message: successMessage });
    renderForgotPasswordPage();

    const emailInput = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole('button', { name: /send reset link/i });

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.click(submitButton);

    expect(screen.getByRole('button', { name: /sending.../i})).toBeDisabled();

    await waitFor(() => {
      expect(mockedAuthAPI.requestPasswordReset).toHaveBeenCalledWith({ email: 'user@example.com' });
    });
    expect(await screen.findByText(successMessage)).toBeVisible();
    expect(emailInput).toHaveValue(''); // Email field should clear on success
  });

  it('should display an error message if the API call fails', async () => {
    const errorMessage = 'User with this email not found.';
    mockedAuthAPI.requestPasswordReset.mockRejectedValueOnce(new Error(errorMessage));
    renderForgotPasswordPage();

    const emailInput = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole('button', { name: /send reset link/i });

    fireEvent.change(emailInput, { target: { value: 'unknown@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => expect(mockedAuthAPI.requestPasswordReset).toHaveBeenCalled());
    expect(await screen.findByText(errorMessage)).toBeVisible();
    expect(emailInput).toHaveValue('unknown@example.com'); // Email field should not clear on error
  });
  
  it('should display a generic error message for non-Error exceptions', async () => {
    mockedAuthAPI.requestPasswordReset.mockRejectedValueOnce({}); // Simulate non-Error rejection
    renderForgotPasswordPage();

    const emailInput = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole('button', { name: /send reset link/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => expect(mockedAuthAPI.requestPasswordReset).toHaveBeenCalled());
    expect(await screen.findByText('An unexpected error occurred. Please try again.')).toBeVisible();
  });


  it('should have a link back to the Login page', () => {
    renderForgotPasswordPage();
    const loginLink = screen.getByText(/login here/i);
    expect(loginLink).toBeInTheDocument();
    expect(loginLink.closest('a')).toHaveAttribute('href', '/login');
  });
});
