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
  onFieldUpdate: (
    task: Doc<Task>,
    field: keyof Task,
    value: string | undefined
  ) => Promise<void>;
  onCancel?: () => void;
}

const Row: FC<TaskRowDisplayProps> = (
  {
    task,
    hover,
    select,
    onHoverChange,
    onSelectChange,
    onFieldUpdate,
    onCancel
  }
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
        onCommit={async (value) =>
          await onFieldUpdate(task, 'create_time', value)}
        onCancel={onCancel}
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
        onCommit={async (value) => await onFieldUpdate(task, 'module', value)}
        onCancel={onCancel}
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
        onCommit={async (value) =>
          await onFieldUpdate(task, 'type_of_task', value)}
        onCancel={onCancel}
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
        onCommit={async (value) => await onFieldUpdate(task, 'detail', value)}
        onCancel={onCancel}
      >
      </TextCell>

      <Input
        value={task.priority}
        style={{
          border: '1px solid #e0e0e0',
          width: 60,
          flex: 'none',
          padding: '4px 6px',
          boxSizing: 'border-box'
        }}
      >
      </Input>
      <Flex
        style={{
          width: 200,
          flex: 'none',
          border: '1px solid #e0e0e0',
          padding: '4px 6px',
          boxSizing: 'border-box'
        }}
      >
        {task.assignee.map((person) => (
          <Pill key={person} content={person} size='small'></Pill>
        ))}
      </Flex>
      <Input
        value={task.eta}
        style={{
          border: '1px solid #e0e0e0',
          width: 80,
          flex: 'none',
          padding: '4px 6px',
          boxSizing: 'border-box'
        }}
      >
      </Input>
      <Input
        value={task.progress}
        style={{
          border: '1px solid #e0e0e0',
          width: 80,
          flex: 'none',
          padding: '4px 6px',
          boxSizing: 'border-box'
        }}
      >
      </Input>
    </Flex>
  );
};

export const TaskRowDisplay: FC<TaskRowDisplayProps> = (
  {
    task,
    hover,
    select,
    onSelectChange,
    onHoverChange,
    onFieldUpdate,
    onCancel
  }
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
            onFieldUpdate={onFieldUpdate}
            onCancel={onCancel}
          />
          {task.conflicts.map((c) => (
            <Row
              key={c._rev}
              task={c}
              hover={hover}
              select={select}
              onSelectChange={onSelectChange}
              onHoverChange={onHoverChange}
              onFieldUpdate={onFieldUpdate}
              onCancel={onCancel}
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
        onFieldUpdate={onFieldUpdate}
        onCancel={onCancel}
      />
    </Flex>
  );
};
