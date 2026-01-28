import { css } from '@emotion/css';
import {
  Box,
  Button,
  ButtonProps,
  ChevronStartIcon,
  Flex
} from '@fluentui/react-northstar';
import { lastIndexOf, useAutoTrigger, usePersistentGlobalState } from '@scope/utils';
import {
  FC,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { useLocation } from 'wouter';
import { v4 as uuidv4 } from 'uuid';
import {
  fetchConflictingProjectsAndShowMergedResult,
  fetchConflictingTasksAndShowMergedResult,
  makeDict
} from '../utils/dataMerger.ts';
import { dbContext } from './DbProvider.tsx';
import { TaskRowDisplay } from './TaskRowDisplay.tsx';
import { Coordinate } from './editableCell/common.ts';
import { useThrottle } from '@react-hook/throttle';
import { produce } from 'immer';

export interface TaskPageProps {
  params: {
    project: string;
  };
}

type SortedTask = Doc<Task> & { order: number };

const taskPageStyle = css`
  position: relative;
  height: 100vh;
  overflow-y: hidden;
  padding-bottom: 45px;
  box-sizing: border-box;

  .task-body {
    height: 400px;
    padding: 3px 0;
    flex: auto;
    overflow: auto;
  }

  .status-line {
    position: absolute;
    bottom: 0;
  }
`;

export const TaskPage: FC<TaskPageProps> = ({ params }) => {
  const code = params.project;
  const [location, navigate] = useLocation();
  const db = useContext(dbContext);

  const [projectListener, updateProjectListener] = useThrottle(0, 5);
  const [sprintListener, updateSprintListener] = useThrottle(0, 5);
  const [taskListener, updateTaskListener] = useThrottle(0, 5);

  useEffect(() => {
    const handle = db.changes({
      live: true,
      since: 'now',
      include_docs: true
    });

    handle.on('change', (change) => {
      if ('doc' in change && change.doc) {
        // when include_docs, doc will be inside change.doc
        const doc = change.doc;
        if (('type' in doc) && doc.type === 'project') {
          updateProjectListener(projectListener + 1);
        } else if (('type' in doc) && doc.type === 'sprint') {
          updateSprintListener(sprintListener + 1);
        } else if (('type' in doc) && doc.type === 'task') {
          updateTaskListener(taskListener + 1);
        }
      }
    });

    return () => {
      handle.cancel();
    };
  }, [db]);

  const [projectStatus, selectedProject] = useAutoTrigger<Doc<Project>>(() => {
    return (db as PouchDB.Database<Doc<Project>>).find({
      selector: { type: 'project', code: code }
    }).then((result) => {
      const found = result.docs.find((proj) => proj.code === code);
      if (!found) {
        throw new Error(`project ${code} not found`);
      }

      return fetchConflictingProjectsAndShowMergedResult(db, [found]);
    }).then((projects) => projects[0]);
  }, [db, code, projectListener]);

  const [sprintStatus, sprints] = useAutoTrigger<Doc<Sprint>[]>(() => {
    const sprintIds = selectedProject?.sprint_ids ?? [];
    if (!sprintIds.length) { return Promise.resolve([]); }

    return (db as PouchDB.Database<Doc<Sprint>>).allDocs({
      keys: sprintIds,
      include_docs: true
    }).then((result) => {
      const s: Doc<Sprint>[] = [];
      let hasError = false;
      for (const item of result.rows) {
        if ('doc' in item && item.doc) {
          s.push(item.doc);
        } else if ('error' in item && item.error === 'not_found') {
          // no-op
        } else {
          hasError = true;
        }
      }

      if (hasError) {
        console.error(`error when fetching sprints from project`);
      }

      return s;
    });
  }, [db, selectedProject, sprintListener]);

  const goHome: ButtonProps['onClick'] = () => {
    navigate('~/projects');
  };

  // show hover indicator
  const [hover, setHover] = useState<Coordinate>({
    id: '',
    rev: '',
    field: ''
  });

  // show select indicator
  const [select, setSelect] = useState<Coordinate>({
    id: '',
    rev: '',
    field: ''
  });

  const handleFieldUpdate = useCallback(
    async (task: Doc<Task>, field: keyof Task, value: string | undefined) => {
      // Skip update if value is identical
      if (task[field] === value) {
        return;
      }

      // Create updated task with the new field value
      const updatedTask: Doc<Task> = {
        ...task,
        [field]: value
        // _id and _rev are preserved from the spread
      };

      // Save to database (this generates a new revision)
      await db.put(updatedTask);
    },
    [db]
  );

  const [selectedSprintId, setSelectedSprintId] = useState('');

  // FIXME: refactor out of this component; otherwise the default sprint id will pollute the db.
  const [layout, setLayout] = usePersistentGlobalState<TaskLayout[]>(selectedSprintId, {
    version: 0,
    migrate: () => Promise.resolve(),
    default: () => []
  });

  const [taskStatus, tasks] = useAutoTrigger(() => {
    if (!selectedSprintId) {
      return Promise.reject('no selected sprint');
    }

    return (db as PouchDB.Database<Task>).find({
      selector: {
        type: 'task',
        sprint_id: selectedSprintId
      }
    }).then((result) => {
      const filtered = result.docs as Doc<Task>[];
      return fetchConflictingTasksAndShowMergedResult(db, filtered);
    });
  }, [db, selectedSprintId, taskListener]);

  useEffect(() => {
    // reconciliate the layout if mismatch
    if (!Array.isArray(tasks) || !tasks.length) { return }
    const knownIdCache = makeDict(layout.filter(item => item.type === 'task'), t => t.id);
    const needReconciliation = tasks.some(t => !knownIdCache[t._id]);
    if (!needReconciliation) { return }

    const naturalLayout = (tasks ?? []).sort((t1, t2) => {
      // first by priority, then by module, then by type_of_task, then by create_time
      if (t1.priority !== t2.priority) {
        return (t1.priority ?? 99) - (t2.priority ?? 99);
      } else if (t1.module !== t2.module) {
        return !t1.module
          ? 1
          : !t2.module
            ? -1
            : t1.module.localeCompare(t2.module);
      } else if (t1.type_of_task !== t2.type_of_task) {
        return !t1.type_of_task
          ? 1
          : !t2.type_of_task
            ? -1
            : t1.type_of_task.localeCompare(t2.type_of_task);
      } else if (t1.create_time !== t2.create_time) {
        return !t1.create_time
          ? 1
          : !t2.create_time
            ? -1
            : t1.create_time.localeCompare(t2.create_time);
      } else {
        return 0;
      }
      // Note: 0 = normal, -1 = hidden, 1 = virtual
    }).map((t) => ({
      type: 'task' as const,
      id: t._id,
      hidden: false
    }));

    // add unknown task to the bottom, producing a new copy.
    const newLayout = produce(layout, (draft) => {
      let tailIndex = lastIndexOf(layout, item => item.type === 'task');
      for (const suggestion of naturalLayout) {
        if (!knownIdCache[suggestion.id]) {
          draft.splice(tailIndex, 0, suggestion);
          tailIndex++;
        }
      }
    })

    setLayout(newLayout);
  }, [tasks, layout]);

  useEffect(() => {
    // Specify the default open sprint (when project data is ready)
    const sprintIds = selectedProject?.sprint_ids;
    if (
      Array.isArray(sprintIds) && sprintIds.length &&
      !sprintIds.includes(selectedSprintId)
    ) {
      setSelectedSprintId(sprintIds[sprintIds.length - 1]);
    }
  }, [selectedProject, selectedSprintId]);

  const paddedTasks = useMemo(() => {
    if (!Array.isArray(tasks)) {
      return [];
    }

    const taskDict = makeDict(tasks, t => t._id);
    return layout.map(row => {
      if (row.type === 'task') {
        if (taskDict[row.id]) {
          return taskDict[row.id]!;
        } else {
          return null;
        }
      } else if (row.type === 'empty') {
        const taskId = uuidv4();
        return {
          _id: taskId,
          _rev: '',
          _conflicts: [],
          type: 'task' as const,
          task_id: taskId,
          sprint_id: selectedSprintId,
          assignee: []
        }
      } else {
        throw new Error('for dev: unsupported layout type ' + (row as any).type);
      }
    }).filter(row => !!row);

  }, [layout, tasks, selectedSprintId]);

  return selectedProject
    ? (
      <Flex className={taskPageStyle} column>
        <Flex gap='gap.medium' vAlign='center'>
          <Button
            primary
            onClick={goHome}
            icon={<ChevronStartIcon />}
            iconOnly
          />
          <h2>Good. Task page of {code}.</h2>
        </Flex>
        {/* <p>{`The current page is: ${location}`}</p> */}

        <Box className='task-body'>
          {paddedTasks.map((task) => (
            <TaskRowDisplay
              key={task._id}
              task={task}
              hover={hover}
              select={select}
              onHoverChange={setHover}
              onSelectChange={setSelect}
              onFieldUpdate={handleFieldUpdate}
            />
          ))}
        </Box>

        {sprints && (
          <Flex className='status-line'>
            {sprints.map((sprint) => (
              <Button
                key={sprint._id}
                content={sprint.name}
                primary={sprint._id === selectedSprintId}
                onClick={() => {
                  setSelectedSprintId(sprint._id);
                }}
              />
            ))}
          </Flex>
        )}
      </Flex>
    )
    : (
      <>
        <h1>Project {code} not found!</h1>
        <Button content='Back home' primary onClick={goHome}></Button>
      </>
    );
};
