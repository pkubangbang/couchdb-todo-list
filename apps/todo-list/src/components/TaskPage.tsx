import { Box, Button, ButtonProps, ChevronStartIcon, Flex, Input, Pill } from "@fluentui/react-northstar";
import { FC, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useProjectStore } from "../utils/useProjectStore.ts";
import { css } from "@emotion/css";

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

export const TaskPage: FC<TaskPageProps> = ({ params }) => {
    const { project } = params;
    const [location, navigate] = useLocation();

    const goHome: ButtonProps['onClick'] = () => {
        navigate('/projects');
    }

    const { projects, sprints, tasks } = useProjectStore();
    const selectedProject = projects.find(proj => proj.code === project);

    const [selectedSprintId, setSelectedSprintId] = useState('');

    useEffect(() => {
        // Specify the default open sprint (when project data is ready)
        const sprintIds = selectedProject?.sprint_ids;
        if (Array.isArray(sprintIds) && sprintIds.length && !sprintIds.includes(selectedSprintId)) {
            setSelectedSprintId(sprintIds[sprintIds.length - 1]);
        }
    }, [selectedProject, selectedSprintId]);

    if (!selectedProject) {
        return <>
            <h1>Project {project} not found!</h1>
            <Button content="Back home" primary onClick={goHome}></Button>
        </>
    }

    const sprintsOfProject = selectedProject.sprint_ids.map(sid => {
        return sprints[sid];
    });

    const taskInSprint = tasks.filter(t => t.sprint_id === selectedSprintId);

    return <Flex className={taskPageStyle} column>
        <Flex gap="gap.medium" vAlign="center">
            <Button primary onClick={goHome} icon={<ChevronStartIcon />} iconOnly />
            <h2>Good. Task page of {project}.</h2>
        </Flex>
        <p>{`The current page is: ${location}`}</p>

        <Box className="task-body">
            {taskInSprint.map(task => <Flex key={task.task_id}>
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
        </Box>

        <Flex className="status-line">{sprintsOfProject.map(sprint => <Button key={sprint._id}
            content={sprint.name} primary={sprint._id === selectedSprintId}
            onClick={() => { setSelectedSprintId(sprint._id) }}
        />)}</Flex>
    </Flex>
}