# Frontend MVP Tests

This directory contains the Jest tests for the frontend application.

## Running Tests with Docker

The tests are designed to be run inside a Docker container to ensure a consistent testing environment.

### Prerequisites

- Docker installed and running on your system.

### Steps to Run Tests

1.  **Navigate to the Root Directory:**
    Open your terminal and change to the root directory of the project (the directory containing `docker-compose.yml`).

2.  **Build the Test Docker Image:**
    If you haven't built the image yet, or if there have been changes to the `Dockerfile.tests` or related frontend code, build the image:
    ```bash
    docker-compose build frontend-tests
    ```
    *(Note: `frontend-tests` is the assumed service name in `docker-compose.yml` for running these tests. Adjust if your service name is different.)*

3.  **Run the Tests:**
    Execute the tests using the following command:
    ```bash
    docker-compose run --rm frontend-tests
    ```
    This command will start a new container from the `frontend-tests` image, run the `npm run test` command (as specified in `frontend_mvp_tests/Dockerfile.tests`), and then remove the container once the tests are complete.

    The test results will be displayed in your terminal.

### Test Configuration

-   **Test Runner:** Jest
-   **Test Files Location:** `frontend_mvp_tests/` (organized by feature/module)
-   **Jest Configuration:** `frontend/llm-interviewer-ui/jest.config.js`
-   **Dockerfile for Tests:** `frontend_mvp_tests/Dockerfile.tests`

### Notes

-   The `Dockerfile.tests` sets up the Node.js environment, installs frontend dependencies (from `frontend/llm-interviewer-ui/package.json`), copies the frontend application code and the test files, and then runs the tests.
-   Ensure that all necessary development dependencies for testing (e.g., `jest`, `ts-jest`, `@types/jest`, `@testing-library/react`) are listed in `frontend/llm-interviewer-ui/package.json`.
