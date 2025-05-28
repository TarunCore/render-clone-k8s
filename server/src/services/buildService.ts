import { coreApi, networkingApi } from "../configs/k8s";

async function createClusterIPService(projectId: string) {
    const service = {
        metadata: { name: `service-${projectId}` }, // TODO: use proper naming
        spec: {
            selector: { app: `${projectId}` },
            ports: [{ port: 80, targetPort: 3000 }],
            type: 'ClusterIP'
        }
    };

    try{
        await coreApi.createNamespacedService({
            namespace: 'default', body: {
                apiVersion: 'v1',
                kind: 'Service',
                metadata: service.metadata,
                spec: service.spec
            }
        });
    } catch (e) {
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
    ingress.spec.rules.push({
        host: `${subdomain}.my-domain.com`,
        http: {
            paths: [{ path: '/', pathType: 'Prefix', backend: { service: { name: `service-${projectId}`, port: { number: 80 } } } }]
        }
    });
    try{
        await networkingApi.replaceNamespacedIngress({ namespace: 'default', name: 'main-ingress', body: ingress });
    } catch (e) {
        throw new Error("Ingress update failed");
    }
    return true;
}
export { createClusterIPService, updateIngress };