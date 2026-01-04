import { FC, useRef, useState } from 'react';
import { BaseCellProps, commonStyle, EditingState } from './common.ts';

export const TextCell: FC<BaseCellProps<string>> = ({
    hovered, selected, onHover, onClick, value, widthInPx
}) => {
    const [state, setState] = useState<EditingState<string>>({ mode: 'read' });
    const inputRef = useRef<HTMLInputElement>(null);

    const isEditing = selected && state.mode === 'edit';

    const handleClick = () => {
        // parent component need to maintain the selection
        onClick?.();
    }

    const handleHover = () => {
        onHover?.();
    }

    return <div tabIndex={0} onClick={handleClick} onMouseOver={handleHover}
        className={commonStyle}
        data-hovered={!!hovered} data-selected={!!selected}
        style={{ width: widthInPx, flex: 'none' }}>
        {value || <span className="placeholder">-</span>}
    </div>
}