# SchoolTrack - Grade Tracking Web Application

## Overview

SchoolTrack is a comprehensive web application designed for educational environments to track and manage students' grades, assignments, and class information. The system provides teachers with tools to manage student records, enter grades, create assignments, and generate reports, while administrators have additional capabilities for user management and system oversight.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The client-side application is built using React with TypeScript and follows a modern component-based architecture:

- **React with TypeScript**: Provides type safety and better developer experience
- **Wouter**: Lightweight client-side routing for navigation between pages
- **TanStack Query**: Data fetching, caching, and synchronization with the backend API
- **React Hook Form**: Form management with Zod validation for type-safe form handling
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Shadcn UI**: Consistent, accessible component library built on Radix UI primitives

The application is structured with dedicated pages for Dashboard, Students, Grades, and Assignments, each with their own specialized components and modals for CRUD operations.

### Backend Architecture

The server-side follows a RESTful API design using Node.js and Express:

- **Express.js**: Web application framework with middleware for request handling
- **TypeScript**: Type safety across the entire backend codebase
- **Modular Route Structure**: Organized API endpoints in `/api` namespace
- **Storage Layer Abstraction**: Clean separation between routes and data access logic
- **Error Handling**: Centralized error handling with proper HTTP status codes

### Data Storage Solutions

The application uses PostgreSQL with Drizzle ORM for robust data management:

- **PostgreSQL**: Primary relational database for all application data
- **Drizzle ORM**: Type-safe database queries with schema-first approach
- **Neon Serverless**: Cloud PostgreSQL provider for scalable database hosting
- **Database Schema**: Well-structured tables for users, students, classes, assignments, grades, and enrollments
- **Session Storage**: PostgreSQL-based session storage for authentication state

### Authentication and Authorization

Authentication is handled through Replit's OpenID Connect (OIDC) system:

- **Replit Auth**: Secure authentication using OpenID Connect protocol
- **Passport.js**: Authentication middleware with OpenID Client strategy
- **Role-Based Access Control**: Teacher and admin roles with different permission levels
- **Session Management**: Secure session handling with PostgreSQL storage
- **Route Protection**: Middleware to protect authenticated routes

### Database Design

The schema includes the following core entities:
- **Users**: Teacher and admin accounts with roles and profile information
- **Students**: Student records with identification and contact details
- **Classes**: Course/subject management linked to teachers
- **Assignments**: Assignment creation with due dates and point values
- **Grades**: Grade records linking students to assignments with scores
- **Enrollments**: Many-to-many relationship between students and classes

## External Dependencies

### Third-Party Services
- **Neon Database**: Cloud PostgreSQL hosting for scalable data storage
- **Replit Auth**: OpenID Connect authentication service for user management

### Frontend Libraries
- **Radix UI**: Headless UI components for accessibility and customization
- **Tailwind CSS**: Utility-first CSS framework for styling
- **TanStack Query**: Data fetching and state management
- **React Hook Form**: Form handling and validation
- **Zod**: Schema validation for type safety
- **date-fns**: Date manipulation and formatting utilities

### Backend Dependencies
- **Express.js**: Web application framework
- **Drizzle ORM**: Database ORM with type safety
- **Passport.js**: Authentication middleware
- **OpenID Client**: OIDC authentication handling
- **connect-pg-simple**: PostgreSQL session store

### Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Static type checking
- **ESLint/Prettier**: Code quality and formatting
- **Drizzle Kit**: Database migration management