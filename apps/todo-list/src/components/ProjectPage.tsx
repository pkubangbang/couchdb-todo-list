import { Button, Card, CardBody, ErrorIcon, Flex, Text } from "@fluentui/react-northstar";
import { redButtonVariables } from "@scope/patches";
import { useLocation } from "wouter";
import { dbClient } from "../utils/dbClient.ts";
import { useConnectionStatusStore } from "../utils/useDbConnectionStore.ts";
import { useContext } from "react";
import { dbContext } from "./DbProvider.tsx";
import { useAutoTrigger } from "@scope/utils";
import { fetchConflictingProjectsAndShowMergedResult } from "../utils/dataMerger.ts";


export const ProjectPage = () => {
    const { replicationStatus } = useConnectionStatusStore();
    const db = useContext(dbContext);
    const [status, projects, error, api] = useAutoTrigger<Project[]>(() => {
        return (db as PouchDB.Database<Project>).find({
            selector: {
                type: 'project'
            }
        }).then(result => {
            const filterd = result.docs as Doc<Project>[];
            return fetchConflictingProjectsAndShowMergedResult(db, filterd);
        });
    }, [db, replicationStatus]);

    const [_location, navigate] = useLocation();

    const goTaskPage = (project: string) => {
        const validRegex = /^[a-z][0-9a-z-]*$/;
        if (!validRegex.test(project)) {
            console.error('for dev: invalid project name -> ', project);
            return;
        }

        navigate(`~/projects/${project}/tasks`);
    };

    const logout = () => {
        dbClient.disconnect();
        navigate('~/welcome');
    };

    return <Flex column>
        <Flex vAlign="center" gap="gap.medium">
            <h2>All Projects</h2>
            <Button content="Refresh" onClick={() => api.fire()} />
            <Button content="Logout" onClick={logout} variables={redButtonVariables} />
        </Flex>
        <Text content={`CouchDB status: ${replicationStatus}`} temporary />
        {status === 'success' ? <Flex gap="gap.small">
            {(projects ?? []).map(proj => (<Card key={proj.code}>
                <CardBody>
                    <h1>{proj.code} {proj.hasConflict && 
                        <Button iconOnly icon={<ErrorIcon />} />}</h1>
                    <h2>{proj.name}</h2>
                    <p>{proj.desc}</p>
                    <p>{proj.sprint_ids.join(', ')}</p>
                    <Button content="Go" primary onClick={() => goTaskPage(proj.code)} />
                </CardBody>
            </Card>))}
        </Flex> : status === 'error' ? error?.message : null}
    </Flex>
}
