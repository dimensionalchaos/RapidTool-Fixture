# Contributing to RapidTool-Fixture

Thank you for contributing to RapidTool-Fixture! This guide will help you understand our workflow and best practices.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Creating Pull Requests](#creating-pull-requests)
- [Code Review Process](#code-review-process)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)

---

## 🚀 Getting Started

### 1. Initial Setup

```bash
# Clone the repository
git clone https://github.com/FracktalWorks/RapidTool-Fixture.git
cd RapidTool-Fixture

# Install dependencies
npm install
cd backend && npm install && cd ..

# Setup environment variables
cp .env.example .env
cp backend/.env.example backend/.env
# Edit .env files with actual credentials (get from team lead)

# Generate Prisma Client
cd backend
npx prisma generate
npx prisma migrate deploy
cd ..

# Start development servers
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
npm run dev
```

### 2. Get Access to Secrets

Contact the team lead to get access to:
- Database credentials (Supabase)
- JWT secrets
- Environment variables document (Google Drive)

---

## 🔄 Development Workflow

### Branch Strategy

We use a feature branch workflow:

```
main (protected)
  ↓
  ├── feature/your-feature-name
  ├── fix/bug-description
  ├── docs/documentation-update
  └── refactor/component-name
```

### Creating a New Branch

```bash
# Always start from the latest main
git checkout main
git pull origin main

# Create your feature branch
git checkout -b feature/add-export-button

# Branch naming convention:
# feature/  - New features
# fix/      - Bug fixes
# docs/     - Documentation updates
# refactor/ - Code improvements
# chore/    - Maintenance tasks
```

### Making Changes

```bash
# Make your changes
# Edit files, add features, fix bugs

# Check what changed
git status
git diff

# Test your changes locally
npm run dev  # Frontend
cd backend && npm run dev  # Backend

# Run tests (if available)
npm test
```

### Committing Changes

```bash
# Stage your changes
git add src/components/ExportButton.tsx
git add src/utils/exportHelper.ts

# Or stage all changes
git add .

# Commit with descriptive message
git commit -m "feat: Add STL export functionality

- Implement export button in toolbar
- Add export helper functions
- Support multiple file formats (STL, OBJ, GLTF)
- Add loading state during export
- Add error handling for failed exports"
```

---

## 📝 Commit Guidelines

### Commit Message Format

```
<type>: <short description>

<detailed description>
- What changed
- Why it changed
- Any breaking changes
```

### Commit Types

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring (no functional changes)
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks (dependencies, config)
- `perf:` - Performance improvements
- `style:` - Code style changes (formatting, semicolons)

### Examples

**Good Commits:**
```bash
git commit -m "feat: Add user authentication system

- Implement JWT-based authentication
- Add login and registration endpoints
- Create protected route middleware
- Add password hashing with bcrypt"

git commit -m "fix: Resolve database connection timeout

- Add connection retry logic
- Increase timeout to 30 seconds
- Add proper error logging
- Fixes #123"

git commit -m "docs: Update setup guide with Prisma instructions

- Add Prisma installation steps
- Document database migration process
- Include troubleshooting section"
```

**Bad Commits:**
```bash
git commit -m "updates"
git commit -m "fixed stuff"
git commit -m "wip"
```

---

## 🔀 Creating Pull Requests

### 1. Push Your Branch

```bash
# Push your branch to GitHub
git push origin feature/add-export-button

# If it's your first push on this branch
git push -u origin feature/add-export-button
```

### 2. Create PR on GitHub

**Via GitHub Web Interface:**

1. Go to https://github.com/FracktalWorks/RapidTool-Fixture
2. Click "Compare & pull request" button (appears after push)
3. Fill in the PR template:
   - **Title:** Clear, descriptive title
   - **Description:** What, why, how
   - **Type of change:** Check appropriate boxes
   - **Testing steps:** How to test your changes
   - **Screenshots:** If UI changes
4. Assign reviewers
5. Add labels (feature, bug, documentation, etc.)
6. Click "Create pull request"

**Via GitHub CLI:**

```bash
# Install GitHub CLI (first time only)
# Windows: winget install GitHub.cli
# Mac: brew install gh
# Linux: See https://cli.github.com/

# Login
gh auth login

# Create PR
gh pr create \
  --title "feat: Add STL export functionality" \
  --body "Implements export functionality for 3D models. See PR description for details." \
  --base main \
  --assignee @me \
  --label feature
```

### 3. PR Checklist

Before creating a PR, ensure:

- [ ] Code follows project style guidelines
- [ ] All tests pass locally
- [ ] No console errors or warnings
- [ ] Documentation updated (if needed)
- [ ] Environment variables documented (if added)
- [ ] No sensitive data (passwords, API keys) in code
- [ ] Commit messages are clear and descriptive
- [ ] Branch is up to date with main

---

## 👀 Code Review Process

### For PR Authors

1. **Create PR** with clear description
2. **Assign reviewers** (at least 1-2 team members)
3. **Respond to feedback** promptly
4. **Make requested changes** in new commits
5. **Request re-review** after addressing feedback
6. **Squash commits** if requested before merge

### For Reviewers

1. **Review within 24-48 hours**
2. **Test the changes** locally if possible
3. **Provide constructive feedback**
4. **Approve or request changes**
5. **Check for:**
   - Code quality and readability
   - Potential bugs or edge cases
   - Performance implications
   - Security concerns
   - Test coverage
   - Documentation completeness

### Review Comments

**Good Review Comments:**
```
✅ "Great implementation! Consider extracting this logic into a separate utility function for reusability."

✅ "This could cause a memory leak. Try using useEffect cleanup function."

✅ "Nice work! Just one suggestion: add error handling for the API call."
```

**Bad Review Comments:**
```
❌ "This is wrong."
❌ "Change this."
❌ "I don't like this."
```

---

## 💻 Coding Standards

### TypeScript

- Use TypeScript for all new code
- Define proper types and interfaces
- Avoid `any` type unless absolutely necessary
- Use meaningful variable names

```typescript
// Good
interface User {
  id: string;
  email: string;
  name: string;
}

async function getUserById(userId: string): Promise<User> {
  // ...
}

// Bad
async function getUser(id: any): Promise<any> {
  // ...
}
```

### React Components

- Use functional components with hooks
- Keep components small and focused
- Extract reusable logic into custom hooks
- Use proper prop types

```typescript
// Good
interface ExportButtonProps {
  onExport: () => Promise<void>;
  disabled?: boolean;
}

export function ExportButton({ onExport, disabled = false }: ExportButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  // ...
}

// Bad
export function ExportButton(props: any) {
  // ...
}
```

### File Organization

```
src/
├── components/       # Reusable UI components
├── pages/           # Page components
├── hooks/           # Custom React hooks
├── utils/           # Utility functions
├── stores/          # State management (Zustand)
├── types/           # TypeScript types
└── services/        # API services

backend/
├── src/
│   ├── controllers/ # Request handlers
│   ├── services/    # Business logic
│   ├── routes/      # API routes
│   ├── middleware/  # Express middleware
│   ├── validators/  # Input validation
│   └── config/      # Configuration
└── prisma/          # Database schema
```

### Code Style

- Use Prettier for formatting (automatic)
- Use ESLint for linting
- Follow existing code patterns
- Add comments for complex logic
- Keep functions small and focused

---

## 🔧 Common Tasks

### Updating Dependencies

```bash
# Check for outdated packages
npm outdated

# Update specific package
npm update package-name

# Update all packages (careful!)
npm update
```

### Running Tests

```bash
# Frontend tests
npm test

# Backend tests
cd backend && npm test

# Run specific test
npm test -- ExportButton.test.tsx
```

### Database Changes

```bash
# Edit prisma/schema.prisma
# Then create migration
cd backend
npx prisma migrate dev --name add_new_field

# Apply migrations
npx prisma migrate deploy

# Regenerate Prisma Client
npx prisma generate
```

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Windows
netstat -ano | findstr :3000
taskkill /F /PID [PID_NUMBER]

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### Prisma Client Not Generated

```bash
cd backend
npx prisma generate
```

### Database Connection Issues

1. Check `.env` file has correct credentials
2. Verify Supabase database is active (not paused)
3. Ensure `?pgbouncer=true` is in DATABASE_URL
4. Test connection: `npx prisma db pull`

### Merge Conflicts

```bash
# Update your branch with latest main
git checkout main
git pull origin main
git checkout your-feature-branch
git merge main

# Resolve conflicts in your editor
# Then commit the merge
git add .
git commit -m "merge: Resolve conflicts with main"
git push origin your-feature-branch
```

---

## 📚 Resources

- [Project README](README.md)
- [Setup Guide](docs/SETUP_GUIDE.md)
- [Architecture Documentation](docs/ARCHITECTURE.md)
- [API Documentation](docs/AUTH_SYSTEM.md)
- [Prisma Documentation](https://www.prisma.io/docs)
- [React Documentation](https://react.dev)

---

## 🤝 Getting Help

- Ask questions in team chat
- Review existing PRs for examples
- Check documentation first
- Contact team lead for access issues
- Create GitHub issues for bugs

---

## ✅ PR Merge Checklist

Before merging:

- [ ] All CI/CD checks pass
- [ ] At least 1 approval from reviewer
- [ ] All review comments addressed
- [ ] No merge conflicts
- [ ] Branch is up to date with main
- [ ] Tests pass
- [ ] Documentation updated

---

**Thank you for contributing!** 🎉
