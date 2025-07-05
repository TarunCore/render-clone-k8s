import { MAIN_DEP_URL } from "../config";
import k8sApi, { coreApi, networkingApi } from "../configs/k8s";
import logger from "../logger";

const NAMESPACE = 'default';
const INGRESS_NAME = 'main-ingress';

class K8sServiceError extends Error {
    constructor(message: string, public readonly cause?: unknown) {
        super(message);
        this.name = 'K8sServiceError';
    }
}

async function createClusterIPService(projectId: string, port: number): Promise<void> {
    const serviceName = getServiceName(projectId);

    try {
        await coreApi.createNamespacedService({
            namespace: NAMESPACE,
            body: {
                apiVersion: 'v1',
                kind: 'Service',
                metadata: { name: serviceName },
                spec: {
                    selector: { app: projectId },
                    ports: [{ port: 80, targetPort: port }],
                    type: 'ClusterIP'
                }
            }
        });
        logger.info(`ClusterIP service created: ${serviceName}`);
    } catch (error) {
        logger.error(`Failed to create ClusterIP service: ${serviceName}`, { error });
        throw new K8sServiceError(`Service creation failed for project ${projectId}`, error);
    }
}

async function updateIngress(projectId: string, subdomain: string): Promise<void> {
    const hostname = getHostname(subdomain);
    const serviceName = getServiceName(projectId);

    try {
        const ingress = await networkingApi.readNamespacedIngress({
            namespace: NAMESPACE,
            name: INGRESS_NAME
        });

        if (!ingress.spec) {
            throw new K8sServiceError('Ingress spec not found');
        }

        ingress.spec.rules = ingress.spec.rules ?? [];

        const ruleExists = ingress.spec.rules.some(rule => rule.host === hostname);
        if (ruleExists) {
            logger.info(`Ingress rule already exists for ${hostname}, skipping`);
            return;
        }

        ingress.spec.rules.push({
            host: hostname,
            http: {
                paths: [{
                    path: '/',
                    pathType: 'Prefix',
                    backend: {
                        service: { name: serviceName, port: { number: 80 } }
                    }
                }]
            }
        });

        await networkingApi.replaceNamespacedIngress({
            namespace: NAMESPACE,
            name: INGRESS_NAME,
            body: ingress
        });
        logger.info(`Ingress updated with rule for ${hostname}`);
    } catch (error) {
        if (error instanceof K8sServiceError) throw error;
        logger.error(`Failed to update ingress for ${hostname}`, { error });
        throw new K8sServiceError(`Ingress update failed for subdomain ${subdomain}`, error);
    }
}

function getServiceName(projectId: string): string {
    return `service-${projectId}`;
}

function getPodName(projectId: string): string {
    return `pod-${projectId}`;
}

function getHostname(subdomain: string): string {
    return `${subdomain}.${MAIN_DEP_URL}`;
}

async function deletePodAndService(projectId: string): Promise<void> {
    const podName = getPodName(projectId);
    const serviceName = getServiceName(projectId);

    try {
        await k8sApi.deleteNamespacedPod({ namespace: NAMESPACE, name: podName });
        logger.info(`Deleted existing pod: ${podName}`);
    } catch (error: unknown) {
        const isNotFound = error instanceof Error && 'statusCode' in error && (error as { statusCode: number }).statusCode === 404;
        if (isNotFound) {
            logger.debug(`Pod ${podName} not found, skipping deletion`);
        } else {
            logger.warn(`Failed to delete pod ${podName}`, { error });
        }
    }

    try {
        await coreApi.deleteNamespacedService({ namespace: NAMESPACE, name: serviceName });
        logger.info(`Deleted existing service: ${serviceName}`);
    } catch (error: unknown) {
        const isNotFound = error instanceof Error && 'statusCode' in error && (error as { statusCode: number }).statusCode === 404;
        if (isNotFound) {
            logger.debug(`Service ${serviceName} not found, skipping deletion`);
        } else {
            logger.warn(`Failed to delete service ${serviceName}`, { error });
        }
    }
}

async function createPod(
    projectId: string,
    command: string,
    image: string,
    port: number
): Promise<void> {
    const podName = getPodName(projectId);

    try {
        await k8sApi.createNamespacedPod({
            namespace: NAMESPACE,
            body: {
                metadata: {
                    name: podName,
                    labels: { app: projectId }
                },
                spec: {
                    containers: [{
                        name: projectId,
                        image,
                        command: ['sh', '-c'],
                        args: [command],
                        ports: [{ containerPort: port }],
                    }],
                    restartPolicy: 'Never'
                }
            }
        });
        logger.info(`Pod created: ${podName}`);
    } catch (error) {
        logger.error(`Failed to create pod: ${podName}`, { error });
        throw new K8sServiceError(`Pod creation failed for project ${projectId}`, error);
    }
}

export {
    createClusterIPService,
    updateIngress,
    deletePodAndService,
    createPod,
    K8sServiceError,
    getHostname
};