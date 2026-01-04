import { css } from '@emotion/css';

export interface BaseCellProps<T> {
  value?: T;
  hovered?: boolean;
  selected?: boolean;
  widthInPx: number;
  onHover?: () => void;
  onClick?: () => void;
  onEdit?: () => void;
  onCommit?: (value: T) => Promise<void>;
  onCancel?: () => void;
}

export type EditingState<T> = { mode: 'read' } | {
  mode: 'edit';
  draft: T;
};

export const commonStyle = css`
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
