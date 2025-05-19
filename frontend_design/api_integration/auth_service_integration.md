# Auth Service API Integration

This document details how frontend components and user flows interact with the `auth_service` backend API.

**Base URL**: `http://localhost:8001/api/v1/auth` (configurable)

## 1. User Registration

*   **Frontend View/Component**: `RegistrationForm` (within `/register` page)
*   **User Flow**: Common Authentication User Flows - 1. User Registration
*   **API Endpoint**: `POST /register`
*   **Request Body (JSON)**:
    ```json
    {
        "username": "newuser",
        "email": "newuser@example.com",
        "password": "password123",
        "role": "candidate" // or "hr"
    }
    ```
*   **Success Response (201 Created)**:
    ```json
    {
        "id": "mongodb_object_id_string",
        "username": "newuser",
        "email": "newuser@example.com",
        "role": "candidate",
        "is_active": true,
        "created_at": "datetime_string",
        "updated_at": "datetime_string"
        // Other non-sensitive fields from UserOut schema
    }
    ```
*   **Error Responses**:
    *   `400 Bad Request`: If email/username already exists (e.g., `{"detail": "Email already registered"}`).
    *   `422 Unprocessable Entity`: For validation errors (e.g., password too short, invalid email format). Response body will contain details.
*   **Frontend Action**:
    *   On success: Display success message, redirect to login page.
    *   On error: Display specific error messages to the user near the relevant form fields.

## 2. User Login

*   **Frontend View/Component**: `LoginForm` (within `/login` page)
*   **User Flow**: Common Authentication User Flows - 2. User Login
*   **API Endpoint**: `POST /login`
*   **Request Body (application/x-www-form-urlencoded)**:
    `username=user@example.com&password=securepassword123`
    *(Note: `username` field in the form data maps to email or username for login)*
*   **Success Response (200 OK)**:
    ```json
    {
        "access_token": "your_jwt_access_token",
        "token_type": "bearer"
    }
    ```
*   **Error Responses**:
    *   `401 Unauthorized`: Incorrect credentials (e.g., `{"detail": "Incorrect email or password"}`).
*   **Frontend Action**:
    *   On success: Store `access_token` securely. Fetch `/me` to get user details and role. Redirect to the appropriate role-based dashboard.
    *   On error: Display login error message.

## 3. Get Current User Details

*   **Frontend Logic**: Typically called after login, or on app load if a token exists. Used by main layout/navigation components to determine user role and display user info.
*   **User Flow**: Common Authentication User Flows - 4. Fetch Current User Details
*   **API Endpoint**: `GET /me`
*   **Request Headers**:
    `Authorization: Bearer <access_token>`
*   **Success Response (200 OK)**:
    ```json
    {
        "id": "mongodb_object_id_string",
        "username": "currentuser",
        "email": "currentuser@example.com",
        "role": "candidate", // or "hr", "admin"
        "is_active": true,
        "created_at": "datetime_string",
        "updated_at": "datetime_string",
        // Other fields from UserOut schema relevant to the frontend
        "profile_status": "pending_profile", // Example field for candidate/hr
        "mapping_status": "pending_assignment" // Example field for candidate/hr
    }
    ```
*   **Error Responses**:
    *   `401 Unauthorized`: If token is missing, invalid, or expired (e.g., `{"detail": "Not authenticated"}`).
*   **Frontend Action**:
    *   On success: Populate user state in the application (e.g., Redux store, Context). Update UI based on user role and details.
    *   On `401` error: Clear stored token, redirect to login page.

## 4. User Logout (Client-Side)

*   **Frontend View/Component**: Logout button (typically in `Header` or user menu).
*   **User Flow**: Common Authentication User Flows - 3. User Logout
*   **API Endpoint**: None directly called by default for simple logout (token is cleared client-side).
    *   *(Optional: If backend implements token blocklisting, a `POST /logout` endpoint could be called here with the token to invalidate it server-side.)*
*   **Frontend Action**:
    *   Remove the stored access token.
    *   Clear user-related application state.
    *   Redirect to the login page.

This covers the primary interactions with the `auth_service`.
