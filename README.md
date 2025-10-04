# AIDev Challenge Hub 2025

Welcome to the AIDev Challenge Hub, a comprehensive platform for managing and participating in AI development competitions. This application is built with a modern, robust tech stack and designed to provide a seamless experience for managers, students, and other roles.

## ✨ Features

-   **Role-Based Dashboards**: Tailored interfaces for different user types (Manager, Student, Teacher, Admin).
-   **Team Management**: Managers can oversee teams, assign projects, and manage members. Students can view their team and assigned project.
-   **Automated Team Assignment**: New students are automatically assigned to teams with available slots or to a new team.
-   **Project Management**: Managers can create, update, and delete projects for the challenge.
-   **Event Schedule**: A dynamic schedule of events (conferences, workshops, challenges) that all users can view.
-   **Real-time Updates**: Built with Firestore to provide live data across the application.
-   **Global Settings**: Managers can enable or disable user logins for the entire application.
-   **PWA Ready**: The application is a Progressive Web App, making it installable on mobile devices for an app-like experience.

## 🚀 Tech Stack

-   **Frontend**: [Next.js](https://nextjs.org/) (with App Router) & [React](https://reactjs.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
-   **Backend & Database**: [Firebase](https://firebase.google.com/) (Authentication & Firestore)
-   **Generative AI**: [Genkit](https://firebase.google.com/docs/genkit)
-   **Progressive Web App**: [next-pwa](https://www.npmjs.com/package/next-pwa)

## 📋 Getting Started

This project is designed to run within Firebase Studio, which handles the environment setup and Firebase configuration automatically.

### Firebase Configuration

The application requires Firebase credentials to connect to Firebase Authentication and Firestore. These credentials should be stored in a `.env` file at the root of the project:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### User Roles

User roles are automatically assigned based on their email format. This logic is defined in `src/lib/roles.ts`.

-   **Manager**: Assigned to users whose emails are listed in the `permissions/managers` document in Firestore.
-   **Teacher**: Email format is `firstname.lastname@domain.com`.
-   **Admin**: Email format is `flastname@domain.com`.
-   **Student**: Email format contains numbers (e.g., `a12345@domain.com`).

## 📜 Available Scripts

In the project directory, you can run:

-   `npm run dev`: Runs the app in development mode.
-   `npm run build`: Builds the app for production.
-   `npm run start`: Starts a production server.
-   `npm run lint`: Lints the project files.
