import { Button, Card, CardBody, Flex } from "@fluentui/react-northstar";
import { Redirect, Route, Switch, useLocation } from 'wouter';
import { TaskPage } from "./components/TaskPage.tsx";
import { useProjectStore } from "./utils/useProjectStore.ts";

interface Project {
  name: string,
  desc: string,
  code: string,
  type: string
}

function App() {

  const { status, projects } = useProjectStore();
  const [_location, navigate] = useLocation();

  const goTaskPage = (project: string) => {
    const validRegex = /^[a-z][0-9a-z-]*$/;
    if (!validRegex.test(project)) {
      return;
    }

    navigate(`/projects/${project}/tasks`);
  }

  return <Switch>
    <Route path="/projects">
      {status === 'not-started' ? <h1>Starting...</h1> : <Flex column>
        <h1>Welcome to TODO list! CouchDB status: {status}</h1>
        <Flex gap="gap.small">
          {projects.map(proj => (<Card key={proj.code}>
            <CardBody>
              <h1>{proj.code}</h1>
              <h2>{proj.name}</h2>
              <p>{proj.desc}</p>
              <Button content="Go" primary onClick={() => goTaskPage(proj.code)} />
            </CardBody>
          </Card>))}
        </Flex>
      </Flex>}
    </Route>
    <Route path="/projects/:project/tasks" component={TaskPage} />
    {/* redirect to home if no route match */}
    <Redirect to="/projects"></Redirect>
  </Switch>
}

export default App
