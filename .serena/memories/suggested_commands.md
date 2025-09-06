# Suggested Commands for Moneko Development

## Development Commands

### Primary Development
```bash
npm run dev              # Start development server (localhost:3000)
npm run build           # Build for production
npm start               # Start production server
```

### Build & Deployment
```bash
npm run build:sitemap   # Generate sitemap for SEO
npm run deploy:functions:dev   # Deploy functions to development
npm run deploy:functions:prod  # Deploy functions to production
```

### Code Quality (Manual)
```bash
npm run typecheck       # TypeScript type checking
```

**Note**: No dedicated test, lint, or format commands are configured in package.json. The project relies on:
- ESLint configuration in `eslint.config.js`
- Prettier configuration in `.prettierrc`
- Manual execution of these tools via IDE integration

## System Utilities (macOS)

### File Operations
```bash
ls -la                  # List files with details
find . -name "*.tsx"    # Find TypeScript React files
grep -r "pattern" src/  # Search for patterns in source
```

### Git Operations
```bash
git status              # Check repository status
git add .               # Stage all changes
git commit -m "message" # Commit with message
git push                # Push to remote
git pull                # Pull from remote
```

### Package Management
```bash
npm install             # Install dependencies
npm install <package>   # Install specific package
npm uninstall <package> # Remove package
npm list                # List installed packages
```

## Development Workflow Commands

### Starting Development
1. `npm install` - Install dependencies
2. `npm run dev` - Start development server
3. Open `http://localhost:3000` in browser

### Code Quality Checks
1. `npm run typecheck` - Check TypeScript types
2. Run ESLint via IDE or manual command
3. Run Prettier via IDE or manual command

### Building for Production
1. `npm run build` - Create production build
2. `npm run build:sitemap` - Generate SEO sitemap
3. `npm start` - Test production build locally

## Backend Development (Supabase)

### Local Development
```bash
supabase start          # Start local Supabase instance
supabase functions serve # Start local Edge Functions
supabase db push        # Apply database migrations
```

### Deployment
```bash
supabase functions deploy <function-name>  # Deploy specific function
supabase db push        # Deploy database changes
```

## Recommended IDE Commands
- **TypeScript**: Use IDE's built-in TypeScript support
- **ESLint**: Enable ESLint extension for real-time linting
- **Prettier**: Enable format on save with Prettier extension
- **Path Intellisense**: Use configured path aliases for imports

## Debugging & Monitoring
- **React DevTools**: For component inspection
- **Redux DevTools**: For state management debugging
- **TanStack Query DevTools**: Enabled in development for API state
- **TanStack Router DevTools**: For routing debugging
- **Browser DevTools**: Network tab for API calls, Console for errors