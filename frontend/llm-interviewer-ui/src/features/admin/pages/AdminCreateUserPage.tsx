import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // useNavigate removed
import { registerUser } from '../../../services/authAPI';
import type { UserRegistrationData, Role } from '../../../services/authAPI'; // Assuming Role is exported or defined in authAPI
import MainLayout from '../../../components/layout/MainLayout';
import Input from '../../../components/common/Input/Input';
import Button from '../../../components/common/Button/Button';
import Select from '../../../components/common/Select/Select';
import styles from '../../auth/AuthForm.module.css'; // Reusing auth form styles

const AdminCreateUserPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<Role>('candidate');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // const navigate = useNavigate(); // Removed

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }
    setLoading(true);

    try {
      const userData: UserRegistrationData = { username, email, password, role };
      const createdUser = await registerUser(userData);
      setSuccessMessage(`User "${createdUser.username}" created successfully with role "${createdUser.role}".`);
      // Clear form
      setUsername('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setRole('candidate');
      // Optionally navigate back to user management or show link
      // navigate('/admin/user-management');
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to create user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className={styles.formContainer} style={{maxWidth: '600px', margin: '2rem auto'}}>
        <h1>Create New User</h1>
        {error && <p className={styles.errorMessage} role="alert">{error}</p>}
        {successMessage && <p className={styles.successMessage} role="status">{successMessage}</p>}
        
        <form onSubmit={handleSubmit}>
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
            onChange={(e) => setPassword(e.target.value)}
            required
            className={styles.formGroup}
          />
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
            label="Role:"
            id="role"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            required
            options={[
              { value: 'candidate', label: 'Candidate' },
              { value: 'hr', label: 'HR' },
              // Admin creation by another admin might need special handling or a different endpoint
              // For now, allowing creation of candidate/hr by admin.
              // { value: 'admin', label: 'Admin' }, 
            ]}
            className={styles.formGroup}
          />
          <Button 
            type="submit" 
            isLoading={loading} 
            disabled={loading} 
            className={styles.submitButton}
            fullWidth
          >
            {loading ? 'Creating User...' : 'Create User'}
          </Button>
        </form>
        <Link to="/admin/user-management" style={{display: 'block', textAlign: 'center', marginTop: '1rem'}}>
            Back to User Management
        </Link>
      </div>
    </MainLayout>
  );
};

export default AdminCreateUserPage;
