import {
  Button,
  ExclamationTriangleIcon,
  Flex,
  Input,
  Pill,
  Text
} from '@fluentui/react-northstar';
import { FC } from 'react';
import { Coordinate } from './editableCell/common.ts';
import { TextCell } from './editableCell/TextCell.tsx';

export interface TaskRowDisplayProps {
  task: Doc<Task>;
  hover: Coordinate;
  select: Coordinate;
  onHoverChange: (coord: Coordinate) => void;
  onSelectChange: (coord: Coordinate) => void;
}

const Row: FC<TaskRowDisplayProps> = (
  { task, hover, select, onHoverChange, onSelectChange }
) => {
  const isThisRowHovered = hover.id === task._id && hover.rev === task._rev;
  const isThisRowSelected = select.id === task._id && select.rev === task._rev;

  return (
    <Flex vAlign='stretch' gap='gap.small'>
      <TextCell
        widthInPx={100}
        value={task.create_time}
        hovered={isThisRowHovered && hover.field === 'create_time'}
        selected={isThisRowSelected && select.field === 'create_time'}
        onHover={() =>
          onHoverChange({ id: task._id, rev: task._rev, field: 'create_time' })}
        onClick={() =>
          onSelectChange({
            id: task._id,
            rev: task._rev,
            field: 'create_time'
          })}
      >
      </TextCell>

      <TextCell
        widthInPx={100}
        value={task.module}
        hovered={isThisRowHovered && hover.field === 'module'}
        selected={isThisRowSelected && select.field === 'module'}
        onHover={() =>
          onHoverChange({ id: task._id, rev: task._rev, field: 'module' })}
        onClick={() =>
          onSelectChange({ id: task._id, rev: task._rev, field: 'module' })}
      >
      </TextCell>

      <TextCell
        widthInPx={100}
        value={task.type_of_task}
        hovered={isThisRowHovered && hover.field === 'type_of_task'}
        selected={isThisRowSelected && select.field === 'type_of_task'}
        onHover={() =>
          onHoverChange({
            id: task._id,
            rev: task._rev,
            field: 'type_of_task'
          })}
        onClick={() =>
          onSelectChange({
            id: task._id,
            rev: task._rev,
            field: 'type_of_task'
          })}
      >
      </TextCell>

      <TextCell
        widthInPx={300}
        value={task.detail}
        hovered={isThisRowHovered && hover.field === 'detail'}
        selected={isThisRowSelected && select.field === 'detail'}
        onHover={() =>
          onHoverChange({ id: task._id, rev: task._rev, field: 'detail' })}
        onClick={() =>
          onSelectChange({ id: task._id, rev: task._rev, field: 'detail' })}
      >
      </TextCell>

      <Input value={task.priority}></Input>
      <Flex style={{ width: 200, flex: 'none' }}>
        {task.assignee.map((person) => (
          <Pill key={person} content={person} size='small'></Pill>
        ))}
      </Flex>
      <Input value={task.eta}></Input>
      <Input value={task.progress}></Input>
    </Flex>
  );
};

export const TaskRowDisplay: FC<TaskRowDisplayProps> = (
  { task, hover, select, onSelectChange, onHoverChange }
) => {
  if (task.conflicts && task.conflicts.length) {
    /* super row */
    return (
      <Flex vAlign='stretch'>
        <Button
          iconOnly
          icon={<ExclamationTriangleIcon />}
          style={{ flex: 'none', color: 'red', height: 'auto', marginRight: 4 }}
        />
        <Flex column style={{ outline: '2px solid red' }}>
          <Row
            task={task}
            hover={hover}
            select={select}
            onSelectChange={onSelectChange}
            onHoverChange={onHoverChange}
          />
          {task.conflicts.map((c) => (
            <Row
              key={c._rev}
              task={c}
              hover={hover}
              select={select}
              onSelectChange={onSelectChange}
              onHoverChange={onHoverChange}
            />
          ))}
        </Flex>
      </Flex>
    );
  }

  return (
    <Flex style={{ paddingLeft: 36 }}>
      <Row
        task={task}
        hover={hover}
        select={select}
        onSelectChange={onSelectChange}
        onHoverChange={onHoverChange}
      />
    </Flex>
  );
};
