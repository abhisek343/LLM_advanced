# Common Reusable UI Components

This document describes generic, reusable UI components that will form the building blocks of the LLM Interviewer Platform's frontend. These components are designed to be versatile and used across various features and user roles.

## 1. `Button`

*   **Description**: A standard clickable button.
*   **Props**:
    *   `onClick`: (Function) Action to perform on click.
    *   `variant`: (String, Optional) Style variant (e.g., "primary", "secondary", "danger", "link"). Defaults to "primary".
    *   `size`: (String, Optional) Size of the button (e.g., "small", "medium", "large"). Defaults to "medium".
    *   `disabled`: (Boolean, Optional) If true, button is not interactive.
    *   `isLoading`: (Boolean, Optional) If true, shows a loading spinner within the button and disables it.
    *   `iconLeft`: (ReactNode/Component, Optional) Icon to display to the left of the text.
    *   `iconRight`: (ReactNode/Component, Optional) Icon to display to the right of the text.
    *   `children`: (ReactNode) The text or content of the button.
    *   `type`: (String, Optional) HTML button type (e.g., "button", "submit", "reset"). Defaults to "button".
    *   `fullWidth`: (Boolean, Optional) If true, button takes full width of its container.
*   **Behavior**: Standard button interactions, visual feedback on hover/click.

## 2. `Input` / `TextInput`

*   **Description**: A standard text input field.
*   **Props**:
    *   `value`: (String) Current value of the input.
    *   `onChange`: (Function) Handler for value change.
    *   `label`: (String, Optional) Label displayed above or alongside the input.
    *   `placeholder`: (String, Optional) Placeholder text.
    *   `type`: (String, Optional) Input type (e.g., "text", "email", "password", "number"). Defaults to "text".
    *   `disabled`: (Boolean, Optional) If true, input is not interactive.
    *   `error`: (String, Optional) Error message to display below the input.
    *   `iconLeft`: (ReactNode/Component, Optional) Icon to display inside the input on the left.
    *   `iconRight`: (ReactNode/Component, Optional) Icon to display inside the input on the right.
    *   `name`: (String, Optional) HTML input name attribute.
    *   `required`: (Boolean, Optional) HTML required attribute.
*   **Behavior**: Allows text entry, displays errors, can show icons.

## 3. `Textarea`

*   **Description**: A multi-line text input field.
*   **Props**:
    *   `value`: (String) Current value.
    *   `onChange`: (Function) Handler for value change.
    *   `label`: (String, Optional) Label.
    *   `placeholder`: (String, Optional) Placeholder.
    *   `rows`: (Number, Optional) Number of visible text lines. Defaults to 3 or 4.
    *   `disabled`: (Boolean, Optional).
    *   `error`: (String, Optional) Error message.
    *   `name`: (String, Optional).
    *   `required`: (Boolean, Optional).
*   **Behavior**: Allows multi-line text entry.

## 4. `Select` / `Dropdown`

*   **Description**: A dropdown selection field.
*   **Props**:
    *   `value`: (String/Number) Currently selected value.
    *   `onChange`: (Function) Handler for value change.
    *   `options`: (Array of Objects) e.g., `[{ value: '1', label: 'Option 1' }, ...]`.
    *   `label`: (String, Optional) Label.
    *   `placeholder`: (String, Optional) Placeholder text for when no option is selected.
    *   `disabled`: (Boolean, Optional).
    *   `error`: (String, Optional) Error message.
    *   `name`: (String, Optional).
    *   `required`: (Boolean, Optional).
*   **Behavior**: Allows selection from a list of options.

## 5. `Checkbox`

*   **Description**: A checkbox input.
*   **Props**:
    *   `checked`: (Boolean) Current checked state.
    *   `onChange`: (Function) Handler for state change.
    *   `label`: (String, Optional) Label displayed next to the checkbox.
    *   `disabled`: (Boolean, Optional).
    *   `name`: (String, Optional).
*   **Behavior**: Standard checkbox toggle.

## 6. `Modal`

*   **Description**: A dialog box that overlays the main content.
*   **Props**:
    *   `isOpen`: (Boolean) Controls visibility of the modal.
    *   `onClose`: (Function) Handler called when the modal requests to be closed (e.g., by an 'X' button or overlay click).
    *   `title`: (String, Optional) Title displayed at the top of the modal.
    *   `children`: (ReactNode) Content of the modal body.
    *   `footerContent`: (ReactNode, Optional) Content for the modal footer (e.g., action buttons).
    *   `size`: (String, Optional) e.g., "small", "medium", "large".
*   **Behavior**: Appears on top of other content, typically with an overlay. Traps focus.

## 7. `Card`

*   **Description**: A container component with a distinct visual style (e.g., border, shadow) to group related content.
*   **Props**:
    *   `title`: (String, Optional) Title displayed within the card header.
    *   `children`: (ReactNode) Content of the card.
    *   `actions`: (ReactNode, Optional) Elements like buttons or links, often in a card footer.
    *   `className`: (String, Optional) Additional CSS classes.
*   **Behavior**: Visual grouping of content.

## 8. `Table`

*   **Description**: Displays tabular data.
*   **Props**:
    *   `columns`: (Array of Objects) Defines table columns, e.g., `[{ key: 'name', title: 'Name', render: (rowData) => ... }, ...]`.
    *   `data`: (Array of Objects) Data rows to display.
    *   `isLoading`: (Boolean, Optional) Shows a loading state for the table.
    *   `emptyText`: (String, Optional) Text to display when data is empty. Defaults to "No data available".
*   **Behavior**: Renders data in rows and columns. May support sorting, pagination via composition or further props.

## 9. `Spinner` / `Loader`

*   **Description**: An animated indicator for loading states.
*   **Props**:
    *   `size`: (String, Optional) e.g., "small", "medium", "large".
    *   `color`: (String, Optional) Color of the spinner.
*   **Behavior**: Visual cue that an operation is in progress.

## 10. `AlertMessage` / `Notification`

*   **Description**: Displays informative messages to the user (e.g., success, error, warning, info).
*   **Props**:
    *   `message`: (String) The message text.
    *   `type`: (String) "success", "error", "warning", "info".
    *   `closable`: (Boolean, Optional) If true, shows a close button.
    *   `onClose`: (Function, Optional) Handler for when the alert is closed.
*   **Behavior**: Appears (often temporarily or until dismissed) to provide feedback.

## 11. `Icon`

*   **Description**: A component to render SVG icons or icon font characters.
*   **Props**:
    *   `name`: (String) Identifier for the icon (e.g., "user", "settings", "delete").
    *   `size`: (String/Number, Optional) Size of the icon.
    *   `color`: (String, Optional) Color of the icon.
*   **Behavior**: Displays a vector graphic.

## 12. `FileUpload`

*   **Description**: A component for selecting and uploading files.
*   **Props**:
    *   `onFileSelect`: (Function) Callback when a file is selected, receives the file object.
    *   `label`: (String, Optional) Text for the upload button/area (e.g., "Choose File", "Drag & Drop Resume").
    *   `acceptedFileTypes`: (String, Optional) Comma-separated list of accepted MIME types or extensions (e.g., ".pdf,.docx", "image/*").
    *   `disabled`: (Boolean, Optional).
*   **Behavior**: Opens file dialog or supports drag-and-drop.

These common components will be styled consistently and form the core visual language of the application.
