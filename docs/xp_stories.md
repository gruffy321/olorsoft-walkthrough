# Olorsoft 3D Walkthrough - XP Stories

## Iteration 1: Scaffolding & Data Layer
**User Story 1:** As a developer, I want a well-defined folder structure and JSON schema so that I can decouple the 3D engine logic from the content.
- **Tasks:** Git init, create directories, define `content.json`.
- **Security Constraint:** JSON schema must be strict to prevent XSS if loaded directly.

## Iteration 2: Admin Backend
**User Story 2:** As a portfolio owner, I want a secure hidden dashboard to upload models and images without touching code.
- **Tasks:** Build `index.php` with session auth, `upload.php`, `save_json.php`.
- **Security Constraint:** `upload.php` must strictly validate MIME types (e.g., `model/gltf-binary`, `image/png`, `image/jpeg`) and reject `.php` or executable extensions. `save_json.php` must sanitize text inputs.

## Iteration 3: Core Engine
**User Story 3:** As a user, I want to load the 3D scene smoothly so that I can start the walkthrough.
- **Tasks:** Three.js setup, load `content.json`, basic lighting and camera.
- **Security Constraint:** Sanitize JSON data before rendering it into the DOM to prevent DOM-based XSS.

## Iteration 4: UI & Accessibility
**User Story 4:** As a mobile user, I want clear on-screen controls and prompt to rotate my device so I can navigate easily.
**User Story 5:** As an impaired user, I want semantic HTML fallbacks, screen-reader support, and contrast toggles so that I can consume the content without barriers.
- **Tasks:** UI overlay, orientation lock, ARIA tags, custom CSS variables for Dyslexic font and high contrast.
- **Security Constraint:** Ensure `localStorage` saves for accessibility preferences are validated (e.g., must be boolean or specific string values) before being applied to the DOM.
