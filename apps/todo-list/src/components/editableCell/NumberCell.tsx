import { FC, KeyboardEventHandler, useEffect, useRef, useState } from 'react';
import { BaseCellProps, commonStyle, EditingState } from './common.ts';

export const NumberCell: FC<BaseCellProps<number>> = ({
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
  const [state, setState] = useState<EditingState<number>>({ mode: 'read' });
  const divRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isEditing = selected && state.mode === 'edit';
  // Combine taskId and taskRev for unique cell identification (for superrows)
  const cellId = taskId && taskRev ? `${taskId}|${taskRev}` : taskId;

  const handleClick = () => {
    if (selected) {
      setState({ mode: 'edit', draft: value });
      onEdit?.();
    } else {
      onClick?.();
    }
  };

  const handleHover = () => {
    onHover?.();
  };

  const handleKeyboardDiv: KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === 'Enter') {
      setState({ mode: 'edit', draft: value });
      onEdit?.();
    } else if (e.key === 'Escape' && isEditing) {
      setState({ mode: 'read' });
      onCancel?.();
    }
  };

  const handleKeyboardInput: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') {
      handleBlur().then(() => {
        divRef.current?.focus();
      });
    } else if (e.key === 'Escape') {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // Empty string means user cleared the input -> undefined
    // '0' is a valid number -> 0
    if (inputValue === '') {
      setState({ mode: 'edit', draft: undefined });
    } else {
      const numValue = parseFloat(inputValue);
      setState({ mode: 'edit', draft: isNaN(numValue) ? undefined : numValue });
    }
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
        type='number'
        value={state.draft === undefined ? '' : state.draft}
        ref={inputRef}
        onChange={handleInputChange}
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
        {value !== undefined && value !== null
          ? value.toString()
          : <span className='placeholder'>-</span>}
      </div>
    );
};
