import React, { useState } from 'react';
import { loginUser, getCurrentUser } from '../../services/authAPI';
import { useNavigate, Link } from 'react-router-dom'; // Import Link
import styles from './AuthForm.module.css';
import { useAuth } from '../../contexts/AuthContext';
import Input from '../../components/common/Input/Input'; // Import common Input
import Button from '../../components/common/Button/Button'; // Import common Button

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState(''); // Can be email or username
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setToken, login: authLogin, logout: authLogout } = useAuth(); // Get setToken and authLogout

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const loginResponse = await loginUser({ username: email, password });
      const token = loginResponse.access_token;

      // Step 1: Set the token in store and sessionStorage
      setToken(token);
      // Add a small delay for debugging
      await new Promise(resolve => setTimeout(resolve, 100)); 
      const userDetails = await getCurrentUser();

      // Step 3: Finalize login in store with user details and token
      authLogin(userDetails, token);

      // Implement role-based navigation
      if (userDetails.role === 'candidate') {
        navigate('/candidate/dashboard');
      } else if (userDetails.role === 'hr') {
        navigate('/hr/dashboard');
      } else if (userDetails.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/'); // Fallback, or a generic authenticated page
      }

    } catch (err) {
      const errorMessage = (err instanceof Error ? err.message : String(err)) || 'Failed to login. Please check your credentials.';
      setError(errorMessage);
      // If any step failed, ensure we are logged out to clear partial state
      authLogout(); 
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.formContainer} aria-describedby={error ? "loginError" : undefined}>
      {error && <p id="loginError" className={styles.errorMessage} role="alert">{error}</p>}
      <Input
        label="Email (or Username):"
        id="email"
        name="email" // Added name for consistency, though not strictly needed if id is used by label
        type="email" // Changed from text to email for better semantics
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className={styles.formGroup} // Pass formGroup style if Input doesn't handle its own margins
      />
      <Input
        label="Password:"
        id="password"
        name="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        className={styles.formGroup}
      />
      <Button 
        type="submit" 
        isLoading={loading} 
        disabled={loading} 
        className={styles.submitButton} // Can be enhanced by Button variants
        fullWidth 
      >
        {loading ? 'Logging in...' : 'Login'}
      </Button>
      <p className={styles.linkText}>
        <Link to="/forgot-password" className={styles.inlineLink}>Forgot Password?</Link>
      </p>
    </form>
  );
};

export default LoginForm;
