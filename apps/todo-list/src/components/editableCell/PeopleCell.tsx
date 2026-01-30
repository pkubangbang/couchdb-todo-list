import { css, cx } from '@emotion/css';
import { Box, Flex, Text } from '@fluentui/react-northstar';
import {
  FC,
  KeyboardEventHandler,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { BaseCellProps, commonStyle, EditingState } from './common.ts';

export interface PeopleCellProps extends BaseCellProps<string[]> {
  participants: Participant[];
}

export const PeopleCell: FC<PeopleCellProps> = ({
  value = [],
  participants,
  hovered,
  selected,
  widthInPx,
  taskId,
  taskRev,
  fieldName,
  onHover,
  onClick,
  onEdit,
  onCommit,
  onCancel
}) => {
  const [state, setState] = useState<EditingState<string[]>>({ mode: 'read' });
  const [input, setInput] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const divRef = useRef<HTMLDivElement>(null);

  const isEditing = selected && state.mode === 'edit';
  const draft = state.mode === 'edit' ? state.draft : value;
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

  /* ---------- directory ---------- */
  const directory = useMemo(() => {
    const map = new Map<string, Participant>();
    participants.forEach((p) => map.set(p.id, p));
    return map;
  }, [participants]);

  const resolveLabel = (id: string) => directory.get(id)?.name ?? id;

  /* ---------- suggestions ---------- */
  const suggestions = useMemo(() => {
    const q = input.toLowerCase();
    if (!q) { return []; }
    return participants.filter((p) =>
      p.id.toLowerCase().includes(q) ||
      p.name?.toLowerCase().includes(q)
    );
  }, [participants, input]);

  useEffect(() => {
    setActiveIndex(0);
  }, [input]);

  /* ---------- lifecycle ---------- */
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    } else {
      // When exiting edit mode, focus back on the div
      divRef.current?.focus();
    }
  }, [isEditing]);

  // Cancel editing when selection moves away
  useEffect(() => {
    if (!selected && state.mode === 'edit') {
      setState({ mode: 'read' });
      onCancel?.();
    }
  }, [selected, state.mode, onCancel]);

  const commitAndExit = async () => {
    if (JSON.stringify(draft) !== JSON.stringify(value)) {
      await onCommit?.(draft);
    }
    setState({ mode: 'read' });
    // Focus back on the div after committing
    divRef.current?.focus();
  };

  /* ---------- keyboard ---------- */
  const onInputKeyDown: KeyboardEventHandler<HTMLInputElement> = async (e) => {
    switch (e.key) {
      case 'Escape':
        setState({ mode: 'read' });
        onCancel?.();
        return;

      case 'Tab': {
        if (suggestions.length > 0) {
          e.preventDefault();
          const picked = suggestions[activeIndex];
          if (picked) {
            setInput(picked.id);
          }
        }
        return;
      }

      case 'Enter': {
        if (!input.trim()) {
          await commitAndExit();
          return;
        }

        const picked = suggestions[activeIndex]?.id ?? input.trim();

        const next = e.shiftKey
          ? [picked, ...(draft ?? [])]
          : [...(draft ?? []), picked];

        setState({
          mode: 'edit',
          draft: Array.from(new Set(next))
        });
        setInput('');
        return;
      }

      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
        return;

      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        return;

      default:
        return;
    }
  };

  /* ---------- drag & drop ---------- */
  const onDrag = (from: number, to: number) => {
    if (from === to) { return; }
    const next = [...(draft ?? [])];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setState({ mode: 'edit', draft: next });
  };

  /* ---------- read mode ---------- */
  if (!isEditing) {
    return (
      <div
        ref={divRef}
        tabIndex={0}
        className={cx(commonStyle, readCell)}
        data-hovered={!!hovered}
        data-selected={!!selected}
        data-cell-id={cellId}
        data-field={fieldName}
        style={{ width: widthInPx }}
        onMouseOver={onHover}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            setState({ mode: 'edit', draft: value });
            onEdit?.();
          }
        }}
      >
        {value.length === 0 ? <span>-</span> : value.map((id) => (
          <span
            key={id}
            title={id}
            className={pill}
          >
            {resolveLabel(id)}
          </span>
        ))}
      </div>
    );
  }

  /* ---------- edit mode ---------- */
  return (
    <Flex
      column
      className={editorContainer}
      style={{ width: widthInPx }}
    >
      <Flex wrap gap='gap.smaller' className={editorBox}>
        {(draft ?? []).map((id, i) => (
          <span
            key={id}
            draggable
            title={id}
            className={pill}
            onDragStart={(e) => e.dataTransfer.setData('index', String(i))}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) =>
              onDrag(
                Number(e.dataTransfer.getData('index')),
                i
              )}
          >
            {resolveLabel(id)}
            <span
              className={remove}
              onClick={() =>
                setState({
                  mode: 'edit',
                  draft: (draft ?? []).filter((x) => x !== id)
                })}
            >
              ×
            </span>
          </span>
        ))}

        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onInputKeyDown}
          className={inputBox}
        />
      </Flex>

      <Box className={dropdown}>
        {suggestions.map((p, i) => (
          <Box
            key={p.id}
            className={cx(
              dropdownItem,
              i === activeIndex && dropdownItemActive
            )}
          >
            {p.name ?? p.id}
          </Box>
        ))}
        <Text size='small' className={hint}>
          Enter: Add item · Shift+Enter: Add to front · ↑↓: Navigate · Tab:
          Autocomplete
        </Text>
      </Box>
    </Flex>
  );
};

/* =======================
   emotion styles
   ======================= */

const readCell = css`
  flex: none;
`;

const editorContainer = css`
  flex: none;
  position: relative;
`;

const editorBox = css`
  border: 1px solid #e0e0e0;
  padding: 6px;
  min-height: 32px;
  box-sizing: border-box;
`;

const pill = css`
  border: 1px solid #e0e0e0;
  padding: 2px 8px;
  border-radius: 12px;
  background: #f5f5f5;
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;

const remove = css`
  cursor: pointer;
  color: #666;

  &:hover {
    color: #000;
  }
`;

const inputBox = css`
  flex: 1;
  min-width: 60px;
  border: none;
  outline: none;
  font-size: inherit;
`;

const dropdown = css`
  border: 1px solid #e0e0e0;
  margin-top: 4px;
  background: white;
  min-width: 200px;
`;

const dropdownItem = css`
  padding: 6px;
`;

const dropdownItemActive = css`
  background: #eee;
`;

const hint = css`
  padding: 8px 6px;
  color: #444;
  font-size: 12px;
  font-weight: 500;
  background: #fafafa;
  border-top: 1px solid #e5e5e5;
`;
