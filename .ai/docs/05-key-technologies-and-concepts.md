# Key Technologies and Concepts

## Overview

This document explains the core technologies and concepts that power the AI Chatbot application. Understanding these technologies will help you navigate the codebase effectively and contribute meaningfully to the project.

## Next.js 15 with App Router

### What is Next.js?

Next.js is a React framework that provides production-ready features like server-side rendering, static site generation, and API routes out of the box.

### App Router (Next.js 13+)

The project uses the modern App Router instead of the legacy Pages Router:

```typescript
// app/layout.tsx - Root layout
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

// app/page.tsx - Home page
export default function HomePage() {
  return <div>Welcome to AI Chatbot</div>;
}
```

### Key App Router Features

1. **Route Groups**: Organize routes without affecting URL structure

   ```
   app/
   ├── (auth)/          # Route group - doesn't affect URL
   │   ├── login/
   │   └── register/
   └── (chat)/          # Another route group
       └── chat/
   ```

2. **Layouts**: Shared UI between routes

   ```typescript
   // app/(chat)/layout.tsx
   export default function ChatLayout({
     children,
   }: {
     children: React.ReactNode;
   }) {
     return (
       <div className="flex h-screen">
         <Sidebar />
         <main>{children}</main>
       </div>
     );
   }
   ```

3. **Loading and Error States**: Built-in UI states

   ```typescript
   // app/loading.tsx - Shows while page loads
   export default function Loading() {
     return <div>Loading...</div>;
   }

   // app/error.tsx - Shows when errors occur
   export default function Error({ error }: { error: Error }) {
     return <div>Something went wrong: {error.message}</div>;
   }
   ```

## React Server Components (RSCs)

### Server vs Client Components

The application leverages both Server and Client Components:

```typescript
// Server Component (default) - runs on server
export default async function ChatHistory() {
  const chats = await getChats(); // Database call on server
  return (
    <div>
      {chats.map((chat) => (
        <ChatItem key={chat.id} chat={chat} />
      ))}
    </div>
  );
}

// Client Component - runs in browser
("use client");
import { useState } from "react";

export default function MessageInput() {
  const [message, setMessage] = useState("");

  return <input value={message} onChange={(e) => setMessage(e.target.value)} />;
}
```

### When to Use Each

**Server Components** (default):

- Data fetching
- Database queries
- Static content
- SEO-critical content

**Client Components** (`'use client'`):

- Interactive elements
- State management
- Event handlers
- Browser APIs

## Vercel AI SDK

### Core Concepts

The Vercel AI SDK provides unified interfaces for working with different AI providers:

```typescript
import { generateText, streamText } from "ai";
import { xai } from "@ai-sdk/xai";

// Generate text
const { text } = await generateText({
  model: xai("grok-2-1212"),
  prompt: "Hello, world!",
});

// Stream text responses
const result = await streamText({
  model: xai("grok-2-1212"),
  prompt: "Tell me a story...",
});

for await (const textPart of result.textStream) {
  process.stdout.write(textPart);
}
```

### React Integration

The SDK provides React hooks for building chat interfaces:

```typescript
"use client";
import { useChat } from "ai/react";

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();

  return (
    <div>
      {messages.map((message) => (
        <div key={message.id}>
          <strong>{message.role}:</strong> {message.content}
        </div>
      ))}

      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
```

### Tool Calling

AI models can call functions to perform actions:

```typescript
import { tool } from "ai";
import { z } from "zod";

const weatherTool = tool({
  description: "Get weather for a location",
  parameters: z.object({
    location: z.string().describe("The city name"),
  }),
  execute: async ({ location }) => {
    // Fetch weather data
    return { temperature: 72, condition: "sunny" };
  },
});

const result = await generateText({
  model: xai("grok-2-1212"),
  prompt: "What is the weather in San Francisco?",
  tools: { weather: weatherTool },
});
```

## Database with Drizzle ORM

### Schema Definition

Drizzle provides a TypeScript-first approach to database schemas:

```typescript
// lib/db/schema.ts
import { pgTable, uuid, varchar, timestamp, text } from "drizzle-orm/pg-core";

export const user = pgTable("User", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull(),
  password: varchar("password", { length: 64 }),
});

export const chat = pgTable("Chat", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("createdAt").notNull(),
  title: text("title").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
});

export type User = InferSelectModel<typeof user>;
export type Chat = InferSelectModel<typeof chat>;
```

### Database Queries

Type-safe queries with excellent IntelliSense:

```typescript
import { db } from "@/lib/db";
import { chat, user } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

// Get user's chats
export async function getUserChats(userId: string) {
  return await db
    .select()
    .from(chat)
    .where(eq(chat.userId, userId))
    .orderBy(desc(chat.createdAt));
}

// Join queries
export async function getChatsWithUsers() {
  return await db
    .select({
      chatId: chat.id,
      chatTitle: chat.title,
      userEmail: user.email,
    })
    .from(chat)
    .innerJoin(user, eq(chat.userId, user.id));
}
```

