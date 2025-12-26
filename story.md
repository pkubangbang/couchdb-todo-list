# The todo-list app

I remember the time when I first adopted the sprint workflow: it felt so natural that I quickly got used to the methodology.

The core mechanism of the sprint workflow can be described as below:

1. A project is divided into consecutive sprints with each sprint laser-focused on specific tasks.
2. The sprint is composed of tasks that are chosen from the task pool, each with clear ETA (estimated time ahead).
3. During the sprint, the team will have quick stand meetings on daily basis.
4. At the end of the sprint, the team will review the achievements and prepare for the next sprint.
5. New tasks are always put into the task pool so the currect sprint can be protected from sudden changes.

Years have passed and I have grown from a novice into a team leader; however I always follow the sprint workflow.

To make my management more effective, I use a spreadsheet to reflect the workflow. Below is an excerpt, and you can get 80% of the whole idea by examining the table headers:

| task create time<br />(due time please<br />see sheet name) | module     | type of task    | detail explanation                                                         | priority<br />(0 = blocking issue,<br />1 = should do,<br />2 = planning,<br />3 = not in scope) | assignee | ETA(1=half day,<br />2=whole day) | progress (%) | notes                     |
| ----------------------------------------------------------- | ---------- | --------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------- | --------------------------------- | ------------ | ------------------------- |
| 20251205                                                    | networking | documentation   | write an onboarding tutorial for<br />the new-comers to join the dev team. | 1                                                                                                 | pb       | 1                                 | 100%         |                           |
| 20251204                                                    | database   | problem solving | create a demo project showcasing how<br />to connect to couchdb.           | 1                                                                                                 | pb       | 4                                 | 80%          | preparing testing harness |

This approach has worked quite well. Since I am learning couchdb now, I realize that this model is a perfect scenario to test out my understandings.

**So, let's first discuss the requirements and then try depict the data model**

## requirements

1. The todo-list should be a multi-user app. Depending on couchdb's nature, this app should work offline.
2. A logged in user should see all the projects that he/she participates.
3. A project should have name, identifier and description with it.
4. A project should have at least one user with admin role; he/she can add more participants.
5. A project once opened should show the latest sprint; other sprints could also be selected.
6. A sprint should have name, due date and description with it.
7. A sprint once opened should list out all the containing tasks; each task is editable.
8. A task should contain 9 fields:
   1. task create time: a date notation, or more specifically a date-time
   2. module: a string
   3. type of task: a selection out of drop down options
   4. detail explanation: a long text
   5. priority: 0/1/2/3
   6. assignee: a user
   7. ETA: a number
   8. progress: a percentage
   9. notes: arbitrary contents, may include images
9. Once a sprint is done, the admin could perform a "rotation" that:
   1. first copy all tasks from currect sprint, then
   2. remove all "100%" tasks and tasks that are "closed", then
   3. prompt for a new due date

## data model

1. We will use only one `db` to hold all the `doc`s for this app.
2. To represent project, a `doc` with `type=project` is used. It also contains fields like name, description and participants.
3. Project contains sprints. To represent the containing relationship, add a field `sprint_ids` into project-doc. (one-to-many mapping)
4. To represent sprint, a `doc` with `type=sprint` is used. It also contains fields like name, description and participants. (The participants of sprint default to those of the project; the admin will specify)
5. Sprint contains tasks. To represent the containing relationship, add a field `sprint_id` into task-doc. (many-to-one mapping)
6. To represent task, a `doc` with `type=task` is used. A special field `task_id` is used to trace the progress across rotations.
7. When rotating, a new sprint-doc is created and the related task will be copied and linked with the new sprint_id.

## conflict model

A particular interesting and important part when designing couchdb schema is to think about its conflict model, 
which boils down to two questions: 

1. **"Why do two (or more) documents of the same id exist?"**
2. **"How to resolve the conflict? Merge, Prompt, Pick one or Don't bother?"**
   - Merge: Show the result of merge by some business logic, together with a button for prompt.
   - Prompt: Display a conflicting state and let user resolve.
   - Pick one: Just pick one as winner without merge, together with a button for prompt.
   - Don't bother: Do not fetch conflicts. Rely on couchdb to choose the winner.

Let's examine each type of doc.

### The project doc
Project doc contains name, description, participants and sprint_ids.

Why do two documents of the same id exist? Because two writes to the same project doc happens separately.

This is a normal scenario. To resolve the conflict, we choose `Merge`:
- The project name, description is the winner's
- The participants should be deep-merged: each person will receive merged role.
- The sprint_ids should be merged, **otherwise there will be some sprint left behind.**
- The prompt button should show on the project page, rather than the task page.

### The sprint doc
Sprint doc contains just name and due_time.

Why do two documents of the same id exist? Because two writes to the same sprint doc happens separately.

This is abnormal, since changing the sprint name / due_time should only be meaningful when the user is online.

Or put it another way: to change the sprint, the user should send request to the remote server directly; 
otherwise the user can only create/delete the sprint without changing it.

In this pattern, to resolve the conflict, we choose *`Don't bother`.

### The task doc
Task doc contains 9 visible fields together with a task_id which tracks the evolution between sprints.

Why do two tasks with the same id (_id) exists? Because people will edit tasks.

This is the common case. To resolve the conflict, we choose `Prompt`:
- Show conflicting tasks in line-by-line order together with other normal tasks, with a merge button at the start.
- When clicking on the merge button, the user is expect to provide the merge result, thus resolving the conflicts.