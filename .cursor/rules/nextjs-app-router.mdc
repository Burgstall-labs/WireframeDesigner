---
description: Best practices for Next.js App Router development with TypeScript, Shadcn UI, and Tailwind
globs: **/*.{ts,tsx}, **/app/**/*, **/components/**/*, **/lib/**/*
---

# Next.js App Router

// Description: Best practices for Next.js App Router development with TypeScript, Shadcn UI, and Tailwind
// Recommended Globs: **/*.{ts,tsx}, **/app/**/*, **/components/**/*, **/lib/**/*

## Project Structure
```
src/
  app/
    (auth)/
      login/
        page.tsx
      register/
        page.tsx
    (dashboard)/
      layout.tsx
      page.tsx
    api/
      route.ts
  components/
    ui/
      button.tsx
      card.tsx
    auth-wizard/
      auth-form.tsx
      password-input.tsx
    dashboard/
      stats-card.tsx
  lib/
    utils.ts
    constants.ts
  types/
    index.ts
  styles/
    globals.css
```

## Component Structure
```typescript
// src/components/dashboard/stats-card.tsx
import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber } from '@/lib/utils';

interface StatsData {
  title: string;
  value: number;
  change: number;
}

interface StatsCardProps {
  data: StatsData;
  isLoading?: boolean;
}

function StatsSkeleton() {
  return (
    <div className="h-[120px] w-full animate-pulse rounded-lg bg-muted" />
  );
}

export function StatsCard({ data, isLoading }: StatsCardProps) {
  if (isLoading) return <StatsSkeleton />;

  const { title, value, change } = data;

  return (
    <Card className="overflow-hidden rounded-xl border bg-background">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<StatsSkeleton />}>
          <div className="text-2xl font-bold">{formatNumber(value)}</div>
          <p className="text-xs text-muted-foreground">
            {change > 0 ? '+' : ''}{change}% from last month
          </p>
        </Suspense>
      </CardContent>
    </Card>
  );
}
```

## Server Components
```typescript
// src/app/(dashboard)/page.tsx
import { Suspense } from 'react';
import { StatsCard } from '@/components/dashboard/stats-card';
import { fetchDashboardStats } from '@/lib/api';

async function DashboardStats() {
  const stats = await fetchDashboardStats();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatsCard key={stat.title} data={stat} />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <main className="container mx-auto p-4 md:p-6 lg:p-8">
      <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
      <Suspense fallback={<StatsCardSkeleton count={4} />}>
        <DashboardStats />
      </Suspense>
    </main>
  );
}
```

## Client Components
```typescript
// src/components/auth-wizard/auth-form.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authSchema } from '@/lib/validations/auth';
import type { AuthFormData } from '@/types';

export function AuthForm() {
  const searchParams = useSearchParams();
  const form = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: searchParams.get('email') ?? '',
      password: ''
    }
  });

  async function onSubmit(data: AuthFormData) {
    try {
      // Handle form submission
    } catch (error) {
      // Handle error
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <Input
        type="email"
        placeholder="Email"
        {...form.register('email')}
      />
      <Input
        type="password"
        placeholder="Password"
        {...form.register('password')}
      />
      <Button
        type="submit"
        className="w-full"
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? 'Loading...' : 'Sign In'}
      </Button>
    </form>
  );
}
```

## Data Fetching
```typescript
// src/lib/api.ts
import { cache } from 'react';
import { headers } from 'next/headers';

export const fetchDashboardStats = cache(async () => {
  const headersList = headers();
  const response = await fetch('/api/stats', {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': headersList.get('authorization') ?? ''
    },
    next: {
      revalidate: 60,
      tags: ['dashboard-stats']
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch stats');
  }

  return response.json();
});
```

## Best Practices

### TypeScript Usage
- Use interfaces for component props and data structures
- Avoid enums; use const maps for static values
- Leverage TypeScript's inference capabilities
- Use strict type checking

### Component Organization
- Keep components focused and single-responsibility
- Use Server Components by default
- Add 'use client' only when necessary
- Implement proper loading and error states

### Performance
- Minimize client-side JavaScript
- Use React Suspense for loading states
- Implement proper caching strategies
- Optimize images with next/image

### Styling
- Use Tailwind's utility classes
- Follow mobile-first responsive design
- Maintain consistent spacing and typography
- Use CSS variables for theming

### State Management
- Use URL state with 'nuqs' for shareable state
- Prefer server state over client state
- Implement proper form validation
- Handle loading and error states

### Accessibility
- Use semantic HTML elements
- Implement proper ARIA attributes
- Ensure keyboard navigation
- Maintain proper color contrast

## Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [Shadcn UI](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)