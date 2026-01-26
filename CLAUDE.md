# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Deno monorepo implementing an **offline-first todo-list application** built on CouchDB. The project has three main goals:
- Learn Deno and workspace functionality
- Develop a todo-list app based on CouchDB
- Serve as a playground for building a UI library

## Development Commands

### Setup
```bash
# Install dependencies
deno install

# Run development server (from project root)
deno task --cwd apps/todo-list dev

# Build the application
deno task --cwd apps/todo-list build

# Preview build
deno task --cwd apps/todo-list preview

# Serve built application
deno task --cwd apps/todo-list serve
```

### Code Style
- Uses `deno fmt` for formatting with configured settings (2-space, single quotes, semicolons, 80 char width)
- ESLint configured via Deno for linting
- Run formatting with `deno fmt`

## Architecture Overview

### Workspace Structure
- **`/apps/todo-list/`**: Main React application
- **`/packages/utils/`**: Shared utilities (@scope/utils)
- **`/packages/fluent-ui/`**: Custom Fluent UI component patches

### Data Architecture
- **Offline-First Design**: Uses PouchDB for local storage with optional remote sync
- **CouchDB Document Model**: Three document types:
  - `project`: Contains project metadata and participant roles
  - `sprint`: Contains sprint information and due dates
  - `task`: Contains detailed task data with 9 fields
- **Conflict Resolution**: Sophisticated conflict handling for collaborative editing

### Security Model
Three permission levels enforced client-side:
- `full-control`: Admins (PO, SM) - can modify all documents including membership
- `read-write`: Functional users - can modify all documents except membership
- `read-only`: Stakeholders - can only read documents

**Important**: Client runs in admin mode locally but member mode remotely for offline functionality.

### State Management Architecture
- **DbProvider**: React Context managing database connection state
- **Custom Hooks**:
  - `useLiveQuery`: Reactive data queries
  - `useDbChangeListener`: Real-time updates
  - `usePersistentKv`: Local storage persistence
  - `useAutoTrigger`/`useManualTrigger`: Event handling

### UI Architecture
- **Framework**: React 17 with JSX
- **Routing**: Wouter for client-side routing
- **Styling**: CSS-in-JS with @emotion/css
- **Components**: Fluent UI Northstar with custom patches
- **Editable Cells**: Custom inline editing with conflict resolution

## Key Implementation Details

### Database Schema
Documents use a `type` field for categorization:
- **Project Documents**: `type: "project"` with `sprint_ids` array
- **Sprint Documents**: `type: "sprint"` with linked `project_id`
- **Task Documents**: `type: "task"` with `sprint_id` and `task_id` for cross-sprint tracking

### Conflict Resolution Strategy
- **Projects**: Automatic merging with user prompt option (deep merge participants and sprint_ids)
- **Sprints**: "Don't bother" - server-side only, no offline editing
- **Tasks**: Manual resolution with inline conflict display

### Development Patterns
- **Import Aliasing**: `@scope/utils` for local packages
- **Environment Variables**: Vite variables prefixed with `VITE_`
- **PouchDB Integration**: Legacy CJS modules loaded via script tag in index.html
- **Type Declarations**: Global PouchDB type in `vite-env.d.ts`

### Branch Strategy
Current development branch: `task-editable-cells` (focused on inline editing capabilities)
Recent commits show progression from basic setup to advanced features including conflict resolution.

## Important Documentation
- `story.md`: Comprehensive system design document with requirements and data model
- `security-model.md`: Detailed explanation of permission system and security considerations