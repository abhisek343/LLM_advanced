# Auth Service System Design

## Overview
The Auth Service is responsible for user authentication and authorization within the LLM Interviewer platform. It handles user registration, login, and provides mechanisms for password reset. It issues JWT tokens for secure communication between the frontend and backend services.

## Key Responsibilities
- User Registration (creating new candidate, HR, or admin accounts)
- User Authentication (verifying credentials and issuing JWT tokens)
- User Authorization (providing a dependency to get the current authenticated user and their role)
- Password Reset (requesting and confirming password changes)
- Default Admin User Seeding (creating a default admin on startup if none exists)

## Dependencies
- **MongoDB:** Stores user credentials and related information (hashed passwords, roles, statuses, password reset tokens).
- **Other Services (implicitly):** Other backend services depend on the Auth Service's `/me` endpoint or the `get_current_active_user` dependency for authenticating and authorizing incoming requests.

## API Endpoints (Summary)
- `/auth/register`: Register a new user.
- `/auth/login`: Authenticate a user and issue a JWT token.
- `/auth/me`: Get details of the currently authenticated user.
- `/auth/password-reset/request`: Initiate a password reset request.
- `/auth/password-reset/confirm`: Confirm a password reset with a token.

## Data Models (Relevant)
- User (stores username, email, hashed password, role, and potentially password reset token/expiry)
- Token (schema for JWT access token and type)
- TokenData (schema for data contained within the JWT payload)

## Business Logic Highlights
- Validates user input during registration and login.
- Hashes passwords before storing them.
- Generates and verifies JWT tokens.
- Implements logic for password reset token generation and validation.
- Seeds a default admin user on application startup if configured and no admin exists.

## Potential Future Enhancements
- Email verification for new user registrations.
- Two-factor authentication.
- More robust password reset mechanism (e.g., using email sending service).
- Rate limiting for login attempts.