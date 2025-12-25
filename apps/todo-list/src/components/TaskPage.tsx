import { Button, ButtonProps, Flex, Input, Pill } from "@fluentui/react-northstar";
import { FC } from "react";
import { useLocation } from "wouter";
import { useProjectStore } from "../utils/useProjectStore.ts";

export interface TaskPageProps {
    params: {
        project: string
    }
}

export const TaskPage: FC<TaskPageProps> = ({ params }) => {
    const { project } = params;
    const [location, navigate] = useLocation();

    const goHome: ButtonProps['onClick'] = () => {
        navigate('/projects');
    }

    const { projects, sprints, tasks } = useProjectStore();
    const selectedProject = projects.find(proj => proj.code === project);

    if (!selectedProject) {
        return <>
            <h1>Project {project} not found!</h1>
            <Button content="Back home" primary onClick={goHome}></Button>
        </>
    }

    const sprintsOfProject = selectedProject.sprint_ids.map(sid => {
        return sprints[sid];
    });

    return <Flex column>
        <h1>Good. Task page of {project}. <Button content="Back home" primary onClick={goHome}></Button></h1>
        <p>{`The current page is: ${location}`}</p>

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

        <Flex>{sprintsOfProject.map(sprint => <Button key={sprint._id} content={sprint.name} />)}</Flex>
    </Flex>
}