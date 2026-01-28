import { css } from '@emotion/css';

export interface BaseCellProps<T> {
  value?: T;
  hovered?: boolean;
  selected?: boolean;
  widthInPx: number;
  onHover?: () => void;
  onClick?: () => void;
  onEdit?: () => void;
  onCommit?: (value: T | undefined) => Promise<void>;
  onCancel?: () => void;
}

export type EditingState<T> = { mode: 'read' } | {
  mode: 'edit';
  draft: T | undefined;
};

export const commonStyle = css`
  border: 1px solid #e0e0e0;
  padding: 4px 6px;
  box-sizing: border-box;

  &[data-hovered="true"] {
    outline: 1px solid #3333ff90;
  }

  &[data-selected="true"] {
    outline: 2px solid #333333;
    &[data-hovered="true"] {
      outline: 2px solid #33336690;
    }
  }
`;

export interface Coordinate {
  id: string;
  rev: string;
  field: string;
}
