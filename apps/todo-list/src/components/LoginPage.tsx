import { Button, Flex, Form, FormField, Header, Input } from "@fluentui/react-northstar";
import { useLocation } from "wouter";
import React, { FC } from "react";
import { css } from "@emotion/css";

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

    const [server, setServer] = React.useState("");
    const [username, setUsername] = React.useState("");
    const [password, setPassword] = React.useState("");

    const [, navigate] = useLocation();

    const onSubmit = () => {
        // handle login logic here
        console.log({ server, username, password });
        navigate('/projects');
    };

    const goToWelcome = () => {
        navigate('/welcome');
    }

    return <Flex className={loginPageStyle} column>
        <Header content="Please login." />
        <Form className="login-form" onSubmit={onSubmit}>
            <FormField label="Database address" control={
                <Input
                    fluid
                    placeholder="https://example.com:5984/db"
                    value={server}
                    onChange={(_, data) => setServer(data.value as string)}
                />
            } />

            <FormField
                label="Username"
                control={
                    <Input
                        fluid
                        value={username}
                        onChange={(_, data) => setUsername(data.value as string)}
                    />
                }
            />

            <FormField
                label="Password"
                control={
                    <Input
                        fluid
                        type="password"
                        value={password}
                        onChange={(_, data) => setPassword(data.value as string)}
                    />
                }
            />

            <Flex gap="gap.small" styles={{ marginTop: "1rem" }}>
                {/* the submit button */}
                <Button primary content="Login" type="submit" />
                <Button content="Back" onClick={goToWelcome} />
            </Flex>
        </Form>
    </Flex>
}