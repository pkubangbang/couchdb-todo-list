import {
  Button,
  ExclamationTriangleIcon,
  Flex
} from '@fluentui/react-northstar';
import { FC } from 'react';
import { Coordinate } from './editableCell/common.ts';
import { NumberCell } from './editableCell/NumberCell.tsx';
import { PeopleCell } from './editableCell/PeopleCell.tsx';
import { TextCell } from './editableCell/TextCell.tsx';

export interface TaskRowDisplayProps {
  task: Doc<Task>;
  colSetting: ColumnSetting;
  hover: Coordinate;
  select: Coordinate;
  onHoverChange: (coord: Coordinate) => void;
  onSelectChange: (coord: Coordinate) => void;
  onFieldUpdate: (
    task: Doc<Task>,
    field: keyof Task,
    value: string | number | string[] | undefined
  ) => Promise<void>;
  onCancel?: () => void;
}

const Row: FC<TaskRowDisplayProps> = (
  {
    task,
    colSetting,
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
    <Flex vAlign='stretch'>
      <TextCell
        widthInPx={colSetting.create_time.widthInPx}
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
        widthInPx={colSetting.module.widthInPx}
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
        widthInPx={colSetting.type_of_task.widthInPx}
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
        widthInPx={colSetting.detail.widthInPx}
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

      <NumberCell
        widthInPx={colSetting.priority.widthInPx}
        value={task.priority}
        hovered={isThisRowHovered && hover.field === 'priority'}
        selected={isThisRowSelected && select.field === 'priority'}
        onHover={() =>
          onHoverChange({ id: task._id, rev: task._rev, field: 'priority' })}
        onClick={() =>
          onSelectChange({ id: task._id, rev: task._rev, field: 'priority' })}
        onCommit={async (value) => await onFieldUpdate(task, 'priority', value)}
        onCancel={onCancel}
      >
      </NumberCell>

      <PeopleCell
        widthInPx={colSetting.assignee.widthInPx}
        value={task.assignee}
        hovered={isThisRowHovered && hover.field === 'assignee'}
        selected={isThisRowSelected && select.field === 'assignee'}
        onHover={() =>
          onHoverChange({ id: task._id, rev: task._rev, field: 'assignee' })}
        onClick={() =>
          onSelectChange({ id: task._id, rev: task._rev, field: 'assignee' })}
        onCommit={async (value) => await onFieldUpdate(task, 'assignee', value)}
        onCancel={onCancel}
      />

      <NumberCell
        widthInPx={colSetting.eta.widthInPx}
        value={task.eta}
        hovered={isThisRowHovered && hover.field === 'eta'}
        selected={isThisRowSelected && select.field === 'eta'}
        onHover={() =>
          onHoverChange({ id: task._id, rev: task._rev, field: 'eta' })}
        onClick={() =>
          onSelectChange({ id: task._id, rev: task._rev, field: 'eta' })}
        onCommit={async (value) => await onFieldUpdate(task, 'eta', value)}
        onCancel={onCancel}
      >
      </NumberCell>

      <NumberCell
        widthInPx={colSetting.progress.widthInPx}
        value={task.progress}
        hovered={isThisRowHovered && hover.field === 'progress'}
        selected={isThisRowSelected && select.field === 'progress'}
        onHover={() =>
          onHoverChange({ id: task._id, rev: task._rev, field: 'progress' })}
        onClick={() =>
          onSelectChange({ id: task._id, rev: task._rev, field: 'progress' })}
        onCommit={async (value) => await onFieldUpdate(task, 'progress', value)}
        onCancel={onCancel}
      >
      </NumberCell>
    </Flex>
  );
};

export const TaskRowDisplay: FC<TaskRowDisplayProps> = (
  {
    task,
    colSetting,
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
            colSetting={colSetting}
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
              colSetting={colSetting}
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
        colSetting={colSetting}
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
