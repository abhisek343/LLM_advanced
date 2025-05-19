import React, { useState } from 'react';
import { registerUser } from '../../services/authAPI';
import { useNavigate } from 'react-router-dom';
import styles from './AuthForm.module.css';
import Input from '../../components/common/Input/Input';
import Button from '../../components/common/Button/Button';
import Select from '../../components/common/Select/Select';
import Checkbox from '../../components/common/Checkbox/Checkbox'; // Import Checkbox

type Role = 'candidate' | 'hr' | 'admin'; // Admin registration might be a separate flow

const RegistrationForm: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, text: '', color: 'transparent' });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<Role>('candidate');
  const [agreedToTerms, setAgreedToTerms] = useState(false); // New state for terms
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const calculatePasswordStrength = (pass: string) => {
    let score = 0;
    let text = 'Too short';
    let color = styles.strengthVeryWeak; // Default to very weak color

    if (pass.length === 0) {
        return { score: 0, text: '', color: 'transparent' };
    }
    if (pass.length >= 8) {
      score += 1;
      text = 'Weak';
      color = styles.strengthWeak;
    }
    if (pass.length >= 10) {
      score += 1;
    }
    if (/[A-Z]/.test(pass)) { // Uppercase
      score += 1;
    }
    if (/[a-z]/.test(pass)) { // Lowercase
        score +=1;
    }
    if (/[0-9]/.test(pass)) { // Numbers
      score += 1;
    }
    if (/[^A-Za-z0-9]/.test(pass)) { // Special characters
      score += 1;
    }
    
    // Adjust text and color based on final score
    if (pass.length < 8 && pass.length > 0) {
        text = 'Too short';
        color = styles.strengthVeryWeak;
        score = Math.min(score, 1); // Cap score if too short
    } else if (score <= 2) {
      text = 'Weak';
      color = styles.strengthWeak;
    } else if (score <= 4) {
      text = 'Medium';
      color = styles.strengthMedium;
    } else {
      text = 'Strong';
      color = styles.strengthStrong;
    }
    if (pass.length > 0 && pass.length <6) { // Override for very short passwords
        text = "Very Weak";
        color = styles.strengthVeryWeak;
        score = 0;
    }


    return { score, text, color };
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setPasswordStrength(calculatePasswordStrength(newPassword));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!agreedToTerms) { // Check if terms are agreed
      setError('You must agree to the Terms of Service to register.');
      return;
    }
    setLoading(true);

    try {
      // Note: The UserRegistrationData interface in authAPI.ts makes username and password optional
      // based on UserCreate schema. However, for a typical registration form, they are required.
      // The backend UserCreate schema might allow creating users programmatically without these,
      // but for form submission, they should be present.
      // We'll assume they are required here for the form.
      if (!password) { // Explicitly check for password, though `required` on input helps
        setError('Password is required.');
        setLoading(false);
        return;
      }
      await registerUser({ username, email, password, role });
      navigate('/login', { state: { message: 'Registration successful! Please log in.' } });
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.formContainer} aria-describedby={error ? "registrationError" : undefined}>
      {error && <p id="registrationError" className={styles.errorMessage} role="alert">{error}</p>}
      <Input
        label="Username:"
        id="username"
        name="username"
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
        className={styles.formGroup} 
      />
      <Input
        label="Email:"
        id="email"
        name="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className={styles.formGroup}
      />
      <Input
        label="Password:"
        id="password"
        name="password"
        type="password"
        value={password}
        onChange={handlePasswordChange}
        required
        className={styles.formGroup}
      />
      {password.length > 0 && (
        <div className={styles.passwordStrengthContainer}>
          <div className={`${styles.strengthBar} ${passwordStrength.color}`} style={{ width: `${Math.min(passwordStrength.score * 20, 100)}%` }} />
          <span className={styles.strengthText}>{passwordStrength.text}</span>
        </div>
      )}
      <Input
        label="Confirm Password:"
        id="confirmPassword"
        name="confirmPassword"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        className={styles.formGroup}
      />
      <Select
        label="I am a:"
        id="role"
        name="role"
        value={role}
        onChange={(e) => setRole(e.target.value as Role)}
        required
        options={[
          { value: 'candidate', label: 'Candidate' },
          { value: 'hr', label: 'HR' },
          { value: 'admin', label: 'Admin (Testing)' },
        ]}
        className={styles.formGroup}
      />
      <Checkbox
        id="terms"
        name="terms"
        checked={agreedToTerms}
        onChange={(e) => setAgreedToTerms(e.target.checked)}
        required
        label={
          <>
            I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
          </>
        }
        className={styles.formGroup} // Apply formGroup for consistent spacing
      />
      <Button 
        type="submit" 
        isLoading={loading} 
        disabled={loading} 
        className={styles.submitButton}
        fullWidth
      >
        {loading ? 'Registering...' : 'Register'}
      </Button>
    </form>
  );
};

export default RegistrationForm;
