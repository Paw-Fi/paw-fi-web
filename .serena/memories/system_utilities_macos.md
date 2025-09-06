# System Utilities for macOS (Darwin)

## File System Operations

### Navigation & Listing
```bash
ls -la                  # List all files with details
ls -lah                 # List with human-readable sizes
cd <directory>          # Change directory
pwd                     # Print working directory
find . -name "*.tsx"    # Find files by pattern
find . -type d -name "*" # Find directories
```

### File Operations
```bash
cp <source> <dest>      # Copy files
mv <source> <dest>      # Move/rename files
rm <file>               # Remove file
rm -rf <directory>      # Remove directory recursively
mkdir <directory>       # Create directory
mkdir -p <path>         # Create directory path
```

## Search & Text Operations

### Pattern Searching
```bash
grep -r "pattern" src/           # Recursive search in directory
grep -n "pattern" file.txt       # Search with line numbers
grep -i "pattern" file.txt       # Case-insensitive search
grep -E "regex" file.txt         # Extended regex search
```

### File Content
```bash
cat <file>              # Display file content
head -20 <file>         # First 20 lines
tail -20 <file>         # Last 20 lines
tail -f <file>          # Follow file changes
less <file>             # Page through file
```

## Process & System Management

### Process Operations
```bash
ps aux                  # List all processes
ps aux | grep node      # Find Node.js processes
kill <pid>              # Kill process by ID
killall node            # Kill all Node processes
```

### System Information
```bash
top                     # Display running processes
df -h                   # Disk space usage
du -sh <directory>      # Directory size
free                    # Memory usage (if available)
uname -a                # System information
```

## Network Operations

### Network Testing
```bash
ping <host>             # Test network connectivity
curl <url>              # Make HTTP request
curl -I <url>           # Get headers only
netstat -an             # Show network connections
```

### Port Management
```bash
lsof -i :3000           # Find process using port 3000
lsof -ti:3000           # Get PID of process on port 3000
kill $(lsof -ti:3000)   # Kill process on port 3000
```

## Development-Specific Commands

### Git Operations
```bash
git status              # Repository status
git log --oneline -10   # Recent commits
git branch -a           # All branches
git diff                # Show changes
git stash               # Stash changes
git stash pop           # Apply stashed changes
```

### Node.js & NPM
```bash
which node              # Node.js location
node --version          # Node version
npm --version           # NPM version
npm list                # Installed packages
npm outdated            # Check for updates
```

### File Permissions (if needed)
```bash
chmod +x <file>         # Make executable
chmod 755 <file>        # Set permissions
chown user:group <file> # Change ownership
```

## macOS-Specific Commands

### System Utilities
```bash
open <file>             # Open file with default app
open .                  # Open current directory in Finder
pbcopy < <file>         # Copy file content to clipboard
pbpaste                 # Paste from clipboard
say "hello"             # Text-to-speech
```

### Development Tools
```bash
code .                  # Open in VS Code (if installed)
xcode-select --install  # Install Xcode command line tools
brew install <package>  # Homebrew package manager (if installed)
```

## Common Workflow Commands

### Development Environment
```bash
# Start development environment
npm run dev &           # Start in background
open http://localhost:3000  # Open in browser

# Check what's running
lsof -i :3000           # Check port usage
ps aux | grep npm       # Find npm processes
```

### File Search Patterns
```bash
# Find React components
find . -name "*.tsx" -type f

# Find TypeScript files
find . -name "*.ts" -o -name "*.tsx" -type f

# Find configuration files
find . -name "*.config.*" -type f

# Search in source code
grep -r "useEffect" src/ --include="*.tsx"
```

## Notes for Darwin System
- Some Linux commands may not be available or behave differently
- Use `man <command>` to get help for any command
- Tab completion is available for most commands
- Use `history` to see recent commands