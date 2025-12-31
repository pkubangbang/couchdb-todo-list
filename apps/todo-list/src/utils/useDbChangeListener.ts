import { useEffect, useState } from 'react';

export const useDbChangeListener = <T extends object>(
  db: PouchDB.Database,
  selector: (doc: Doc<T>) => boolean
) => {
  const [recentChange, setRecentChange] = useState<Doc<T> | null>(null);

  useEffect(() => {
    const handle = db.changes({
      live: true,
      since: 'now',
      include_docs: true
    });

    handle.on('change', (change) => {
      if ('doc' in change && change.doc) {
        // when include_docs, doc will be inside change.doc
        console.log(
          `useDbChangeListener[${selector.name}]: db has new changes`,
          change
        );
  
        const doc = change.doc as Doc<T>;
        if (selector(doc)) {
          console.log(
            `useDbChangeListener[${selector.name}]: change is relevant!`
          );
          setRecentChange(doc);
        }
      }
    });

    return () => {
      handle.cancel();
    };
  }, [db, selector]);

  return recentChange;
};
