import {
  Button,
  Flex,
  Form,
  FormField,
  Header,
  Input,
  ThumbtackIcon
} from '@fluentui/react-northstar';
import { useLocation } from 'wouter';
import React, { FC } from 'react';
import { css } from '@emotion/css';
import { dbClient } from '../utils/dbClient.ts';

const loginPageStyle = css`
  width: 300px;
  flex: none;
  padding: 0 32px 32px 32px;
  border: 1px solid #00000011;
  border-radius: 12px;
  margin: 32px auto;
  background-color: white;

  .login-form {
    width: 260px;
  }
`;

export const LoginPage: FC = () => {
  const [server, setServer] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');

  const [, navigate] = useLocation();

  const onSubmit = async () => {
    // console.log({ server, username, password });
    try {
      await dbClient.connect(server, username, password);
      navigate('/projects');
    } catch (e) {
      console.error(e);
      alert('server not available');
    }
  };

  const goToWelcome = () => {
    navigate('/welcome');
  };

  const fillAndGo = () => {
    setServer('http://10.0.1.1:5984/ird-todo-list');
    setUsername(import.meta.env.VITE_APP_COUCHDB_USERNAME);
    setPassword(import.meta.env.VITE_APP_COUCHDB_PASSWORD);
  };

  return (
    <Flex className={loginPageStyle} column>
      <Header content='Please login.' />
      {import.meta.env.DEV && (
        <Button
          size='small'
          content='dev: go 10.0.1.1'
          icon={<ThumbtackIcon />}
          onClick={fillAndGo}
          tinted
          style={{ marginBottom: 12 }}
        />
      )}
      <Form className='login-form' onSubmit={onSubmit}>
        <FormField
          label='Database address'
          control={
            <Input
              fluid
              placeholder='https://example.com:5984/db'
              value={server}
              onChange={(_, data) => {
                if (typeof data?.value !== 'undefined') {
                  setServer(data.value as string);
                }
              }}
            />
          }
        />

        <FormField
          label='Username'
          control={
            <Input
              fluid
              value={username}
              onChange={(_, data) => {
                if (typeof data?.value !== 'undefined') {
                  setUsername(data.value as string);
                }
              }}
            />
          }
        />

        <FormField
          label='Password'
          control={
            <Input
              fluid
              type='password'
              value={password}
              onChange={(_, data) => {
                if (typeof data?.value !== 'undefined') {
                  setPassword(data.value as string);
                }
              }}
            />
          }
        />

        <Flex gap='gap.small' styles={{ marginTop: '1rem' }}>
          {/* the submit button */}
          <Button primary content='Login' type='submit' />
          <Button content='Back' onClick={goToWelcome} />
        </Flex>
      </Form>
    </Flex>
  );
};
