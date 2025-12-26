import { css } from '@emotion/css';
import { Button, ChevronEndIcon, Flex, Header, Text } from "@fluentui/react-northstar";
import { FC } from "react";
import { useLocation } from "wouter";

import { redButtonVariables } from '@scope/patches'

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

export const WelcomePage: FC = () => {
    const [, navigate] = useLocation();

    const goToLogin = () => {
        navigate('/login');
    };

    return <Flex column className={welcomePageStyle}>
        <Header align="center" content="Welcome to CouchDB-todo-list!" />
        <Text className="sub-title" align="center" content="Your go-to sprint task manager." />
        <Flex column gap="gap.medium">
            <Button content="Recently used: xxx" variables={redButtonVariables}  icon={<ChevronEndIcon />} iconPosition="after" />
            <Button content="Login to remote database" primary onClick={goToLogin} />
            <Button content="Use local database" />
        </Flex>
    </Flex>
}