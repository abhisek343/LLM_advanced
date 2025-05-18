# 🤖 LLM Interviewer Platform - Microservices

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python Version](https://img.shields.io/badge/python-3.9%2B-blue.svg)](https://www.python.org/downloads/)
[![Framework: FastAPI](https://img.shields.io/badge/Framework-FastAPI-green.svg)](https://fastapi.tiangolo.com/)

Welcome to the LLM Interviewer Platform! 🎉 This project leverages Large Language Models to conduct automated interviews, analyze candidate responses, and streamline the hiring process. It is architected as a set of independent microservices, promoting scalability, maintainability, and clear separation of concerns.

## 📖 Table of Contents

- [✨ Features](#-features)
- [📸 Screenshots](#-screenshots)
- [🚀 Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation & Setup (Using Docker Compose - Recommended)](#installation--setup-using-docker-compose---recommended)
  - [Running Frontend Tests](#running-frontend-tests)
  - [Manual Setup (Per Service - More Complex)](#manual-setup-per-service---more-complex)
- [📁 Project Structure](#-project-structure)
- [🛠️ Tech Stack](#️-tech-stack)
- [🐳 Docker](#-docker)
  - [Building Individual Docker Images (Optional)](#building-individual-docker-images-optional)
  - [Running Individual Docker Containers (Not Recommended for Full System)](#running-individual-docker-containers-not-recommended-for-full-system)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [📞 Contact](#-contact)

## ✨ Features

*   **Automated Interviews**: Conduct interviews using AI-powered questions (Interview Service).
*   **User Authentication**: Secure registration and login (Auth Service).
*   **Candidate Management**: Candidate profiles, resume uploads, and application tracking (Candidate Service).
*   **HR Management**: HR profiles, resume uploads, and mapping to Admins (HR Service).
*   **Admin Management**: User management, candidate-HR assignment, and system overview (Admin Service).
*   **Resume Analysis**: AI-driven insights from candidate and HR resumes (Candidate & HR Services).
*   **Search & Filtering**: Efficiently search and filter candidates and HR personnel (Admin & HR Services).
*   **Secure Authentication**: Robust authentication for users (Auth Service).
*   **Scalable Architecture**: Built with FastAPI for high performance, with distinct microservices.

## 📸 Screenshots

Here's a sneak peek of the LLM Interviewer Platform in action:

| Registration                                     | View 1                                       | View 2                                       |
| :-----------------------------------------------: | :-------------------------------------------: | :-------------------------------------------: |
| ![Registration](images/registration.png) | ![Some View](images/someviews.png)   | ![Some View 2](images/someviews2.png) |

| View 3                                       | View 4                                       |
| :-------------------------------------------: | :-------------------------------------------: |
| ![Some View 3](images/someviews3.png) | ![Some View 4](images/someviews4.png) |

## 🚀 Getting Started

### Prerequisites

*   Python 3.9+
*   MongoDB
*   Poetry (or pip for managing dependencies)
*   Docker & Docker Compose
*   An API key for an LLM provider (e.g., Gemini/OpenAI)

### Installation & Setup (Using Docker Compose - Recommended)

The easiest way to get all services up and running is with Docker Compose.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/abhisek343/LLM_advanced.git
    cd LLM_advanced
    ```

2.  **Set up environment variables:**
    Create a `.env` file in the project root directory by copying `.env.example` (if one exists at the root, or use one of the service `.env.example` files as a template):
    ```bash
    cp auth_service/.env.example .env # Or copy from any other service directory
    ```
    Update the `.env` file with your MongoDB connection string (ensure `MONGODB_URL` points to `mongodb://mongodb:27017` for Docker Compose networking), LLM API keys, and other configurations. This single `.env` file will be used by all services defined in `docker-compose.yml`.

3.  **Build and run the services with Docker Compose:**
    From the project root directory (where `docker-compose.yml` is located):
    ```bash
    docker-compose up --build
    ```
    To run in detached mode:
    ```bash
    docker-compose up --build -d
    ```

4.  **Accessing Services:**
    Each service exposes its API and interactive documentation (Swagger UI). After running `docker-compose up --build -d`, you can access them as follows:

    *   __Auth Service__:
        *   API Base for service-specific routes: `http://localhost:8001/api/v1/auth`
        *   Interactive API Docs (Swagger UI): `http://localhost:8001/api/v1/docs`
        *   Alternative API Docs (ReDoc): `http://localhost:8001/api/v1/redoc`

    *   __Candidate Service__:
        *   API Base for service-specific routes: `http://localhost:8002/api/v1/candidate`
        *   Interactive API Docs (Swagger UI): `http://localhost:8002/api/v1/docs`
        *   Alternative API Docs (ReDoc): `http://localhost:8002/api/v1/redoc`

    *   __Interview Service__:
        *   API Base for service-specific routes: `http://localhost:8003/api/v1/interview`
        *   Interactive API Docs (Swagger UI): `http://localhost:8003/api/v1/docs`
        *   Alternative API Docs (ReDoc): `http://localhost:8003/api/v1/redoc`

    *   __Admin Service__:
        *   API Base for service-specific routes: `http://localhost:8004/api/v1/admin`
        *   Interactive API Docs (Swagger UI): `http://localhost:8004/api/v1/docs`
        *   Alternative API Docs (ReDoc): `http://localhost:8004/api/v1/redoc`

    *   __HR Service__:
        *   API Base for service-specific routes: `http://localhost:8005/api/v1/hr`
        *   Interactive API Docs (Swagger UI): `http://localhost:8005/api/v1/docs`
        *   Alternative API Docs (ReDoc): `http://localhost:8005/api/v1/redoc`

    *   **MongoDB**: Accessible on `localhost:27017` from your host machine (if you need to connect directly with a MongoDB client).

    *Note: The API base paths assume each service's router is included with a prefix like `/api/v1` and then a service-specific path like `/auth` or `/candidate`. The documentation URLs assume each service's FastAPI app is configured with `docs_url="/api/v1/docs"` and `redoc_url="/api/v1/redoc"`. Please verify the `main.py` and `core/config.py` in each service if these paths differ.*

5.  **To stop the services:**
    ```bash
    docker-compose down
    ```

### Running Frontend Tests

The frontend application (`llm-interviewer-ui`) includes a suite of Jest tests located in the `frontend_mvp_tests` directory. These tests are designed to be run within a Docker container for consistency.

1.  **Navigate to the Root Directory:**
    Ensure your terminal is in the root directory of the project (where `docker-compose.yml` is located).

2.  **Build the Test Docker Image (if not already built or if changes were made):**
    The `docker-compose.yml` file should define a service for running these tests (e.g., `frontend-tests`).
    ```bash
    docker-compose build frontend-tests
    ```
    *(Adjust `frontend-tests` if your service name in `docker-compose.yml` is different. This service should use `frontend_mvp_tests/Dockerfile.tests`.)*

3.  **Run the Tests:**
    ```bash
    docker-compose run --rm frontend-tests
    ```
    This command executes the `npm run test` script defined in `frontend/llm-interviewer-ui/package.json` (which should be configured to use Jest and find tests in `../frontend_mvp_tests/`). Test results will be displayed in the terminal.

For more details on the test setup, see `frontend_mvp_tests/readme.md`.

## 📁 Project Structure

The project is organized into several directories, each representing a distinct microservice or component:

```
.
├── admin_service/          # Admin service code
├── auth_service/           # Authentication service code
├── backend_design/         # Backend design documentation
├── candidate_service/      # Candidate service code
├── docker-compose.yml      # Docker Compose orchestration file
├── frontend/               # Frontend application code (llm-interviewer-ui)
├── frontend_design/        # Frontend design documentation
├── frontend_mvp_tests/     # Frontend MVP tests
├── hr_service/             # HR service code
├── interview_service/      # Interview service code
├── Readme.md               # Project README
└── ...other files
```

Each service directory (`*_service`) typically contains:

```
service_name/
├── app/                    # Application source code
│   ├── api/                # API routes
│   ├── core/               # Core configurations and utilities
│   ├── db/                 # Database interactions
│   ├── models/             # Database models
│   ├── schemas/            # Pydantic schemas for data validation
│   └── services/           # Business logic and external service interactions
├── Dockerfile              # Docker build instructions
├── requirements.txt        # Python dependencies
├── .env.example            # Example environment variables
├── .gitignore              # Git ignore file
└── tests/                  # Unit and integration tests
```

## 🛠️ Tech Stack

*   **Backend**: Python, FastAPI (for each microservice)
*   **Database**: MongoDB (shared instance)
*   **LLM Integration**: Gemini (or other LLMs, configured per relevant service)
*   **Authentication**: JWT (primarily handled by Auth Service)
*   **Backend Testing**: Pytest (to be set up per service)
*   **Frontend Testing**: Jest, React Testing Library (run via Docker, see `frontend_mvp_tests/`)
*   **Deployment**: Docker, Docker Compose

## 🐳 Docker

Each service (`auth_service`, `candidate_service`, etc.) has its own `Dockerfile` for building its image. The `docker-compose.yml` file at the project root orchestrates these services.

### Building Individual Docker Images (Optional)

If you need to build an image for a specific service (e.g., `auth_service`):
Navigate to the service directory:
```bash
cd auth_service
docker build -t llm-interviewer-auth-service .
```
Repeat for other services, changing the directory and tag accordingly.

### Running Individual Docker Containers (Not Recommended for Full System)

While possible, running individual containers and managing networking manually is more complex than using Docker Compose. If you do:
```bash
# Example for auth_service, assuming mongodb is already running and accessible
docker run -d -p 8001:8000 --env-file ../.env --network llm_interviewer_network llm-interviewer-auth-service
```
(Ensure the root `.env` file is correctly referenced or provide environment variables directly. The network `llm_interviewer_network` must be created first if not using Docker Compose to manage it: `docker network create llm_interviewer_network`)

## 🤝 Contributing

Contributions are welcome! If you'd like to contribute, please follow these steps:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes within the relevant service directory(ies).
4.  Write tests for your changes.
5.  Ensure all tests pass.
6.  Commit your changes (`git commit -m 'feat: Add new feature for X service'`). Use conventional commits if possible.
7.  Push to the branch (`git push origin feature/your-feature-name`).
8.  Open a Pull Request describing your changes.

Please make sure to update documentation as appropriate.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details (if you add one).

## 📞 Contact

If you have any questions or suggestions, feel free to open an issue on the GitHub repository.

---

Made with ❤️ and 🐍
