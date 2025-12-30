import { useEffect, useState } from "react";

export const useDbChangeListener = (db: PouchDB.Database, selector: (doc: any) => boolean) => {
  const [recentChange, setRecentChange] = useState(null);

  useEffect(() => {
    const ln = (doc: any) => {
      if (selector(doc)) {
          setRecentChange(doc);
      }
    };

    const handle = db.changes({
      live: true,
      since: "now"
    });

    handle.on("change", ln);

    return () => {
      handle.removeListener("change", ln);
    };
  }, [db, selector]);

  return recentChange;
};
