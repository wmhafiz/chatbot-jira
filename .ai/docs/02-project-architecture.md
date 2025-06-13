# Project Architecture

## Overview

The AI Chatbot application follows a modern full-stack architecture built on Next.js with clear separation of concerns. This document explains the high-level architecture, data flow, and key components that make up the system.

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        A[Web Browser]
        B[React Components]
        C[UI Components]
    end

    subgraph "Application Layer"
        D[Next.js App Router]
        E[API Routes]
        F[Server Actions]
        G[Middleware]
    end

    subgraph "AI Layer"
        H[Vercel AI SDK]
        I[xAI Grok]
        J[OpenAI]
        K[Other LLM Providers]
    end

    subgraph "Data Layer"
        L[PostgreSQL Database]
        M[Drizzle ORM]
        N[Redis Cache]
        O[Vercel Blob Storage]
    end

    subgraph "Authentication"
        P[NextAuth.js]
        Q[Session Management]
    end

    A --> B
    B --> C
    B --> D
    D --> E
    D --> F
    E --> H
    F --> H
    H --> I
    H --> J
    H --> K
    E --> M
    F --> M
    M --> L
    E --> N
    F --> N
    E --> O
    F --> O
    G --> P
    P --> Q
    D --> G
```

## Component Architecture

### Frontend Components

The frontend is organized into several key component categories:

```mermaid
graph TD
    A[App Layout] --> B[Chat Interface]
    A --> C[Authentication Forms]
    A --> D[Sidebar Navigation]

    B --> E[Message Components]
    B --> F[Input Components]
    B --> G[Artifact Components]

    E --> H[Message Display]
    E --> I[Message Actions]
    E --> J[Message Editor]

    F --> K[Multimodal Input]
    F --> L[File Upload]
    F --> M[Suggestions]

    G --> N[Code Editor]
    G --> O[Text Editor]
    G --> P[Image Editor]
    G --> Q[Sheet Editor]
```

### Backend Architecture

The backend follows Next.js App Router patterns with clear API organization:

```mermaid
graph LR
    subgraph "API Routes"
        A[chat]
        B[auth]
        C[document]
        D[files]
        E[history]
        F[suggestions]
        G[vote]
    end

    subgraph "Server Actions"
        H[Chat Actions]
        I[Auth Actions]
        J[Document Actions]
    end

    subgraph "Database Layer"
        K[User Management]
        L[Chat Storage]
        M[Document Storage]
        N[File Storage]
    end

    A --> H
    B --> I
    C --> J
    H --> K
    H --> L
    I --> K
    J --> M
    D --> N
```

## Data Flow

### Chat Message Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Chat Component
    participant API as API Route
    participant AI as AI SDK
    participant LLM as LLM Provider
    participant DB as Database

    U->>C: Send message
    C->>API: POST /api/chat
    API->>DB: Save user message
    API->>AI: Process with AI SDK
    AI->>LLM: Send to LLM provider
    LLM-->>AI: Stream response
    AI-->>API: Stream chunks
    API-->>C: Stream response
    C-->>U: Display streaming response
    API->>DB: Save AI response
```

### Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant L as Login Page
    participant A as NextAuth
    participant DB as Database
    participant S as Session

    U->>L: Enter credentials
    L->>A: Authenticate
    A->>DB: Verify user
    DB-->>A: User data
    A->>S: Create session
    A-->>L: Authentication result
    L-->>U: Redirect to chat
```

## Database Schema

The application uses a PostgreSQL database with the following main entities:

```mermaid
erDiagram
    User {
        uuid id PK
        varchar email
        varchar password
    }

    Chat {
        uuid id PK
        timestamp createdAt
        text title
        uuid userId FK
        varchar visibility
    }

    Message_v2 {
        uuid id PK
        uuid chatId FK
        varchar role
        json parts
        json attachments
        timestamp createdAt
    }

    Document {
        uuid id PK
        timestamp createdAt PK
        text title
        text content
        varchar kind
        uuid userId FK
    }

    Vote_v2 {
        uuid chatId FK
        uuid messageId FK
        boolean isUpvoted
    }

    Suggestion {
        uuid id PK
        uuid documentId FK
        timestamp documentCreatedAt FK
        text originalText
        text suggestedText
        text description
        boolean isResolved
        uuid userId FK
        timestamp createdAt
    }

    User ||--o{ Chat : owns
    Chat ||--o{ Message_v2 : contains
    User ||--o{ Document : creates
    Message_v2 ||--o{ Vote_v2 : receives
    Document ||--o{ Suggestion : has
    User ||--o{ Suggestion : makes
```

## Key Architectural Patterns

### 1. Server Components & Client Components

The application leverages React Server Components for optimal performance:

- **Server Components**: Handle data fetching, AI processing, and database operations
- **Client Components**: Manage user interactions, real-time updates, and client-side state

### 2. Streaming Responses

AI responses are streamed in real-time using:

- Server-Sent Events (SSE) for real-time communication
- React's `useEffect` and `useState` for handling streaming data
- Optimistic UI updates for better user experience

### 3. Middleware Integration

Next.js middleware handles:

- Authentication checks
- Route protection
- Request/response modification
- Logging and analytics

### 4. Type Safety

The entire application is built with TypeScript:

- Database schema types generated by Drizzle
- API route types with Zod validation
- Component prop types with React TypeScript
- AI SDK types for structured responses

## Security Architecture

### Authentication & Authorization

```mermaid
graph TD
    A[Request] --> B{Authenticated?}
    B -->|No| C[Redirect to Login]
    B -->|Yes| D{Authorized?}
    D -->|No| E[403 Forbidden]
    D -->|Yes| F[Process Request]

    C --> G[NextAuth Login]
    G --> H[Verify Credentials]
    H --> I[Create Session]
    I --> F
```

### Data Protection

- **Environment Variables**: Sensitive data stored securely
- **Database Security**: Connection pooling and query parameterization
- **File Upload Security**: Type validation and size limits
- **CORS Configuration**: Proper cross-origin resource sharing setup

## Performance Optimizations

### 1. Database Optimizations

- Connection pooling with PostgreSQL
- Indexed queries for fast lookups
- Efficient pagination for chat history

### 2. Caching Strategy

- Redis for session storage
- Static asset caching
- API response caching where appropriate

### 3. Frontend Optimizations

- Code splitting with Next.js
- Image optimization
- Lazy loading of components
- Optimistic UI updates

## Deployment Architecture

The application is designed for deployment on Vercel:

```mermaid
graph TB
    A[GitHub Repository] --> B[Vercel Build]
    B --> C[Static Assets]
    B --> D[Serverless Functions]
    C --> E[CDN Distribution]
    D --> F[Edge Runtime]
    F --> G[Database Connections]
    F --> H[External APIs]
    F --> I[File Storage]
```

## Next Steps

Now that you understand the architecture, let's explore the [Directory Structure](./03-directory-structure.md) to see how the code is organized.
