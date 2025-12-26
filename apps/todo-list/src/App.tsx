import { Redirect, Route, Switch } from 'wouter';
import { LoginPage } from "./components/LoginPage.tsx";
import { TaskPage } from "./components/TaskPage.tsx";
import { WelcomePage } from './components/WelcomePage.tsx';

import { ProjectPage } from "./components/ProjectPage.tsx";
import { StarBackground } from "./components/StarBackground.tsx";

interface Project {
  name: string,
  desc: string,
  code: string,
  type: string
}

function App() {
  return <Switch>
    <Route path="/projects">
      <ProjectPage />
    </Route>
    <Route path="/projects/:project/tasks" component={TaskPage} />
    <Route path="/" nest>
      <StarBackground>
        <Route path="/welcome">
          <WelcomePage />
        </Route>
        <Route path="/login">
          <LoginPage />
        </Route>
      </StarBackground>
      {/* redirect to home if no route match */}
      <Redirect to="/welcome"></Redirect>
    </Route>
  </Switch>
}

export default App
