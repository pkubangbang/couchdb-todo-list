# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

This is a Deno monorepo implementing an **offline-first todo-list application**
built on CouchDB. The project has three main goals:

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

- Uses `deno fmt` for formatting with configured settings (2-space, single
  quotes, semicolons, 80 char width)
- ESLint configured via Deno for linting
- Run formatting with `deno fmt`

## Architecture Overview

### Workspace Structure

- **`/apps/todo-list/`**: Main React application
- **`/packages/utils/`**: Shared utilities (@scope/utils)
- **`/packages/fluent-ui/`**: Custom Fluent UI component patches

### Data Architecture

- **Offline-First Design**: Uses PouchDB for local storage with optional remote
  sync
- **CouchDB Document Model**: Three document types:
  - `project`: Contains project metadata and participant roles
  - `sprint`: Contains sprint information and due dates
  - `task`: Contains detailed task data with 9 fields
- **Conflict Resolution**: Sophisticated conflict handling for collaborative
  editing

### Security Model

Three permission levels enforced client-side:

- `full-control`: Admins (PO, SM) - can modify all documents including
  membership
- `read-write`: Functional users - can modify all documents except membership
- `read-only`: Stakeholders - can only read documents

**Important**: Client runs in admin mode locally but member mode remotely for
offline functionality.

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
- **Task Documents**: `type: "task"` with `sprint_id` and `task_id` for
  cross-sprint tracking

### Conflict Resolution Strategy

- **Projects**: Automatic merging with user prompt option (deep merge
  participants and sprint_ids)
- **Sprints**: "Don't bother" - server-side only, no offline editing
- **Tasks**: Manual resolution with inline conflict display

### Development Patterns

- **Import Aliasing**: `@scope/utils` for local packages
- **Environment Variables**: Vite variables prefixed with `VITE_`
- **PouchDB Integration**: Legacy CJS modules loaded via script tag in
  index.html
- **Type Declarations**: Global PouchDB type in `vite-env.d.ts`

### Branch Strategy

Current development branch: `task-editable-cells` (focused on inline editing
capabilities) Recent commits show progression from basic setup to advanced
features including conflict resolution.

## Important Documentation

- `story.md`: Comprehensive system design document with requirements and data
  model
- `security-model.md`: Detailed explanation of permission system and security
  considerations

## TaskRowDisplay Component Analysis

### Overview

`TaskRowDisplay` renders a single task row with inline editable fields. It
supports normal display mode and a "super row" mode for handling conflicted
documents.

### Component Structure

**Two Components:**

1. **`Row`** (internal): The core row rendering logic
2. **`TaskRowDisplay`** (exported): Handles the conditional rendering between
   normal and conflict modes

### Props

- `task: Doc<Task>` - The task document to display (may include conflicts array)
- `hover: Coordinate` - Current hover state (id, rev, field)
- `select: Coordinate` - Current selection state (id, rev, field)
- `onHoverChange: (coord: Coordinate) => void` - Callback when user hovers over
  a cell
- `onSelectChange: (coord: Coordinate) => void` - Callback when user selects a
  cell
- `onFieldUpdate: (taskId: string, field: keyof Task, value: string | undefined) => Promise<void>` -
  Callback to update a field value

### State Logic

```typescript
const isThisRowHovered = hover.id === task._id && hover.rev === task._rev;
const isThisRowSelected = select.id === task._id && select.rev === task._rev;
```

- Both `_id` AND `_rev` are checked for row-level state
- This prevents stale interactions after a document revision update
- The `task._id` identifies the document
- The `task._rev` identifies the specific revision

### Editable Fields (TextCell)

Four fields are editable via `TextCell`:

1. `create_time` (100px width)
2. `module` (100px width)
3. `type_of_task` (100px width)
4. `detail` (300px width)

Each `TextCell` receives:

- `hovered={isThisRowHovered && hover.field === 'fieldName'}` - Cell-level hover
  state
- `selected={isThisRowSelected && select.field === 'fieldName'}` - Cell-level
  selection state
- `onCommit` - Calls `onFieldUpdate(task._id, fieldName, value)`

### Non-Editable Fields

- `priority` - Input component (read-only in current implementation)
- `assignee` - Array of names rendered as Pills
- `eta` - Input component (read-only in current implementation)
- `progress` - Input component (read-only in current implementation)

### Super Row (Conflict Handling)

**Trigger Condition:**

```typescript
if (task.conflicts && task.conflicts.length) {
  // render super row
}
```

**Super Row Layout:**

```
┌─────────────────────────────────────────────────┐
│ [!] ┌──────────────────────────────┐  │
│        │ Winning Revision Row        │  │
│        └──────────────────────────────┘  │
│        ┌──────────────────────────────┐  │
│        │ Conflict Revision 1          │  │
│        └──────────────────────────────┘  │
│        ┌──────────────────────────────┐  │
│        │ Conflict Revision 2          │  │
│        └──────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Visual Indicators:**

- Red exclamation triangle icon (`ExclamationTriangleIcon`) in left margin
- Red outline (`outline: '2px solid red'`) around the conflict group

**Data Flow:**

1. `task.conflicts` is an array of `Doc<Task>` objects
2. Each conflict has a different `_rev` (revision ID)
3. All rows (winning + conflicts) share the same:
   - `hover` and `select` coordinates (global row state)
   - Event handlers (`onSelectChange`, `onHoverChange`, `onFieldUpdate`)

**Editing Behavior:**

- Each revision row can be edited independently
- When a field is updated on any revision, `onFieldUpdate` is called with
  `task._id`
- The parent component (`TaskPage`) resolves conflicts based on which revision
  was last edited
- Resolution typically means accepting one revision and discarding others

**Key Design Decisions:**

1. **Shared State**: All conflict rows share the same `hover`/`select` state,
   meaning only one cell can be selected across all versions
2. **Independent Edits**: Each revision can be modified, allowing users to see
   differences before resolving
3. **Revision-Based Identity**: Using both `_id` and `_rev` for state tracking
   prevents stale interactions after resolution

### Normal Row Rendering

**Padding:**

```typescript
<Flex style={{ paddingLeft: 36 }}>
```

Normal rows have 36px left padding to align with conflict rows (which need space
for the warning icon).

**Structure:**

```
┌──────────────────────────────────────┐
│ create | module | type | detail | ... │  (padded 36px left)
└──────────────────────────────────────┘
```

### Coordination with Parent (TaskPage)

The parent `TaskPage` maintains:

- Global `hover` state
- Global `select` state
- `handleFieldUpdate` callback that:
  1. Finds the task by `taskId` in `paddedTasks`
  2. Compares new value with original (skip if identical)
  3. Creates updated document with spread
  4. Calls `db.put()` (generates new `_rev`)
  5. The database change listener triggers a refresh via `taskListener`

This architecture ensures:

- Real-time UI updates via the changes feed
- Conflict generation is possible when multiple users edit simultaneously
- Resolution is manual but guided by visual comparison
