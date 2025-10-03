# Technical Memo: Auth Development Mode Override

This document outlines the temporary changes made to bypass the Firebase authentication flow for development and testing purposes. To restore the original authentication behavior, reverse the changes listed below.

---

### 1. `src/context/settings-context.tsx`

-   **State Initialization**:
    -   `isLoading` is hardcoded to `false` (`useState(false)`). To restore, it should be initialized to `true` (`useState(true)`).
-   **`onAuthStateChanged` Listener**:
    -   The primary `useEffect` hook containing the `onAuthStateChanged` listener is completely commented out. To restore, uncomment this entire block.
-   **Dummy User & Dev Login**:
    -   A `DUMMY_USER` object and a `handleDevLogin` function have been added. These are used to simulate a logged-in user with a specific role. These should be removed.
-   **`handleSignOut` Function**:
    -   The original `signOut` logic from Firebase is commented out and replaced with a simple `clearUserData()` call. To restore, uncomment the original `try/catch` block and remove the dev mode logic.
-   **Context Value**:
    -   `handleDevLogin` is added to the context value. This should be removed on restoration.

---

### 2. `src/app/page.tsx`

-   **Redirection Logic**:
    -   The `useEffect` hook responsible for redirecting an already logged-in user to the dashboard is commented out. Uncomment this block to restore automatic redirection.
-   **Sign-In UI**:
    -   The original Google Sign-In `<Button>` is commented out.
    -   Three new buttons for role-based development login have been added.
    -   To restore, remove the three development buttons and uncomment the original Google Sign-In button.
-   **Dev Login Handler**:
    -   An `onDevLogin` function has been added to handle the click events from the development buttons. This can be removed.
-   **Imports**: The `handleDevLogin` function is imported from `useSettings`. This import will be unused after restoration.

---

### 3. `src/components/auth-guard.tsx`

-   **Component Logic**:
    -   The entire logic of the `AuthGuard` component (`useEffect` for redirection, conditional rendering of `LoadingScreen`) is commented out.
    -   The component is currently a simple passthrough that renders `{children}` immediately.
    -   To restore, uncomment the original logic and remove the `return <>{children}</>;` line from the top.

---

**Restoration Summary:**

To return to the production authentication flow, systematically uncomment the blocks marked with `/* ... */` in the files above and remove all code sections marked with `// --- DEV MODE ---`.
