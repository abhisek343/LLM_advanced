# Frontend Styling Guide

This document outlines the approach to styling for the LLM Interviewer Platform frontend.

## 1. Goals

*   **Consistency**: Ensure a consistent visual appearance across the entire application.
*   **Maintainability**: Styles should be easy to understand, modify, and extend.
*   **Scalability**: The styling approach should scale well as the application grows.
*   **Performance**: Avoid practices that negatively impact rendering performance.
*   **Theming (Optional but Recommended)**: Allow for potential future theming (e.g., dark mode, custom branding for enterprise clients).

## 2. Styling Technology Choices (Considerations)

The choice of styling technology often depends on the chosen frontend framework (React, Vue, Angular) and team preference.

*   **CSS Modules**:
    *   **Pros**: Locally scoped CSS by default (prevents global namespace collisions), explicit dependencies, can be used with preprocessors like SASS/LESS.
    *   **Cons**: Can sometimes be verbose to manage class names.
*   **Styled Components / Emotion (CSS-in-JS)**:
    *   **Pros**: Component-level styling, dynamic styling based on props, full power of JavaScript for styling logic, theming support.
    *   **Cons**: Potential runtime overhead (though often negligible), can mix concerns if not managed well.
*   **Tailwind CSS (Utility-First CSS)**:
    *   **Pros**: Rapid UI development, highly customizable, small production bundle sizes (due to purging unused styles), enforces consistency through a predefined set of utilities.
    *   **Cons**: Can lead to "utility class soup" in HTML if not componentized well, might have a steeper learning curve for those used to traditional CSS.
*   **SASS/LESS (CSS Preprocessors)**:
    *   **Pros**: Variables, mixins, nesting, functions – making CSS more powerful and maintainable. Can be used with CSS Modules or global stylesheets.
    *   **Cons**: Requires a build step.
*   **UI Component Libraries (e.g., Material-UI, Ant Design, Chakra UI, Bootstrap)**:
    *   **Pros**: Provides pre-built, styled, and accessible components, speeding up development and ensuring a consistent look and feel. Often have built-in theming.
    *   **Cons**: Can add to bundle size, might require overriding styles for heavy customization, locks into the library's design language.

**Recommendation**:
A combination is often effective:
1.  **Base Styling & Reset**: A global CSS reset (like `normalize.css` or a modern reset) and base HTML element styling.
2.  **Component Styling**:
    *   **CSS Modules with SASS/LESS**: Good balance of encapsulation and CSS power.
    *   **Tailwind CSS**: Excellent for rapid development and consistency, especially if components are well-abstracted to avoid overly cluttered templates.
    *   **Styled Components/Emotion**: If dynamic styling and theming are primary concerns.
3.  **UI Component Library (Optional)**: Consider using a library for common complex components (modals, tables, date pickers) if it aligns with the desired design and saves significant development time. Ensure it's customizable.

## 3. Design Tokens / Theme Variables

Regardless of the chosen technology, establishing a set of design tokens (theme variables) is crucial for consistency. These should be defined in a central place.

*   **Colors**: Primary, secondary, accent, success, error, warning, info, text colors (primary, secondary, disabled), background colors (page, card, input).
*   **Typography**: Font families (headings, body), font sizes (h1-h6, p, small), font weights, line heights.
*   **Spacing**: Margin and padding scale (e.g., 4px, 8px, 12px, 16px, 24px, 32px).
*   **Border Radius**: Consistent corner rounding for elements like buttons, cards, inputs.
*   **Shadows**: Predefined shadow styles for elevation.
*   **Breakpoints**: For responsive design (e.g., sm, md, lg, xl).

These tokens would then be used throughout the stylesheets or component styles. If using SASS/LESS or CSS-in-JS, these can be actual variables. Tailwind CSS is configured with these values.

## 4. File Structure for Styles (Example with CSS Modules + SASS)

```
src/
|-- styles/
|   |-- _variables.scss     # SASS variables (design tokens)
|   |-- _mixins.scss        # SASS mixins
|   |-- _reset.scss         # CSS reset
|   |-- global.scss         # Global styles (body, base HTML elements)
|   |-- theme.scss          # Imports variables and defines theme-specific overrides
|-- components/
|   |-- common/
|   |   |-- Button/
|   |   |   |-- Button.js
|   |   |   |-- Button.module.scss # Styles specific to the Button component
|   |-- ...
```

## 5. Responsive Design

*   Use mobile-first or desktop-first approach consistently.
*   Utilize media queries based on the defined breakpoints.
*   Test layouts on various screen sizes.
*   Consider flexible layouts (flexbox, grid) for adaptability.

## 6. Accessibility (Styling Aspects)

*   Ensure sufficient color contrast (WCAG AA as a minimum).
*   Use `rem` or `em` units for font sizes to respect user's browser settings.
*   Provide clear visual focus indicators for interactive elements.
*   Ensure link text is descriptive.

This styling guide provides a starting point. The specific choices will be refined once a frontend framework is selected and detailed UI mockups are available.
