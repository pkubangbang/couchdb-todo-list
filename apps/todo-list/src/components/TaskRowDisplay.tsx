import { Button, ExclamationTriangleIcon, Flex, Input, Pill, Text } from '@fluentui/react-northstar';
import { FC } from 'react';
import { Coordinate } from './editableCell/common.ts';
import { TextCell } from './editableCell/TextCell.tsx';

export interface TaskRowDisplayProps {
    task: Doc<Task>,
    hover: Coordinate,
    select: Coordinate,
    onHoverChange: (coord: Coordinate) => void,
    onSelectChange: (coord: Coordinate) => void
}

const Row: FC<TaskRowDisplayProps> = ({ task, hover, select, onHoverChange, onSelectChange }) => {
    const isThisRowHovered = hover.id === task._id && hover.rev === task._rev;
    const isThisRowSelected = select.id === task._id && select.rev === task._rev;

    return <Flex vAlign='center' gap="gap.small">
        <Text content={task._id} size="small" style={{ flex: 'none', marginRight: 8 }} />
        <TextCell widthInPx={100} value={task.create_time}
            hovered={isThisRowHovered && hover.field === 'create_time'}
            selected={isThisRowSelected && select.field === 'create_time'}
            onHover={() => onHoverChange({ id: task._id, rev: task._rev, field: 'create_time' })}
            onClick={() => onSelectChange({ id: task._id, rev: task._rev, field: 'create_time' })}
        ></TextCell>

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
    </Flex >;
}

export const TaskRowDisplay: FC<TaskRowDisplayProps> = ({ task, hover, select, onSelectChange, onHoverChange }) => {
    if (task.conflicts && task.conflicts.length) {
        /* super row */
        return <Flex vAlign='stretch'>
            <Button iconOnly icon={<ExclamationTriangleIcon />} style={{ flex: 'none', color: 'red', height: 'auto', marginRight: 4 }} />
            <Flex column style={{ outline: '2px solid red' }}>
                <Row task={task} hover={hover} select={select} onSelectChange={onSelectChange} onHoverChange={onHoverChange} />
                {task.conflicts.map(c => <Row key={c._rev} task={c} hover={hover} select={select} onSelectChange={onSelectChange} onHoverChange={onHoverChange} />)}
            </Flex>
        </Flex>
    }

    return <Flex style={{ paddingLeft: 36 }}>
        <Row task={task} hover={hover} select={select} onSelectChange={onSelectChange} onHoverChange={onHoverChange} />
    </Flex>
}