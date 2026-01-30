import { css } from '@emotion/css';
import { Box, Flex, Text } from '@fluentui/react-northstar';
import {
  lastIndexOf,
  useAutoTrigger,
  usePersistentGlobalState
} from '@scope/utils';
import {
  FC,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
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

// Define column order for keyboard navigation
const COLUMNS: Array<keyof Task> = [
  'create_time',
  'module',
  'type_of_task',
  'detail',
  'priority',
  'assignee',
  'eta',
  'progress'
];

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
    async (
      task: Doc<Task>,
      field: keyof Task,
      value: string | number | string[] | undefined
    ) => {
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

  // Excel-like keyboard navigation
  const containerRef = useRef<HTMLDivElement>(null);

  const [layout, setLayout] = usePersistentGlobalState<TaskLayout[]>(
    selectedSprintId,
    {
      version: 0,
      migrate: () => Promise.resolve(),
      default: () => []
    }
  );

  const [colSetting, setColSetting] = usePersistentGlobalState<ColumnSetting>(
    selectedSprintId + ':colset',
    {
      version: 0,
      migrate: () => Promise.resolve(),
      default: () => ({
        create_time: { widthInPx: 100, sort: 0, filter: '' },
        module: { widthInPx: 100, sort: 0, filter: '' },
        type_of_task: { widthInPx: 100, sort: 0, filter: '' },
        detail: { widthInPx: 300, sort: 0, filter: '' },
        priority: { widthInPx: 60, sort: 0, filter: '' },
        assignee: { widthInPx: 200, sort: 0, filter: '' },
        eta: { widthInPx: 80, sort: 0, filter: '' },
        progress: { widthInPx: 80, sort: 0, filter: '' },
        note: { widthInPx: 150, sort: 0, filter: '' }
      })
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
    performance.measure(
      'task list reconciliation',
      'task list reconciliation started',
      'task list reconciliation ended'
    );
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

  // Excel-like keyboard navigation
  const navigateCell = useCallback((
    direction: 'up' | 'down' | 'left' | 'right'
  ) => {
    if (!paddedTasks.length || !COLUMNS.length) {
      return;
    }

    // Build a mapping of visual row index to task
    // Each task with conflicts becomes multiple visual rows (winning + conflicts)
    const visualRows: Array<{ task: Doc<Task>; rev: string }> = [];
    for (const task of paddedTasks) {
      // Winning revision
      visualRows.push({ task, rev: task._rev });
      // Conflict revisions
      if (task.conflicts && task.conflicts.length) {
        for (const conflict of task.conflicts) {
          visualRows.push({ task: conflict, rev: conflict._rev });
        }
      }
    }

    // If no cell selected, select first cell (winning revision of first task)
    if (!select.id) {
      const firstRow = visualRows[0];
      setSelect({
        id: firstRow.task._id,
        rev: firstRow.rev,
        field: COLUMNS[0]
      });
      return;
    }

    // Find current visual row position
    const currentVisualRowIndex = visualRows.findIndex(
      (row) => row.task._id === select.id && row.rev === select.rev
    );
    if (currentVisualRowIndex === -1) {
      // Selection not found, select first cell (winning revision of first task)
      const firstRow = visualRows[0];
      setSelect({
        id: firstRow.task._id,
        rev: firstRow.rev,
        field: COLUMNS[0]
      });
      return;
    }

    const currentColIndex = COLUMNS.indexOf(select.field as keyof Task);
    if (currentColIndex === -1) {
      // Field not in columns, select first column
      const currentRow = visualRows[currentVisualRowIndex];
      setSelect({
        id: currentRow.task._id,
        rev: currentRow.rev,
        field: COLUMNS[0]
      });
      return;
    }

    let newVisualRow = currentVisualRowIndex;
    let newCol = currentColIndex;

    // Calculate new position
    switch (direction) {
      case 'up':
        newVisualRow = Math.max(0, currentVisualRowIndex - 1);
        break;
      case 'down':
        newVisualRow = Math.min(
          visualRows.length - 1,
          currentVisualRowIndex + 1
        );
        break;
      case 'left':
        newCol = currentColIndex - 1;
        if (newCol < 0) {
          newCol = COLUMNS.length - 1;
          newVisualRow = Math.max(0, currentVisualRowIndex - 1);
        }
        break;
      case 'right':
        newCol = currentColIndex + 1;
        if (newCol >= COLUMNS.length) {
          newCol = 0;
          newVisualRow = Math.min(
            visualRows.length - 1,
            currentVisualRowIndex + 1
          );
        }
        break;
    }

    const targetRow = visualRows[newVisualRow];
    setSelect({
      id: targetRow.task._id,
      rev: targetRow.rev,
      field: COLUMNS[newCol]
    });
  }, [paddedTasks, select]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Don't handle navigation when an input is focused (edit mode)
    const activeElement = document.activeElement;
    if (activeElement?.tagName === 'INPUT') {
      return;
    }

    // Handle arrow keys for navigation
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        navigateCell('up');
        break;
      case 'ArrowDown':
        e.preventDefault();
        navigateCell('down');
        break;
      case 'ArrowLeft':
        e.preventDefault();
        navigateCell('left');
        break;
      case 'ArrowRight':
        e.preventDefault();
        navigateCell('right');
        break;
      case 'Tab':
        e.preventDefault();
        navigateCell(e.shiftKey ? 'left' : 'right');
        break;
    }
  }, [navigateCell]);

  // Auto-focus the selected cell after navigation
  useEffect(() => {
    if (select.id && select.rev && select.field) {
      // Find the cell element by data attributes
      // Combine id and rev to uniquely identify cells in superrows
      const cellId = `${select.id}|${select.rev}`;
      const selector =
        `[data-cell-id="${cellId}"][data-field="${select.field}"]`;
      const element = document.querySelector(selector) as HTMLElement;
      if (element) {
        element.focus();
      }
    }
  }, [select.id, select.rev, select.field]);

  return (
    <Box
      className={taskTableStyle}
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <Flex style={{ paddingLeft: 36, marginBottom: 8 }}>
        <Flex
          column
          style={{ width: colSetting.create_time.widthInPx, flex: 'none' }}
        >
          <Text weight='bold'>Create Time</Text>
          <Text size='small' content='(due time see sprint name)' />
        </Flex>
        <Flex
          column
          style={{ width: colSetting.module.widthInPx, flex: 'none' }}
        >
          <Text weight='bold'>Module</Text>
        </Flex>
        <Flex
          column
          style={{ width: colSetting.type_of_task.widthInPx, flex: 'none' }}
        >
          <Text weight='bold'>Type</Text>
        </Flex>
        <Flex
          column
          style={{ width: colSetting.detail.widthInPx, flex: 'none' }}
        >
          <Text weight='bold'>Detail</Text>
        </Flex>
        <Flex
          column
          style={{ width: colSetting.priority.widthInPx, flex: 'none' }}
        >
          <Text weight='bold'>Priority</Text>
          <Text size='small' content='(0=blocking, 1=should, 2=plan, 3=n/a)' />
        </Flex>
        <Flex
          column
          style={{ width: colSetting.assignee.widthInPx, flex: 'none' }}
        >
          <Text weight='bold'>Assignee</Text>
        </Flex>
        <Flex column style={{ width: colSetting.eta.widthInPx, flex: 'none' }}>
          <Text weight='bold'>ETA</Text>
          <Text size='small' content='(1=0.5d, 2=1d)' />
        </Flex>
        <Flex
          column
          style={{ width: colSetting.progress.widthInPx, flex: 'none' }}
        >
          <Text weight='bold'>Progress</Text>
        </Flex>
      </Flex>
      {paddedTasks.map((task) => (
        <TaskRowDisplay
          key={task._id}
          task={task}
          colSetting={colSetting}
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
