import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import RegistrationForm from '../../../frontend/llm-interviewer-ui/src/features/auth/RegistrationForm';
import * as authAPI from '../../../frontend/llm-interviewer-ui/src/services/authAPI';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../../frontend/llm-interviewer-ui/src/services/authAPI');

// Mock common components used by RegistrationForm if they are complex
// For simple ones like Input, Button, Select, Checkbox, direct interaction is usually fine.
// If they had internal logic that needed mocking, you would do it here.
// jest.mock('../../../frontend/llm-interviewer-ui/src/components/common/Input/Input', () => (props: any) => <input {...props} data-testid={props.id || props.name} />);
// jest.mock('../../../frontend/llm-interviewer-ui/src/components/common/Button/Button', () => (props: any) => <button {...props}>{props.children}</button>);
// jest.mock('../../../frontend/llm-interviewer-ui/src/components/common/Select/Select', () => (props: any) => <select {...props} data-testid={props.id || props.name}>{props.options.map((opt:any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select>);
// jest.mock('../../../frontend/llm-interviewer-ui/src/components/common/Checkbox/Checkbox', () => (props: any) => <div><input type="checkbox" id={props.id} name={props.name} checked={props.checked} onChange={props.onChange} required={props.required} /><label htmlFor={props.id}>{props.label}</label></div>);


describe('RegistrationForm Component', () => {
  const mockedAuthAPI = authAPI as jest.Mocked<typeof authAPI>;

  const fillForm = (data: Partial<{username: string, email: string, pass: string, confirmPass: string, roleVal: string, terms: boolean}>) => {
    if (data.username !== undefined) fireEvent.change(screen.getByLabelText(/username/i), { target: { value: data.username } });
    if (data.email !== undefined) fireEvent.change(screen.getByLabelText(/email/i), { target: { value: data.email } });
    if (data.pass !== undefined) fireEvent.change(screen.getByLabelText(/^password:/i), { target: { value: data.pass } });
    if (data.confirmPass !== undefined) fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: data.confirmPass } });
    if (data.roleVal !== undefined) fireEvent.change(screen.getByLabelText(/i am a:/i), { target: { value: data.roleVal } });
    if (data.terms !== undefined) {
      const termsCheckbox = screen.getByLabelText(/i agree to the terms of service and privacy policy/i) as HTMLInputElement;
      if (termsCheckbox.checked !== data.terms) {
        fireEvent.click(termsCheckbox);
      }
    }
  };
  
  const clearForm = () => {
     // Clear fields to prevent state leakage
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/^password:/i), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: '' } });
    const termsCheckbox = screen.getByLabelText(/i agree to the terms of service and privacy policy/i) as HTMLInputElement;
    if (termsCheckbox.checked) {
        fireEvent.click(termsCheckbox);
    }
  }


  beforeEach(() => {
    mockNavigate.mockClear();
    mockedAuthAPI.registerUser.mockClear();
    // Ensure a fresh component for each test
    render(
      <BrowserRouter>
        <RegistrationForm />
      </BrowserRouter>
    );
    clearForm(); // Clear form at the start of each test
  });

  it('should render all registration form fields', () => {
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/i am a:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/i agree to the terms of service and privacy policy/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
  });

  it('should allow input in all fields and selection for role', () => {
    fillForm({
        username: 'newuser',
        email: 'new@example.com',
        pass: 'password123',
        confirmPass: 'password123',
        roleVal: 'hr',
        terms: true
    });

    expect(screen.getByLabelText(/username/i)).toHaveValue('newuser');
    expect(screen.getByLabelText(/email/i)).toHaveValue('new@example.com');
    expect(screen.getByLabelText(/^password:/i)).toHaveValue('password123');
    expect(screen.getByLabelText(/confirm password/i)).toHaveValue('password123');
    expect(screen.getByLabelText(/i am a:/i)).toHaveValue('hr');
    expect(screen.getByLabelText(/i agree to the terms of service and privacy policy/i)).toBeChecked();
  });

  it('should display a password strength indicator when typing in the password field', () => {
    const passwordInput = screen.getByLabelText(/^password:/i);
    fireEvent.change(passwordInput, { target: { value: 'short' } }); // Triggers "Very Weak"
    expect(screen.getByText('Very Weak')).toBeVisible();
    
    fireEvent.change(passwordInput, { target: { value: 'StrongPassword123!' } });
    expect(screen.getByText('Strong')).toBeVisible();
  });

  it('should show error if passwords do not match', async () => {
    fillForm({
        username: 'testuser',
        email: 'test@example.com',
        pass: 'password123',
        confirmPass: 'passwordMismatch',
        roleVal: 'candidate',
        terms: true // Terms must be agreed for this check to be the primary error
    });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Passwords do not match.');
    expect(mockedAuthAPI.registerUser).not.toHaveBeenCalled();
  });

  it('should show error if terms are not agreed to', async () => {
     fillForm({
        username: 'newuser',
        email: 'new@example.com',
        pass: 'password123',
        confirmPass: 'password123',
        roleVal: 'candidate',
        terms: false // Terms not agreed
    });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    const alert = await screen.findByRole('alert');
    // The component checks password mismatch first, then terms.
    // So, if passwords match, this error should appear.
    expect(alert).toHaveTextContent('You must agree to the Terms of Service to register.');
    expect(mockedAuthAPI.registerUser).not.toHaveBeenCalled();
  });

  it('should call authAPI.registerUser and navigate on successful registration', async () => {
    // authAPI.UserDetails is not exported. Assuming a common structure for the resolved user object.
    const mockRegisteredUser = { 
      id: 'newUser123',
      username: 'testuser',
      email: 'test@example.com',
      role: 'candidate',
      // Other potential fields: is_active, created_at, etc.
    };
    mockedAuthAPI.registerUser.mockResolvedValueOnce(mockRegisteredUser as any); // Using 'as any' if the exact type is unknown/unexported
    
    fillForm({
        username: 'testuser',
        email: 'test@example.com',
        pass: 'ValidPass123!',
        confirmPass: 'ValidPass123!',
        roleVal: 'candidate',
        terms: true
    });
    
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    
    expect(screen.getByRole('button', { name: /registering.../i})).toBeDisabled();

    await waitFor(() => {
      expect(mockedAuthAPI.registerUser).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
        password: 'ValidPass123!',
        role: 'candidate',
      });
    });
    expect(mockNavigate).toHaveBeenCalledWith('/login', { state: { message: 'Registration successful! Please log in.' } });
  });

  it('should display API error message on failed registration', async () => {
    const apiErrorMessage = 'Email already exists.';
    mockedAuthAPI.registerUser.mockRejectedValueOnce(new Error(apiErrorMessage));
    
    fillForm({
        username: 'testuser',
        email: 'test@example.com',
        pass: 'ValidPass123!',
        confirmPass: 'ValidPass123!',
        roleVal: 'candidate',
        terms: true
    });

    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => expect(mockedAuthAPI.registerUser).toHaveBeenCalled());
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(apiErrorMessage); // Check for the specific API error
  });
});
