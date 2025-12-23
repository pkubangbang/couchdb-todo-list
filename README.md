# Deno monorepo with vite

## Introduction

This monorepo is created with 3 goals:
1. To learn deno & workspace.
2. To develop a todo-list app based on couchdb.
3. To serve as a playground to build UI library.

## The todo-list app design doc

You can read the background story as well as the system design in [this design doc](./story.md)

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

Pay attention to the `deno task dev` : when specifying subproject, add `--cwd xxx` AFTER `task` but before `dev`.

```bash
deno install
deno task --cwd apps/todo-list dev
```


## Known Issues

### 1. installing pouchdb
`pouchdb` is the couchdb js-client. It is a legacy project that uses common-js as the module system.

To use pouchdb inside deno + vite + react, here is my way:
1. add a script tag inside `index.html` at the end of the body.
2. install several `@types/pouchdb-xxx` packages via `deno install npm:xxx`
3. add a directive on top of `vite-env.d.ts`, then add a type declaraion inside the same file that says "here is a global `PouchDB` available"
   ```ts
   // apps/todo-list/src/vite-env.d.ts
   // ...

   /// <reference types="@types/pouchdb" />
   declare var PouchDB: PouchDB.Static;
   ```