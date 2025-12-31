import { css } from "@emotion/css";
import { Box, Button, ButtonProps, ChevronStartIcon, Flex, Input, Pill } from "@fluentui/react-northstar";
import { FC, useContext, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useDbChangeListener } from "../utils/useDbChangeListener.ts";
import { dbContext } from "./DbProvider.tsx";
import { useAutoTrigger } from "@scope/utils";
import { fetchConflictingProjectsAndShowMergedResult } from "../utils/dataMerger.ts";

export interface TaskPageProps {
    params: {
        project: string
    }
}

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


function projectSelector(doc: object) {
    return ('type' in doc) && doc.type === 'project';
}

function sprintSelector(doc: object) {
    return ('type' in doc) && doc.type === 'sprint';
}

function taskSelector(doc: object) {
    return ('type' in doc) && doc.type === 'task';
}

export const TaskPage: FC<TaskPageProps> = ({ params }) => {
    const code = params.project;
    const [location, navigate] = useLocation();
    const db = useContext(dbContext);

    const projectListener = useDbChangeListener(db, projectSelector);
    const sprintListener = useDbChangeListener(db, sprintSelector);
    const taskListener = useDbChangeListener(db, taskSelector);

    const [projectStatus, selectedProject] = useAutoTrigger<Doc<Project>>(() => {
        return (db as PouchDB.Database<Doc<Project>>).find({
            selector: { type: 'project', code: code }
        }).then(result => {
            const found = result.docs.find(proj => proj.code === code);
            if (!found) {
                throw new Error(`project ${code} not found`);
            }

            return fetchConflictingProjectsAndShowMergedResult(db, [found]);
        }).then(projects => projects[0]);
    }, [db, code, projectListener])

    const [sprintStatus, sprints] = useAutoTrigger<Doc<Sprint>[]>(() => {
        const sprintIds = selectedProject?.sprint_ids ?? [];
        if (!sprintIds.length) { return Promise.resolve([]); }

        return (db as PouchDB.Database<Doc<Sprint>>).allDocs({
            keys: sprintIds,
            include_docs: true
        }).then(result => {
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
    }, [db, selectedProject, sprintListener])

    const goHome: ButtonProps['onClick'] = () => {
        navigate('~/projects');
    }

    const [selectedSprintId, setSelectedSprintId] = useState('');

    const [taskStatus, tasks] = useAutoTrigger(() => {
        if (!selectedSprintId) {
            return Promise.reject('no selected sprint');
        }

        return (db as PouchDB.Database<Task>).find({
            selector: {
                type: 'task',
                sprint_id: selectedSprintId
            }
        }).then(result => {
            return result.docs;
        })
    }, [db, selectedSprintId, taskListener]);

    useEffect(() => {
        // Specify the default open sprint (when project data is ready)
        const sprintIds = selectedProject?.sprint_ids;
        if (Array.isArray(sprintIds) && sprintIds.length && !sprintIds.includes(selectedSprintId)) {
            setSelectedSprintId(sprintIds[sprintIds.length - 1]);
        }
    }, [selectedProject, selectedSprintId]);

    if (!selectedProject) {
        return <>
            <h1>Project {code} not found!</h1>
            <Button content="Back home" primary onClick={goHome}></Button>
        </>
    }

    return <Flex className={taskPageStyle} column>
        <Flex gap="gap.medium" vAlign="center">
            <Button primary onClick={goHome} icon={<ChevronStartIcon />} iconOnly />
            <h2>Good. Task page of {code}.</h2>
        </Flex>
        <p>{`The current page is: ${location}`}</p>

        {tasks && <Box className="task-body">
            {tasks.map(task => <Flex key={task.task_id}>
                <Input value={task.create_time}></Input>
                <Input value={task.module}></Input>
                <Input value={task.type_of_task}></Input>
                <Input value={task.detail}></Input>
                <Input value={task.priority}></Input>
                <Flex style={{ width: 200, flex: 'none' }}>
                    {task.assignee.map(person => <Pill key={person} content={person} size="small"></Pill>)}
                </Flex>
                <Input value={task.eta}></Input>
                <Input value={task.progress}></Input>
            </Flex>)}
        </Box>}

        {sprints && <Flex className="status-line">{sprints.map(sprint => <Button key={sprint._id}
            content={sprint.name} primary={sprint._id === selectedSprintId}
            onClick={() => { setSelectedSprintId(sprint._id) }}
        />)}</Flex>}
    </Flex>
}