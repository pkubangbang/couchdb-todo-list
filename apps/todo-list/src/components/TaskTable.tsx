import { css } from '@emotion/css';
import { Box, Flex, Text } from '@fluentui/react-northstar';
import {
  lastIndexOf,
  useAutoTrigger,
  usePersistentGlobalState
} from '@scope/utils';
import { FC, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  fetchConflictingTasksAndShowMergedResult,
  makeDict
} from '../utils/dataMerger.ts';
import { TaskRowDisplay } from './TaskRowDisplay.tsx';
import { Coordinate } from './editableCell/common.ts';
import { useThrottle } from '@react-hook/throttle';
import { produce } from 'immer';
import { dbContext } from './DbProvider.tsx';

const taskTableStyle = css`
  padding: 3px 0;
`;

export interface TaskTableProps {
  selectedSprintId: string;
}

export const TaskTable: FC<TaskTableProps> = ({ selectedSprintId }) => {
  const db = useContext(dbContext);
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
        if (('type' in doc) && doc.type === 'task') {
          updateTaskListener(taskListener + 1);
        }
      }
    });

    return () => {
      handle.cancel();
    };
  }, [db, taskListener]);

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

  const [layout, setLayout] = usePersistentGlobalState<TaskLayout[]>(
    selectedSprintId,
    {
      version: 0,
      migrate: () => Promise.resolve(),
      default: () => []
    }
  );

  const [taskStatus, tasks] = useAutoTrigger(() => {
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
    console.log('tasks -> ', tasks);

    // reconciliate the layout if mismatch
    if (!Array.isArray(tasks) || !tasks.length) { return; }
    const knownIdCache = makeDict(
      layout.filter((item) => item.type === 'task'),
      (t) => t.id
    );

    const needReconciliation = tasks.some((t) => !knownIdCache[t._id]);
    if (!needReconciliation) { return; }

    performance.mark('task list reconciliation started');
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
      let tailIndex = lastIndexOf(layout, (item) => item.type === 'task');
      for (const suggestion of naturalLayout) {
        if (!knownIdCache[suggestion.id]) {
          draft.splice(tailIndex, 0, suggestion);
          tailIndex++;
        }
      }
    });

    console.log('new layout after reconciliation: ', newLayout);
    setLayout(newLayout);
    performance.mark('task list reconciliation ended');
    performance.measure('task list reconciliation', 'task list reconciliation started', 'task list reconciliation ended')
    
  }, [tasks, layout]);

  const paddedTasks = useMemo(() => {
    if (!Array.isArray(tasks)) {
      return [];
    }

    const taskDict = makeDict(tasks, (t) => t._id);
    return layout.map((row) => {
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
        };
      } else {
        throw new Error(
          'for dev: unsupported layout type ' + (row as any).type
        );
      }
    }).filter((row) => !!row);
  }, [layout, tasks, selectedSprintId]);

  return (
    <Box className={taskTableStyle}>
      <Flex style={{ paddingLeft: 36, marginBottom: 8 }} gap='gap.small'>
        <Text weight='bold' style={{ width: 100, flex: 'none' }}>
          Create Time
        </Text>
        <Text weight='bold' style={{ width: 100, flex: 'none' }}>Module</Text>
        <Text weight='bold' style={{ width: 100, flex: 'none' }}>Type</Text>
        <Text weight='bold' style={{ width: 300, flex: 'none' }}>Detail</Text>
        <Text weight='bold' style={{ flex: 'none' }}>Priority</Text>
        <Text weight='bold' style={{ width: 200, flex: 'none' }}>Assignee</Text>
        <Text weight='bold' style={{ flex: 'none' }}>ETA</Text>
        <Text weight='bold' style={{ flex: 'none' }}>Progress</Text>
      </Flex>
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
  );
};
