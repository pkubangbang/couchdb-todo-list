# Security Model

This app sets `offline-first` as its starting point, so bears with it the 
design choice of using `PouchDB` on the client-side. This choice has led to 
the discussion of the security model.

First, **the client does not forward writes to the server; it syncs the changes**.

This means that the client holds a replica of the server, so in case of offline,
the client can still work normally. But an important difference between the client
and the server is that **the client runs in admin mode locally but in member mode remotely**.

So the client can potentially make unwanted changes that diverge from the
common move (e.g. delete a project member by manipulating the db).
**Unfortunately this situation is unavoidable due to the `offline-first` choice.**

So we need a security model to strive for maximum security.

---

In this app we defined several roles in the first place, according to the meaning
of the Sprint Model:
- `po`: product owner, the admin of the project.
- `sm`: scrum master, also the admin of the project.
- `stakeholder`: viewers of the project; sm should act on behalf of them.
- `lead`, `dev`, `qa`, `ui`, ...: the functional users, labels to add; source of changes most of the time.

So there are three permissions in total:
- `full-control`: can read and write all docs, **including the membership**. Maps to `po` and `sm`.
- `read-write`: can read and write all docs, **except the membership**. Maps to all functional users.
- `read-only`: can only read (some of) the docs; they still need to login however. Maps to `stakeholder`.

Besides that a virtual `audience` permission is defined for the anonymous access.
The audience is only meaningful when the request is sent to the server directly.

---

The admins can directly add the roles as literal labels inside the `project doc` without first declaring them.
The mapping of roles to permission is done seperately in two ways:
- The pre-defined roles get mapped to permissions **hard-coded**.
- For other (later-emerged) roles, the mapping is saved inside the `project doc`.
   ```json
   {
      "role_mappings": {
          "my-custom-role": "read-only"
      }
   }
   ```
- Note that for simplicity and consistency, the pre-defined roles cannot be overriden. They will have no
  effect if you do so.

---

From the above discussion, we can now bring up the security model:

> Although unsafe, we at the best effort enforce the permission
> on the client side using custom code. The client should all
> honor the implication of "working together" rather than
> "fighting with each other", to contribute its piece of information
> shared among others.

This locks down to:
1. The project doc is protected from unwanted changes or deletion.
2. The client must consult the project doc for its permission.
3. The client must act according to its given permission.
4. Only trusted users should be allowed to sync with the server, making this app internal-use only.
