/// <reference types="vite/client" />
/// <reference types="@types/pouchdb" />

// deno-lint-ignore no-var
declare var PouchDB: PouchDB.Static;

type Role = 
| 'admin' 
| 'dev'
| 'qa'
| 'stakeholder'
| 'po'

type DateTimeLike = string & {
    _comment: 'please parse using dayjs()'
}

interface Project {
    type: 'project',
    name: string,
    code: string,
    desc?: string,
    participants: Record<string, Role[]>,
    sprint_ids: string[]
}

interface Sprint {
    type: 'sprint',
    name: string,
    due_time: DateTimeLike
}

interface Task {
    type: 'task',
    task_id: string,
    sprint_id: string,
    create_time?: DateTimeLike,
    module?: string,
    type_of_task?: string,
    detail?: string,
    priority?: number,
    assignee: string[],
    eta?: number,
    progress?: number,
    note?: string
}