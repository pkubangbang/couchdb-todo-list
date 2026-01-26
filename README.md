# Deno monorepo with vite

## Introduction

This monorepo is created with 3 goals:

1. To learn deno & workspace.
2. To develop a todo-list app based on couchdb.
3. To serve as a playground to build UI library.

## The todo-list app design doc

You can read the background story as well as the system design in
[this design doc](./story.md)

## Project setup

### 1. create the project folder

```bash
mkdir couchdb-todo-list && cd couchdb-todo-list
```

### 2. add the `deno.json` to enable the workspace layout

```bash
cat << EOF > deno.json
{
    "workspace": ["apps/*"]
}

EOF
```

### 3. init the 1st vite project using `create-vite-extra`

```bash
# from the project root
deno init --npm vite-extra apps/todo-list --template deno-react-ts
```

### 4. install deps and run

Pay attention to the `deno task dev` : when specifying subproject, add
`--cwd xxx` AFTER `task` but before `dev`.

```bash
deno install
deno task --cwd apps/todo-list dev
```

## Development Tools

The `dbClient` exposes global utilities on the `window` object for development
and testing. These are only available in development mode
(`import.meta.env.DEV === true`).

### `window.$db`

Access to the `DbClient` instance for direct database operations.

```javascript
// Get the current database instance
const db = window.$db.getDb();

// Query all documents
db.allDocs({ include_docs: true }).then((result) => {
  console.log(result.rows);
});
```

### `window.$restoreDefault()`

Destroys the default local database and re-creates a new one. Useful for
resetting the database during development.

```javascript
// Reset the local database
window.$restoreDefault();
```

### `window.$createConflict(id, part1, part2)`

Reliably creates conflict documents for testing the conflict resolution process.

The mechanism:

1. Creates a temporary database
2. Syncs once with the target database
3. Makes different updates on both sides
4. Syncs again to generate a conflict

```javascript
// Create a conflict for a task document
window.$createConflict('task_123', { detail: 'Updated by user A' }, {
  detail: 'Updated by user B'
});
```

### `window.$removeConflict(id)`

Forcibly removes all losing conflict revisions for a specified document.

```javascript
// Remove all conflicts for a document
window.$removeConflict('task_123');
```

## Known Issues

### 1. installing pouchdb

`pouchdb` is the couchdb js-client. It is a legacy project that uses common-js
as the module system.

To use pouchdb inside deno + vite + react, here is my way:

1. add a script tag inside `index.html` at the end of the body.
2. install several `@types/pouchdb-xxx` packages via `deno install npm:xxx`
3. add a directive on top of `vite-env.d.ts`, then add a type declaraion inside
   the same file that says "here is a global `PouchDB` available"
   ```ts
   // apps/todo-list/src/vite-env.d.ts
   // ...

   /// <reference types="@types/pouchdb" />
   declare var PouchDB: PouchDB.Static;
   ```
