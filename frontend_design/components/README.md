# Component Design

This section outlines the component-based architecture for the frontend of the LLM Interviewer Platform. A modular approach with reusable and role-specific components will be adopted to ensure consistency, maintainability, and efficient development.

## Philosophy

*   **Reusability**: Identify and build common UI elements that can be used across multiple parts of the application (e.g., buttons, input fields, modals, cards).
*   **Encapsulation**: Each component will manage its own logic and presentation, making them easier to understand, test, and maintain.
*   **Composition**: Complex UIs will be built by composing smaller, simpler components.
*   **Single Responsibility Principle**: Components should ideally have one primary purpose.

## Component Categories

Components will be broadly categorized into:

1.  **Common Components**: Generic UI elements used throughout the application, irrespective of user role or specific feature. These form the basic building blocks of the UI.
    *   Examples: `Button`, `Input`, `Modal`, `Card`, `Table`, `Spinner/Loader`, `AlertMessage`, `Icon`.
2.  **Layout Components**: Components responsible for the overall structure and layout of pages.
    *   Examples: `Header`, `Footer`, `SidebarNavigation`, `PageLayout`, `DashboardGrid`.
3.  **Feature/View-Specific Components**: Components tailored to a particular feature or page. These might be composed of common components but contain logic specific to that feature.
    *   Examples: `LoginForm`, `RegistrationForm`, `UserProfileForm`, `InterviewCard`, `QuestionDisplay`, `CandidateSearchFilters`, `UserManagementTable`.
4.  **Role-Specific Components**: Higher-level components or views that are unique to a user role's dashboard or specific functionalities.
    *   Examples: `CandidateDashboardWidgets`, `HRDashboardSummary`, `AdminStatsView`.

## Directory Structure (Conceptual)

Within the `src/components/` directory of the frontend application:

```
src/components/
|-- common/                 # Generic, reusable UI elements
|   |-- Button/
|   |   |-- Button.js
|   |   |-- Button.module.css (or Button.styles.js)
|   |-- Input/
|   |-- Modal/
|   |-- Card/
|   |-- Table/
|   |-- ...
|-- layout/                 # Page structure components
|   |-- Header.js
|   |-- Footer.js
|   |-- Sidebar.js
|   |-- ...
|-- features/ (or directly within pages/views if components are highly specific)
|   |-- auth/
|   |   |-- LoginForm.js
|   |   |-- RegistrationForm.js
|   |-- candidate/
|   |   |-- CandidateProfileForm.js
|   |   |-- InterviewListItem.js
|   |-- hr/
|   |   |-- CandidateSearchResultCard.js
|   |   |-- ScheduleInterviewForm.js
|   |-- admin/
|   |   |-- UserTableRow.js
|   |   |-- HRApplicationCard.js
|   |-- interview/
|   |   |-- QuestionDisplay.js
|   |   |-- AnswerInput.js
|   |   |-- CodeEditor.js
```

## Component Documentation

*   `common_components.md`: Details common, reusable UI elements.
*   `role_specific_components.md`: Highlights key components tailored for Candidate, HR, and Admin views, often composing common components.

This structure promotes a clean and organized codebase, making it easier for developers to find, use, and contribute components.
