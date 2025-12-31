// deno-lint-ignore-file no-window
import {
  updateRemoteConnectionStatus,
  updateReplicationStatus,
} from "./useDbConnectionStore.ts";

/** Information used for resuming the connection */
interface DbConnection {
  url: string;
  label: string;
  username: string;
  password: string;
}

/** Information used for identifying the remote server */
interface DbMeta {
  name: string;
  version: string;
}

// dev tools
declare global {
  interface Window {
    $db: DbClient;
    $restoreDefault: () => void;
    $createConflict: (
      id: string,
      part1: Record<string, unknown>,
      part2: Record<string, unknown>,
    ) => void;
  }
}

class DbClient {
  private online = false;

  private defaultDb: PouchDB.Database;
  private workingDb: PouchDB.Database;

  private remoteDb: PouchDB.Database | null = null;
  // deno-lint-ignore no-explicit-any
  private replication: PouchDB.Replication.Sync<any> | null = null;

  constructor() {
    this.defaultDb = new PouchDB(import.meta.env.VITE_DEFAULT_DB_NAME);
    this.prepareDb(this.defaultDb);
    this.workingDb = this.defaultDb;

    // dev tools
    if (import.meta.env.DEV) {
      setTimeout(() => {
        /**
         * use `$db` to get hold of the dbClient on the console.
         */
        window.$db = dbClient;
      }, 0);
      /**
       * destroy the default db and re-create a new one.
       */
      window.$restoreDefault = () => {
        this.restoreDefaultDb();
      };
      /**
       * Reliably create conflict documents for a particular doc specified by id.
       * 
       * The mechanism is create a temporary db and sync once with the target db,
       * then do different updates on both sides, then sync again.
       * 
       * Used mainly for testing the conflict resolving process.
       * 
       * @param id the id of the doc inside local database.
       * @param part1 changes made to the target database
       * @param part2 changes made to the temporary database, effectively create conflicts.
       */
      window.$createConflict = async (id, part1, part2) => {
        const v1 = await this.workingDb.get(id);
        const tempDb = new PouchDB("dev-temp");
        tempDb.sync(this.workingDb).on("complete", () => {
          console.log('sync1 complete');
          const v1a = Object.assign({}, v1, part1);
          const v1b = Object.assign({}, v1, part2);

          Promise.all([this.workingDb.put(v1a), tempDb.put(v1b)]).then((result) => {
            console.log(result);
            tempDb.sync(this.workingDb).on("complete", () => {
              console.log('sync2 complete. Ready to destroy tempDb');
              tempDb.destroy();
            });
          })
        });
      };
    }
  }

  /**
   * Get current connected working db.
   *
   * **You should use `useLiveQuery` instead of directly manipulate this one.**
   * @returns PouchDB database instance.
   */
  getDb() {
    return this.workingDb;
  }

  /** check and connect to the remote db, then enable live sync */
  async connect(url: string, username: string, password: string) {
    if (this.online) {
      return;
    }

    try {
      const remoteDb = new PouchDB(url, {
        auth: {
          username,
          password,
        },
      });

      const meta = await remoteDb.get<DbMeta>(
        import.meta.env.VITE_REMOTE_DB_META_KEY,
      );

      const { name, version } = meta;
      if (!name || !version) {
        throw new Error("Invalid remote meta document");
      }

      this.saveCredential(url, name, username, password);

      // switch to online mode
      this.remoteDb = remoteDb;
      this.workingDb = this.defaultDb;
      this.online = true;

      updateRemoteConnectionStatus(true);
      updateReplicationStatus("not-started");

      // start replication
      this.replication = this.workingDb
        .sync(this.remoteDb, {
          live: true,
          retry: true,
        })
        .on("paused", () => updateReplicationStatus("paused"))
        .on("active", () => updateReplicationStatus("active"))
        .on("denied", () => updateReplicationStatus("denied"))
        .on("complete", () => updateReplicationStatus("complete"))
        .on("error", (err) => {
          console.error("Replication error:", err);
          updateReplicationStatus("error");
        });
    } catch (err) {
      console.error("DB connect failed:", err);

      this.remoteDb = null;
      this.online = false;

      updateRemoteConnectionStatus(false);
      updateReplicationStatus("error");

      throw err;
    }
  }

  /** use local one and disconnect from the remote db */
  disconnect() {
    // stop the replication
    this.replication?.cancel();
    this.replication?.removeAllListeners();

    // do not try restoring on the next run
    this.removeCredential();

    this.remoteDb = null;
    this.workingDb = this.defaultDb;
    this.online = false;
    updateRemoteConnectionStatus(false);
    updateReplicationStatus("not-started");
  }

  /** restore db (after refresh) */
  async restore(requireOnline = false) {
    if (this.online) {
      return;
    }

    const credential = this.getCredential();
    if (!credential) {
      // assuming using local database
      if (requireOnline) {
        throw new Error("No credential found but require online. Login needed");
      }

      return;
    }

    const { url, username, password } = credential;
    try {
      await this.connect(url, username, password);
    } catch (err) {
      console.warn("Session expired or invalid, manual login required", err);
      this.removeCredential();
      throw new Error("need login");
    }
  }

  /**
   * get the username & password from localstorage.
   * 
   * NOTE: we deliberately store the password because this is the only way
   * of reliably connecting to the couchdb server over HTTP/HTTPS. 
   * 
   * The localstorage is used instead of the default db because
   * it's synchronous, thus simplify the code.
   * 
   * @returns 
   */
  getCredential() {
    const credentialAsJson = localStorage.getItem(
      import.meta.env.VITE_CREDENTIAL_KEY,
    );
    if (credentialAsJson) {
      return JSON.parse(credentialAsJson);
    }

    return null;
  }

  private saveCredential(
    url: string,
    label = "unlabeled server",
    username: string,
    password: string,
  ) {
    localStorage.setItem(
      import.meta.env.VITE_CREDENTIAL_KEY,
      JSON.stringify({
        url,
        label,
        username,
        password,
      }),
    );
  }

  private removeCredential() {
    localStorage.removeItem(import.meta.env.VITE_CREDENTIAL_KEY);
  }

  /** create indexes and views to make local db functional. */
  private prepareDb(db: PouchDB.Database) {
    db.createIndex({
      index: {
        fields: ["type"],
      },
    });

    db.createIndex({
      index: {
        fields: ["type", "sprint_id"],
      },
    });

    db.createIndex({
      index: {
        fields: ["type", "code"],
      },
    });

    return db;
  }

  private restoreDefaultDb() {
    this.defaultDb.destroy();
    this.defaultDb = new PouchDB(import.meta.env.VITE_DEFAULT_DB_NAME);
  }
}

/**
 * A db client which provides a couch db instance that either:
 * - from a local db, or
 * - from a remote db (via url + username + password).
 *
 * NOTE: it's the app's responsibility to call dbClient.restore()
 */
export const dbClient = new DbClient();
