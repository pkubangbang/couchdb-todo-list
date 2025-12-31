import { Button } from '@fluentui/react-northstar';
import { createContext, FC, useCallback, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { dbClient } from '../utils/dbClient.ts';

type Status =
  | 'not-initialized'
  | 'loading'
  | 'ready'
  | 'error';

export const dbContext = createContext(dbClient.getDb());
export const DbProvider: FC = ({ children }) => {
  const [status, setStatus] = useState<Status>('not-initialized');
  const [db, setDb] = useState(dbClient.getDb());
  const [, navigate] = useLocation();

  const restore = useCallback(() => {
    setStatus('loading');
    dbClient.restore().then(() => {
      setDb(dbClient.getDb());
      setStatus('ready');
    }).catch((e) => {
      if (e.message === 'need login') {
        navigate('~/welcome');
        return;
      }

      setStatus('error');
    });
  }, []);

  useEffect(restore, []);

  return (status === 'not-initialized' || status === 'loading')
    ? <h1>Loading...</h1>
    : status === 'error'
    ? (
      <h1>
        Error loading data. <Button content='retry' onClick={restore} />
      </h1>
    )
    : status === 'ready'
    ? (
      <dbContext.Provider value={db}>
        {children}
      </dbContext.Provider>
    )
    : null;
};
