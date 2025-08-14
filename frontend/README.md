# IoNbEc Frontend Application

A comprehensive examination management system frontend for the National Orthopaedic and Traumatology Board Examination (IoNbEc).

## Features

- **Authentication System**: Secure login for administrators and candidates
- **Dashboard Management**: Overview of system statistics and quick actions
- **Exam Management**: Create and manage examinations and deliveries
- **Question Management**: Organize questions by categories and sets
- **Participant Management**: Handle groups and candidate registrations
- **Scoring & Results**: Score examinations and view results
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components
- **Zustand** for state management
- **React Router** for navigation
- **Lucide React** for icons

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── layout/         # Layout components (Sidebar, DashboardLayout)
│   └── ui/             # shadcn/ui components
├── pages/              # Page components
├── store/              # Zustand stores for state management
└── lib/                # Utility functions
```

## Key Pages

### Public Pages
- **Public Home** (`/`): Landing page with system overview
- **Login** (`/login`): Authentication page

### Dashboard & Management
- **Dashboard** (`/back-office/dashboard`): Main admin dashboard with statistics and quick actions
- **Delivery Management** (`/back-office/delivery`): Manage exam deliveries with search and filtering
- **Exam Management** (`/back-office/test`): Create and manage exams

### Question Management
- **Question Categories** (`/back-office/category`): Organize question categories by type
- **Question Sets** (`/back-office/question-set`): Manage question sets with pagination
- **Question Set Details** (`/back-office/question-set/:id`): Authoring interface for individual question sets
- **Question Search** (`/back-office/question-pack`): Advanced search and filtering for questions

### Participant Management
- **Group Management** (`/back-office/group`): Handle participant groups
- **Group Details** (`/back-office/group/:id/takers`): Member management for specific groups
- **Candidate Management** (`/back-office/test-taker`): Register and manage candidates

### Scoring & Results
- **Scoring Management** (`/back-office/scoring`): Overview of deliveries for scoring
- **Scoring Details** (`/back-office/scoring/:id`): Detailed scoring interface for specific deliveries
- **Results Overview** (`/back-office/result`): View examination results by groups
- **Detailed Results** (`/back-office/result/:id`): Comprehensive results view for specific groups

### User Management
- **User Profile** (`/back-office/profile`): Personal profile management and settings
- **User Access Control** (`/back-office/user`): Manage system users and permissions

## Authentication

The application uses a mock authentication system. To log in:
- Username: Any valid username
- Password: Any password

In production, this should be replaced with a proper authentication system.

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint (if configured)

### State Management

The application uses Zustand for state management with the following stores:

- `authStore` - Authentication state
- `examStore` - Exams, deliveries, categories, and question sets
- `participantStore` - Groups, candidates, and results

### Component Library

Built with shadcn/ui components for consistent design:

- Buttons, Forms, Tables
- Cards, Dialogs, Dropdowns
- Navigation components
- Data display components

## Contributing

1. Follow the existing code style and patterns
2. Use TypeScript for type safety
3. Follow the component structure established in the project
4. Test your changes thoroughly

## License

This project is developed for educational and professional use in medical examination management.