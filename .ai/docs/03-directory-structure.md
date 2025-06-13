# Directory Structure

## Overview

This document provides a comprehensive guide to the AI Chatbot project's directory structure. Understanding the organization of files and folders is crucial for navigating the codebase effectively and contributing to the project.

## Root Directory

```
ai-chatbot/
├── .ai/                    # AI-related documentation and configs
├── app/                    # Next.js App Router directory
├── artifacts/              # AI-generated artifact components
├── components/             # Reusable React components
├── hooks/                  # Custom React hooks
├── lib/                    # Utility functions and configurations
├── public/                 # Static assets
├── tests/                  # Test files and configurations
├── .env.example           # Environment variables template
├── .eslintrc.json         # ESLint configuration
├── .gitignore             # Git ignore rules
├── biome.jsonc            # Biome linter/formatter config
├── components.json        # shadcn/ui components config
├── drizzle.config.ts      # Database configuration
├── instrumentation.ts     # OpenTelemetry instrumentation
├── middleware.ts          # Next.js middleware
├── next.config.ts         # Next.js configuration
├── package.json           # Project dependencies and scripts
├── playwright.config.ts   # E2E testing configuration
├── postcss.config.mjs     # PostCSS configuration
├── README.md              # Project documentation
├── tailwind.config.ts     # Tailwind CSS configuration
└── tsconfig.json          # TypeScript configuration
```

## App Directory (`/app`)

The `app` directory follows Next.js 13+ App Router conventions with route groups and layouts:

```
app/
├── favicon.ico            # Application favicon
├── globals.css            # Global CSS styles
├── layout.tsx             # Root layout component
├── (auth)/                # Authentication route group
│   ├── actions.ts         # Server actions for auth
│   ├── auth.config.ts     # NextAuth configuration
│   ├── auth.ts            # NextAuth setup
│   ├── login/
│   │   └── page.tsx       # Login page
│   ├── register/
│   │   └── page.tsx       # Registration page
│   └── api/
│       └── auth/
│           ├── [...nextauth]/
│           │   └── route.ts    # NextAuth API route
│           └── guest/
│               └── route.ts    # Guest authentication
└── (chat)/                # Chat route group
    ├── actions.ts         # Server actions for chat
    ├── layout.tsx         # Chat layout
    ├── page.tsx           # Main chat page
    ├── opengraph-image.png # Open Graph image
    ├── twitter-image.png  # Twitter card image
    ├── chat/
    │   └── [id]/
    │       └── page.tsx   # Individual chat page
    └── api/
        ├── chat/
        │   ├── route.ts   # Chat API endpoint
        │   └── schema.ts  # Chat API validation
        ├── document/
        │   └── route.ts   # Document API endpoint
        ├── files/
        │   └── upload/
        │       └── route.ts    # File upload endpoint
        ├── history/
        │   └── route.ts   # Chat history endpoint
        ├── suggestions/
        │   └── route.ts   # Suggestions endpoint
        └── vote/
            └── route.ts   # Voting endpoint
```

### Route Groups Explained

- **`(auth)`**: Contains authentication-related pages and API routes
- **`(chat)`**: Contains the main chat interface and related functionality

## Artifacts Directory (`/artifacts`)

Contains components for AI-generated artifacts:

```
artifacts/
├── actions.ts             # Server actions for artifacts
├── code/
│   ├── client.tsx         # Client-side code artifact component
│   └── server.ts          # Server-side code artifact logic
├── image/
│   ├── client.tsx         # Client-side image artifact component
│   └── server.ts          # Server-side image artifact logic
├── sheet/
│   ├── client.tsx         # Client-side spreadsheet component
│   └── server.ts          # Server-side spreadsheet logic
└── text/
    ├── client.tsx         # Client-side text artifact component
    └── server.ts          # Server-side text artifact logic
```

## Components Directory (`/components`)

Organized into UI components and feature-specific components:

```
components/
├── ui/                    # Base UI components (shadcn/ui)
│   ├── alert-dialog.tsx
│   ├── button.tsx
│   ├── card.tsx
│   ├── dropdown-menu.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── select.tsx
│   ├── separator.tsx
│   ├── sheet.tsx
│   ├── sidebar.tsx
│   ├── skeleton.tsx
│   ├── textarea.tsx
│   └── tooltip.tsx
├── app-sidebar.tsx        # Main application sidebar
├── artifact-*.tsx        # Artifact-related components
├── auth-form.tsx          # Authentication form
├── chat*.tsx              # Chat-related components
├── code-*.tsx             # Code editing components
├── document*.tsx          # Document handling components
├── editor*.tsx            # Various editor components
├── icons.tsx              # Icon components
├── markdown.tsx           # Markdown rendering
├── message*.tsx           # Message display components
├── model-selector.tsx     # AI model selection
├── multimodal-input.tsx   # File and text input
├── sidebar*.tsx           # Sidebar components
├── suggested-actions.tsx  # Action suggestions
├── theme-provider.tsx     # Theme context provider
└── weather.tsx            # Weather widget example
```

### Component Categories

1. **UI Components** (`/ui`): Base components from shadcn/ui
2. **Layout Components**: Sidebar, headers, navigation
3. **Chat Components**: Messages, input, suggestions
4. **Editor Components**: Code, text, image, sheet editors
5. **Authentication Components**: Login, registration forms
6. **Utility Components**: Icons, theme provider, toast notifications

