import { css } from '@emotion/css';
import {
  Button,
  ChevronEndIcon,
  Flex,
  Header,
  Text
} from '@fluentui/react-northstar';
import { useLocation } from 'wouter';

import { redButtonVariables } from '@scope/patches';
import { dbClient } from '../utils/dbClient.ts';

const welcomePageStyle = css`
  width: 300px;
  flex: none;
  padding: 0 32px 32px 32px;
  border: 1px solid #00000011;
  border-radius: 12px;
  margin: 32px auto;
  background-color: white;

  .sub-title {
    margin-bottom: 24px;
  }
`;

export const WelcomePage = () => {
  const credential = dbClient.getCredential();
  const [, navigate] = useLocation();

  const goToLogin = () => {
    navigate('/login');
  };

  const keepOfflineAndGoToProject = () => {
    dbClient.disconnect();
    navigate('/projects');
  };

  const resumeOnlineAndGoToProject = () => {
    dbClient.restore(true).then(() => {
      navigate('/projects');
    }).catch((e) => {
      console.error('error when resuming online db', e);
      if (e.message === 'need login') {
        navigate('/login');
      }
    });
  };

  return (
    <Flex column className={welcomePageStyle}>
      <Header align='center' content='Welcome to CouchDB-todo-list!' />
      <Text
        className='sub-title'
        align='center'
        content='Your go-to sprint task manager.'
      />
      <Flex column gap='gap.medium'>
        {credential && (
          <Button
            onClick={resumeOnlineAndGoToProject}
            variables={redButtonVariables}
            icon={<ChevronEndIcon />}
            iconPosition='after'
            style={{ height: 60, fontWeight: 'initial' }}
            content={
              <Flex column>
                <Text
                  content={`Recently used: ${credential.username}@${
                    credential.label ?? '(no label)'
                  }`}
                />
                <Text content={credential.url} temporary size='smallest' />
              </Flex>
            }
          />
        )}
        <Button
          content='Login to remote database'
          primary
          onClick={goToLogin}
        />
        <Button
          content='Use local database'
          onClick={keepOfflineAndGoToProject}
        />
      </Flex>
    </Flex>
  );
};
