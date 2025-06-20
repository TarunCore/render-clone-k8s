import { MAIN_DEP_URL } from "../config";
import k8sApi, { coreApi, networkingApi } from "../configs/k8s";
import logger from "../logger";

async function createClusterIPService(projectId: string, port: number) {
    const service = {
        metadata: { name: `service-${projectId}` }, // TODO: use proper naming
        spec: {
            selector: { app: `${projectId}` },
            ports: [{ port: 80, targetPort: port }],
            type: 'ClusterIP'
        }
    };

    try {
        await coreApi.createNamespacedService({
            namespace: 'default', body: {
                apiVersion: 'v1',
                kind: 'Service',
                metadata: service.metadata,
                spec: service.spec
            }
        });
    } catch (e) {
        console.error("Service creation failed:", e);
        return false;
    }
    return true;
}

async function updateIngress(projectId: string, subdomain: string) {
    const ingress = await networkingApi.readNamespacedIngress({ namespace: 'default', name: 'main-ingress' });
    if (!ingress.spec) {
        throw new Error("Ingress not found");
    }
    if (!ingress.spec.rules) {
        ingress.spec.rules = [];
    }
    // Check if the rule already exists
    const existingRule = ingress.spec.rules.find(rule => rule.host === `${subdomain}.${MAIN_DEP_URL}`);
    if (existingRule) {
        logger.info(`Ingress rule for ${subdomain}.${MAIN_DEP_URL} already exists, skipping update.`);
        return true;
    }
    ingress.spec.rules.push({
        host: `${subdomain}.${MAIN_DEP_URL}`,
        http: {
            paths: [{ path: '/', pathType: 'Prefix', backend: { service: { name: `service-${projectId}`, port: { number: 80 } } } }]
        }
    });
    try {
        await networkingApi.replaceNamespacedIngress({ namespace: 'default', name: 'main-ingress', body: ingress });
    } catch (e) {
        throw new Error("Ingress update failed");
    }
    return true;
}

async function deletePodAndService(project_id: string) {
    try {
        await k8sApi.deleteNamespacedPod({ namespace: 'default', name: `pod-${project_id}` });
    } catch (e) {
        console.log("Pod not found. Creating new pod.")
    }
    try {
        await coreApi.deleteNamespacedService({ namespace: 'default', name: `service-${project_id}` });
    } catch (e) {
        console.log("Service not found. Creating new service.")
    }
}

export { createClusterIPService, updateIngress, deletePodAndService };