import { Button, ButtonProps, Card, CardBody, Flex } from "@fluentui/react-northstar";
import { useAutoTrigger } from '@scope/utils';
import { Redirect, Route, Switch, useLocation } from 'wouter';
import { db } from "./utils/dbClient.ts";

interface Project {
  name: string,
  desc: string,
  code: string,
  type: string
}

function App() {

  const [status, result] = useAutoTrigger<Project[]>(async () => {
    await db.sync('http://admin:4eszxcvg@10.0.1.1:5984/ird-todo-list');

    const result = await db.allDocs<Project>({
      include_docs: true
    });

    // console.log(result);

    return result.rows.map(row => row.doc).filter(doc => !!doc);
  }, []);

  const projects: Project[] = (result ?? []).filter(doc => doc.type === 'project');
  const [location, navigate] = useLocation();

  const goTaskPage: ButtonProps['onClick'] = () => {
    navigate('/projects/xxx/tasks');
  }

  return <Switch>
    <Route path="/projects">
      {status === 'loading' ? <h1>Starting...</h1> : status === 'success' ? <Flex column>
        <h1>Welcome to TODO list</h1>
        <Flex gap="gap.small">
          {projects.map(proj => (<Card key={proj.code}>
            <CardBody>
              <h1>{proj.code}</h1>
              <h2>{proj.name}</h2>
              <p>{proj.desc}</p>
              <Button content="Go" primary onClick={goTaskPage} />
            </CardBody>
          </Card>))}
        </Flex>
      </Flex> : null}
    </Route>
    <Route path="/projects/xxx/tasks">
      <h1>Good. Task page.</h1>
      <p>{`The current page is: ${location}`}</p>
    </Route>
    <Redirect to="/projects"></Redirect>
  </Switch>
}

export default App
