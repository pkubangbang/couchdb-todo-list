import { FC, KeyboardEventHandler, useEffect, useRef, useState } from 'react';
import { BaseCellProps, commonStyle, EditingState } from './common.ts';

export const TextCell: FC<BaseCellProps<string>> = ({
  hovered,
  selected,
  onHover,
  onClick,
  onEdit,
  onCommit,
  onCancel,
  value,
  widthInPx,
  taskId,
  taskRev,
  fieldName
}) => {
  const [state, setState] = useState<EditingState<string>>({ mode: 'read' });
  const divRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isEditing = selected && state.mode === 'edit';
  // Combine taskId and taskRev for unique cell identification (for superrows)
  const cellId = taskId && taskRev ? `${taskId}|${taskRev}` : taskId;

  const handleClick = () => {
    if (selected) {
      // turn into editable
      setState({ mode: 'edit', draft: value });
      onEdit?.();
    } else {
      // parent component need to maintain the selection
      onClick?.();
    }
  };

  const handleHover = () => {
    onHover?.();
  };

  const handleKeyboardDiv: KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === 'Enter') {
      // turn into editable
      setState({ mode: 'edit', draft: value });
      onEdit?.();
    } else if (e.key === 'Escape' && isEditing) {
      // cancel editing and revert to read mode
      setState({ mode: 'read' });
      onCancel?.();
    }
  };

  const handleKeyboardInput: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') {
      handleBlur().then(() => {
        // re-focus on the div so that user can hit 'enter' again.
        divRef.current?.focus();
      });
    } else if (e.key === 'Escape') {
      // cancel editing and revert to original value
      setState({ mode: 'read' });
      onCancel?.();
    }
  };

  const handleBlur = async () => {
    if (!isEditing) {
      return;
    }

    if (state.draft !== value) {
      await onCommit?.(state.draft);
    }

    setState({ mode: 'read' });
  };

  useEffect(() => {
    if (state.mode === 'edit') {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else {
      // When exiting edit mode, focus back on the div
      divRef.current?.focus();
    }
  }, [state.mode]);

  // Cancel editing when selection moves away
  useEffect(() => {
    if (!selected && state.mode === 'edit') {
      setState({ mode: 'read' });
      onCancel?.();
    }
  }, [selected, state.mode, onCancel]);

  return isEditing
    ? (
      <input
        value={state.draft}
        ref={inputRef}
        onChange={(e) => {
          setState({ mode: 'edit', draft: e.target.value });
        }}
        onKeyDown={handleKeyboardInput}
        onBlur={handleBlur}
        style={{
          width: widthInPx,
          flex: 'none',
          boxSizing: 'border-box',
          border: '1px solid #e0e0e0',
          padding: '4px 6px'
        }}
      >
      </input>
    )
    : (
      <div
        ref={divRef}
        tabIndex={0}
        onClick={handleClick}
        onMouseOver={handleHover}
        onKeyDown={handleKeyboardDiv}
        className={commonStyle}
        data-hovered={!!hovered}
        data-selected={!!selected}
        data-cell-id={cellId}
        data-field={fieldName}
        style={{ width: widthInPx, flex: 'none' }}
      >
        {value || <span className='placeholder'>-</span>}
      </div>
    );
};
