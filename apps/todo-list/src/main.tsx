import './index.css'
import ReactDOM from 'react-dom';

import { Provider, teamsTheme } from '@fluentui/react-northstar'

import App from './App.tsx'

ReactDOM.render(
  <Provider theme={teamsTheme}>
    <App />
  </Provider>,
  document.getElementById('root')
)
