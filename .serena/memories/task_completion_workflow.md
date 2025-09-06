# Task Completion Workflow

## Standard Development Workflow

### Before Starting Any Task
1. **Pull Latest Changes**: `git pull` to ensure working on latest code
2. **Check Dependencies**: `npm install` if package.json has changed
3. **Start Development Server**: `npm run dev` for real-time feedback

### During Development
1. **Follow Coding Conventions**: Use kebab-case, TypeScript strict mode, proper imports
2. **Use Path Aliases**: Import using configured aliases (`@/`, `@components/`, etc.)
3. **Test Locally**: Verify functionality works in development server
4. **Check Browser Console**: Ensure no errors or warnings

### Code Quality Checks (Required)
Since there are no automated test/lint commands in package.json:

1. **TypeScript Check**: `npm run typecheck` - Must pass without errors
2. **ESLint**: Run via IDE or manually - Address all errors and warnings
3. **Prettier**: Format code via IDE or manually - Ensure consistent formatting
4. **Browser Testing**: Test functionality in multiple browsers
5. **Mobile Testing**: Check responsive design on mobile viewports

### Before Committing Code
1. **Type Check**: `npm run typecheck` must pass
2. **Build Test**: `npm run build` must complete without errors
3. **Visual Review**: Check that UI changes look correct
4. **Function Testing**: Test all modified functionality
5. **Console Clean**: No errors/warnings in browser console

### Git Workflow
```bash
git status              # Check what files are changed
git add .               # Stage changes
git commit -m "descriptive message"  # Commit with clear message
git push                # Push to remote repository
```

### Production Deployment Checks
1. **Build Success**: `npm run build` completes without errors
2. **Production Test**: `npm start` and test critical paths
3. **Sitemap Update**: `npm run build:sitemap` if adding new pages
4. **Function Deployment**: Deploy Edge Functions if backend changes made

## Specific Task Types

### UI Component Development
1. Create component in appropriate directory (`src/components/`)
2. Use TypeScript interfaces for props
3. Implement using Tailwind CSS and established patterns
4. Test with different props and states
5. Export from index file if part of component library

### API Integration
1. Define types in `src/types/`
2. Create hooks in `src/hooks/` for data fetching
3. Use TanStack Query for caching and state management
4. Handle loading and error states
5. Test with different network conditions

### Database Changes
1. Create migration files in `supabase/migrations/`
2. Apply locally: `supabase db push`
3. Test with sample data
4. Update TypeScript types if schema changes
5. Deploy: `supabase db push` to production

### Edge Function Development
1. Create function in `supabase/functions/`
2. Use Deno and TypeScript
3. Test locally: `supabase functions serve`
4. Deploy: `supabase functions deploy <function-name>`
5. Update API calls in frontend if needed

## Quality Gates

### Must-Pass Criteria
- ✅ TypeScript compilation (`npm run typecheck`)
- ✅ Production build (`npm run build`)
- ✅ No browser console errors
- ✅ Responsive design works on mobile
- ✅ Core functionality tested manually
- ✅ Code follows established patterns
- ✅ All imports use proper path aliases
- ✅ ESLint rules satisfied

### Recommended Checks
- 🔍 Cross-browser testing
- 🔍 Accessibility testing
- 🔍 Performance impact assessment
- 🔍 SEO implications considered
- 🔍 Error boundary handling tested