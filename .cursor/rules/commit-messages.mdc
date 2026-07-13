---
description: Standardized commit message format for consistent version control history
globs: **/*.{js,jsx,ts,tsx,md,mdx}
---

## Commit Messages

// Description: Standardized commit message format for consistent version control history
// Recommended Globs: **/*.{js,jsx,ts,tsx,md,mdx}

## Format
Always prefix commit messages in the following format:

```
# Separate commands
git add <changed_files>
git commit -m "Type(scope): description"

# Combined command (shorthand)
git add . && git commit -m "Type(scope): description"
```

## Types
- `Feat`: New feature or enhancement
- `Fix`: Bug fix
- `Docs`: Documentation changes
- `Style`: Code style/formatting changes
- `Refactor`: Code refactoring
- `Test`: Adding or updating tests
- `Chore`: Maintenance tasks, dependencies, etc.

## Examples
```bash
# Single file
git add src/components/Button.tsx
git commit -m "Feat(component): add new Button component"

# Multiple files
git add src/api/auth.ts src/hooks/useAuth.ts
git commit -m "Fix(auth): resolve login session issues"

# All changes
git add .
git commit -m "Style(css): update global theme colors"
```

## Guidelines
- Use imperative mood in descriptions ("add", not "added")
- Keep descriptions concise but meaningful
- Always include both type and scope
- Use lowercase for descriptions
- No period at the end of the message

## Common Patterns
- Documentation: `Docs(readme): update installation steps`
- Dependencies: `Chore(deps): update package versions`
- Bug fixes: `Fix(api): resolve undefined user error`
- New features: `Feat(auth): add Google OAuth login`

Don't forget to commit! Here's a template:
```bash
git add .
git commit -m "Type(scope): description"
```