### Migrations

Database schema changes are managed through migrations:

```bash
# Generate migration files
pnpm db:generate

# Apply migrations
pnpm db:migrate

# View database in GUI
pnpm db:studio
```

## Authentication with NextAuth.js

### Configuration

NextAuth.js handles authentication with multiple providers:

```typescript
// app/(auth)/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcrypt-ts";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        // Verify credentials against database
        const user = await getUserByEmail(credentials.email);
        if (user && (await compare(credentials.password, user.password))) {
          return { id: user.id, email: user.email };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
});
```

### Protecting Routes

Use middleware to protect routes:

```typescript
// middleware.ts
import { auth } from "@/app/(auth)/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  if (!req.auth && req.nextUrl.pathname.startsWith("/chat")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

### Using Authentication in Components

```typescript
import { auth } from "@/app/(auth)/auth";

// Server Component
export default async function Profile() {
  const session = await auth();

  if (!session) {
    return <div>Please log in</div>;
  }

  return <div>Welcome, {session.user?.email}</div>;
}

// Client Component
("use client");
import { useSession } from "next-auth/react";

export default function UserProfile() {
  const { data: session, status } = useSession();

  if (status === "loading") return <div>Loading...</div>;
  if (!session) return <div>Not logged in</div>;

  return <div>Hello, {session.user?.email}</div>;
}
```

## UI Components with shadcn/ui

### Component System

The project uses shadcn/ui, which provides copy-paste components built on Radix UI:

```typescript
// components/ui/button.tsx
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
```

### Usage

```typescript
import { Button } from "@/components/ui/button";

export default function MyComponent() {
  return (
    <div>
      <Button variant="default">Default Button</Button>
      <Button variant="outline" size="sm">
        Small Outline
      </Button>
      <Button variant="destructive">Delete</Button>
    </div>
  );
}
```

## Styling with Tailwind CSS

### Configuration

Tailwind is configured with custom design tokens:

```typescript
// tailwind.config.ts
export default {
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
```

### CSS Variables

Theme colors are defined as CSS variables:

```css
/* app/globals.css */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
}
```

## TypeScript Integration

### Strict Type Safety

The project uses strict TypeScript configuration:

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### Type Inference

Drizzle and the AI SDK provide excellent type inference:

```typescript
// Database types are automatically inferred
const chats = await db.select().from(chat); // Type: Chat[]

// AI SDK types
const { text } = await generateText({
  model: xai("grok-2-1212"),
  prompt: "Hello",
}); // text is typed as string
```

## Testing with Playwright

### End-to-End Testing

Playwright provides browser automation for testing:

```typescript
// tests/e2e/chat.test.ts
import { test, expect } from "@playwright/test";

test("user can send a message", async ({ page }) => {
  await page.goto("/login");

  // Login
  await page.fill('[name="email"]', "test@example.com");
  await page.fill('[name="password"]', "password");
  await page.click('button[type="submit"]');

  // Send message
  await page.fill('[placeholder="Send a message"]', "Hello, AI!");
  await page.press('[placeholder="Send a message"]', "Enter");

  // Verify response
  await expect(page.locator('[data-testid="ai-message"]')).toBeVisible();
});
```

## Performance Concepts

### Server-Side Rendering (SSR)

Pages are rendered on the server for better SEO and initial load times:

```typescript
// Server Component - rendered on server
export default async function ChatPage({ params }: { params: { id: string } }) {
  const chat = await getChat(params.id); // Database call on server

  return (
    <div>
      <h1>{chat.title}</h1>
      <Messages chatId={chat.id} />
    </div>
  );
}
```

### Streaming

AI responses are streamed for better user experience:

```typescript
// API route with streaming
export async function POST(request: Request) {
  const { messages } = await request.json();

  const result = await streamText({
    model: xai("grok-2-1212"),
    messages,
  });

  return result.toAIStreamResponse();
}
```

### Code Splitting

Next.js automatically splits code for optimal loading:

```typescript
// Dynamic imports for code splitting
import dynamic from "next/dynamic";

const CodeEditor = dynamic(() => import("@/components/code-editor"), {
  loading: () => <div>Loading editor...</div>,
  ssr: false, // Don't render on server
});
```

## Development Tools

### Code Quality

- **ESLint**: Linting for JavaScript/TypeScript
- **Biome**: Fast formatter and linter
- **TypeScript**: Static type checking
- **Prettier**: Code formatting (via Biome)

### Database Tools

- **Drizzle Studio**: Visual database browser
- **Drizzle Kit**: Migration management
- **PostgreSQL**: Production database

### Deployment

- **Vercel**: Hosting and deployment platform
- **Vercel Analytics**: Performance monitoring
- **OpenTelemetry**: Observability and tracing

## Next Steps

Now that you understand the key technologies, you're ready to:

1. Learn about [Deployment](./06-deployment.md)
2. Review [Contribution Guidelines](./07-contribution-guidelines.md)
3. Start building features!

Each technology works together to create a robust, scalable, and maintainable AI chatbot application.
