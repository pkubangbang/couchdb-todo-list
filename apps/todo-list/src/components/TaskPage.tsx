import { css } from '@emotion/css';
import {
  Box,
  Button,
  ButtonProps,
  ChevronStartIcon,
  Flex,
  Text
} from '@fluentui/react-northstar';
import { useAutoTrigger } from '@scope/utils';
import { FC, useContext, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import {
  fetchConflictingProjectsAndShowMergedResult
} from '../utils/dataMerger.ts';
import { dbContext } from './DbProvider.tsx';
import { TaskTable } from './TaskTable.tsx';
import { useThrottle } from '@react-hook/throttle';

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
        }
      }
    });

    return () => {
      handle.cancel();
    };
  }, [db, projectListener, sprintListener]);

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

  const [selectedSprintId, setSelectedSprintId] = useState('');

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
          {selectedSprintId && (
            <TaskTable
              selectedSprintId={selectedSprintId}
            />
          )}
        </Box>

        {sprints && (
          <Flex className='status-line'>
            {sprints.map((sprint) => (
              <Button
                key={sprint._id}
                content={import.meta.env.MODE === 'development'
                  ? (
                    <Flex column styles={{ fontSize: 'smaller' }}>
                      <Text content={sprint.name} />
                      <Text content={sprint._id.slice(-8)} disabled />
                    </Flex>
                  )
                  : sprint.name}
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
