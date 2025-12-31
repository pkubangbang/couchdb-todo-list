import { Button, ExclamationTriangleIcon, Flex, Input, Pill, Text } from '@fluentui/react-northstar';
import { FC } from 'react';

export interface TaskRowDisplayProps {
    task: Doc<Task>
}

const Row: FC<TaskRowDisplayProps> = ({ task }) => <Flex vAlign='center'>
    <Text content={task._id} size="small" style={{ flex: 'none', marginRight: 8 }} />
    <Input value={task.create_time}></Input>
    <Input value={task.module}></Input>
    <Input value={task.type_of_task}></Input>
    <Input value={task.detail}></Input>
    <Input value={task.priority}></Input>
    <Flex style={{ width: 200, flex: 'none' }}>
        {task.assignee.map((person) => (
            <Pill key={person} content={person} size='small'></Pill>
        ))}
    </Flex>
    <Input value={task.eta}></Input>
    <Input value={task.progress}></Input>
</Flex>;

export const TaskRowDisplay: FC<TaskRowDisplayProps> = ({ task }) => {
    if (task.conflicts && task.conflicts.length) {
        /* super row */
        return <Flex vAlign='stretch'>
            <Button iconOnly icon={<ExclamationTriangleIcon />} style={{ flex: 'none', color: 'red', height: 'auto', marginRight: 4 }}/>
            <Flex column style={{ outline: '2px solid red' }}>
                <Row task={task} />
                {task.conflicts.map(c => <Row key={c._rev} task={c} />)}
            </Flex>
        </Flex>
    }

    return <Flex style={{ paddingLeft: 36 }}>
        <Row task={task} />
    </Flex>
}