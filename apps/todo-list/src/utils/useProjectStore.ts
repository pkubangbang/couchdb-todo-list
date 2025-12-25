import { createStoreHook } from "@scope/utils";
import { db } from "./dbClient.ts";

export type ProjectStoreStatus = 'not-started' | 'paused' | 'active' | 'denied' | 'complete' | 'error'

interface ProjectStore {
    status: ProjectStoreStatus,
    projects: Project[],
    sprints: Record<string, Sprint & PouchDB.Core.IdMeta>,
    tasks: Task[]
}

export const useProjectStore = createStoreHook<ProjectStore>(() => {
    return {
        status: 'not-started',
        projects: [],
        sprints: {},
        tasks: []
    }
}, "projects")

export const setProjects = useProjectStore.createDispatcher((draft, projects: Project[]) => {
    draft.projects = projects;
})

export const cacheSprint = useProjectStore.createDispatcher((draft, sprint: Sprint & PouchDB.Core.IdMeta) => {
    const { _id } = sprint;
    draft.sprints[_id] = sprint;
})

export const setTasks = useProjectStore.createDispatcher((draft, tasks: Task[]) => {
    draft.tasks = tasks;
})

const updateStatus = useProjectStore.createDispatcher((draft, newStatus: ProjectStoreStatus) => {
    draft.status = newStatus;
})

const syncDb = async () => {
    const all = await db.allDocs<Project | Sprint | Task>({
        include_docs: true
    });

    // console.log(all);
    
    const projects: Project[] = [];
    const sprints: (Sprint & PouchDB.Core.IdMeta)[] = [];
    const tasks: Task[] = [];

    all.rows.forEach(row => {
        const { doc } = row;
        if (!doc) {
            return;
        }

        const { type } = doc;
        switch (type) {
            case 'project':
                projects.push(doc);
                break;
            case 'sprint':
                sprints.push(doc);
                break;
            case 'task':
                tasks.push(doc);
                break;
            default:
                console.warn(`for dev: unknown doc type ${type}`);
                break;
        }
    })

    setProjects(projects);
    sprints.forEach(sprint => {
        cacheSprint(sprint);
    });

    setTasks(tasks);
}

console.info('starting db sync');
const userpass = import.meta.env.VITE_APP_COUCHDB_USERPASS || 'anonymous:nopassword';
db.sync(`http://${userpass}@10.0.1.1:5984/ird-todo-list`, {
    live: true,
    retry: true
}).on('change', async () => {
    // handle change
    updateStatus('active');

    // TODO: better way of updating the store
    syncDb();
}).on('paused', () => {
    updateStatus('paused');
}).on('active', () => {
    updateStatus('active');
}).on('denied', () => {
    updateStatus('denied');
}).on('complete', () => {
    updateStatus('complete');
}).on('error', () => {
    updateStatus('error');
});

syncDb();

globalThis.addEventListener('unload', () => {
    if (db) {
        db.destroy();
    }
})