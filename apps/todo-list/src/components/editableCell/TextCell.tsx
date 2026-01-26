import { FC, KeyboardEventHandler, useEffect, useRef, useState } from 'react';
import { BaseCellProps, commonStyle, EditingState } from './common.ts';

export const TextCell: FC<BaseCellProps<string>> = ({
  hovered,
  selected,
  onHover,
  onClick,
  onEdit,
  onCommit,
  value,
  widthInPx
}) => {
  const [state, setState] = useState<EditingState<string>>({ mode: 'read' });
  const inputRef = useRef<HTMLInputElement>(null);

  const isEditing = selected && state.mode === 'edit';

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
    }
  };

  const handleKeyboardInput: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') {
      handleBlur().then(() => {
        // re-focus on the div so that user can hit 'enter' again.
        inputRef.current?.focus();
      });
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
    }
  }, [state.mode]);

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
          border: 'none',
          padding: 'none'
        }}
      >
      </input>
    )
    : (
      <div
        ref={inputRef}
        tabIndex={0}
        onClick={handleClick}
        onMouseOver={handleHover}
        onKeyDown={handleKeyboardDiv}
        className={commonStyle}
        data-hovered={!!hovered}
        data-selected={!!selected}
        style={{ width: widthInPx, flex: 'none' }}
      >
        {value || <span className='placeholder'>-</span>}
      </div>
    );
};
