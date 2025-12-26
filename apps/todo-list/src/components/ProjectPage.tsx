import { Flex, Card, CardBody, Button, Text } from "@fluentui/react-northstar";
import { useLocation } from "wouter";
import { useProjectStore } from "../utils/useProjectStore.ts";
import { redButtonVariables } from "@scope/patches";

export const ProjectPage = () => {
    const { status, projects } = useProjectStore();
    const [_location, navigate] = useLocation();

    const goTaskPage = (project: string) => {
        const validRegex = /^[a-z][0-9a-z-]*$/;
        if (!validRegex.test(project)) {
            return;
        }

        navigate(`/projects/${project}/tasks`);
    };

    const logout = () => {
        // TODO: implement this
        navigate('/welcome');
    };

    return (status === 'not-started') ? <h1>Starting...</h1> : <Flex column>
        <Flex vAlign="center" gap="gap.medium">
            <h2>All Projects</h2>
            <Button content="Logout" onClick={logout} variables={redButtonVariables} />
        </Flex>
        <Text content={`CouchDB status: ${status}`} temporary />
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
    </Flex>
}
