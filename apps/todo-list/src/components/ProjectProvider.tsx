import { createContext, FC } from 'react';

export const projectContext = createContext<Doc<Project> | null>(null);

export const ProjectProvider: FC<{ project: Doc<Project> | null }> = ({
  project,
  children
}) => {
  return (
    <projectContext.Provider value={project}>
      {children}
    </projectContext.Provider>
  );
};