## Hooks Directory (`/hooks`)

Custom React hooks for shared logic:

```
hooks/
├── use-artifact.ts        # Artifact state management
├── use-auto-resume.ts     # Auto-resume chat functionality
├── use-chat-visibility.ts # Chat visibility controls
├── use-messages.tsx       # Message state management
├── use-mobile.tsx         # Mobile device detection
└── use-scroll-to-bottom.tsx # Auto-scroll behavior
```

## Lib Directory (`/lib`)

Core utilities, configurations, and business logic:

```
lib/
├── ai/                    # AI-related utilities
│   ├── entitlements.ts    # AI usage limits and permissions
│   ├── models.ts          # AI model configurations
│   ├── models.test.ts     # AI model tests
│   ├── prompts.ts         # System prompts and templates
│   ├── providers.ts       # AI provider configurations
│   └── tools/             # AI tool implementations
│       ├── create-document.ts
│       ├── get-weather.ts
│       ├── request-suggestions.ts
│       └── update-document.ts
├── artifacts/
│   └── server.ts          # Server-side artifact logic
├── db/                    # Database-related files
│   ├── helpers/           # Database helper functions
│   ├── migrations/        # Drizzle database migrations
│   ├── migrate.ts         # Migration runner
│   ├── queries.ts         # Database queries
│   ├── schema.ts          # Database schema definitions
│   └── utils.ts           # Database utilities
├── editor/                # Editor configurations
│   ├── config.ts          # Editor settings
│   ├── diff.js            # Diff functionality
│   ├── functions.tsx      # Editor helper functions
│   ├── react-renderer.tsx # React rendering for editors
│   └── suggestions.tsx    # Editor suggestions
├── constants.ts           # Application constants
├── errors.ts              # Error handling utilities
├── types.ts               # TypeScript type definitions
└── utils.ts               # General utility functions
```

### Key Lib Subdirectories

- **`/ai`**: Everything related to AI integration and tools
- **`/db`**: Database schema, migrations, and queries
- **`/editor`**: Rich text and code editor configurations
- **Root files**: Shared utilities and type definitions

## Public Directory (`/public`)

Static assets served directly:

```
public/
└── images/
    ├── demo-thumbnail.png
    └── mouth of the seine, monet.jpg
```

## Tests Directory (`/tests`)

Comprehensive testing setup:

```
tests/
├── e2e/                   # End-to-end tests
│   ├── artifacts.test.ts
│   ├── chat.test.ts
│   ├── reasoning.test.ts
│   └── session.test.ts
├── pages/                 # Page object models
│   ├── artifact.ts
│   ├── auth.ts
│   └── chat.ts
├── prompts/               # Test prompts and utilities
│   ├── basic.ts
│   ├── routes.ts
│   └── utils.ts
├── routes/                # API route tests
│   ├── chat.test.ts
│   └── document.test.ts
├── fixtures.ts            # Test fixtures
└── helpers.ts             # Test helper functions
```

## Configuration Files

### Core Configuration

- **`next.config.ts`**: Next.js configuration including experimental features
- **`tsconfig.json`**: TypeScript compiler configuration
- **`tailwind.config.ts`**: Tailwind CSS customization
- **`drizzle.config.ts`**: Database ORM configuration

### Development Tools

- **`biome.jsonc`**: Biome linter and formatter settings
- **`.eslintrc.json`**: ESLint rules and plugins
- **`playwright.config.ts`**: E2E testing configuration
- **`components.json`**: shadcn/ui component configuration

### Build and Deployment

- **`package.json`**: Dependencies, scripts, and project metadata
- **`middleware.ts`**: Next.js middleware for authentication and routing
- **`instrumentation.ts`**: OpenTelemetry observability setup

## File Naming Conventions

### Components

- **PascalCase**: `ChatHeader.tsx`, `MessageEditor.tsx`
- **kebab-case for UI**: `alert-dialog.tsx`, `dropdown-menu.tsx`

### Hooks

- **camelCase with 'use' prefix**: `useMessages.tsx`, `useArtifact.ts`

### Utilities and Configs

- **camelCase**: `utils.ts`, `constants.ts`
- **kebab-case for configs**: `next.config.ts`, `tailwind.config.ts`

### API Routes

- **lowercase**: `route.ts` (Next.js convention)

### Tests

- **descriptive.test.ts**: `chat.test.ts`, `artifacts.test.ts`

## Import Patterns

The project uses absolute imports configured in `tsconfig.json`:

```typescript
// Absolute imports from root
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Chat } from "@/lib/db/schema";

// Relative imports for nearby files
import "./globals.css";
import { authConfig } from "./auth.config";
```

## Best Practices

### Directory Organization

1. **Group by feature**: Related components stay together
2. **Separate concerns**: UI, business logic, and data layers
3. **Consistent naming**: Follow established conventions
4. **Logical hierarchy**: Nested directories reflect relationships

### File Structure

1. **Single responsibility**: One main export per file
2. **Clear naming**: File names reflect their purpose
3. **Consistent exports**: Use default exports for components
4. **Type safety**: Co-locate types with their usage

## Next Steps

Now that you understand the directory structure, let's move on to [Local Development Setup](./04-local-development-setup.md) to get your environment ready for development.
