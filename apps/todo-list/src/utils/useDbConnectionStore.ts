import { createStoreHook } from '@scope/utils';

export type ReplicationStatus =
  | 'not-started'
  | 'paused'
  | 'active'
  | 'denied'
  | 'complete'
  | 'error';

export const useConnectionStatusStore = createStoreHook(() => {
  return {
    isRemoteConnected: false,
    replicationStatus: 'not-started'
  };
}, 'dbStatus');

export const updateReplicationStatus = useConnectionStatusStore
  .createDispatcher((draft, status: ReplicationStatus) => {
    draft.replicationStatus = status;
  });

export const updateRemoteConnectionStatus = useConnectionStatusStore
  .createDispatcher((draft, connected: boolean) => {
    draft.isRemoteConnected = connected;
  });
