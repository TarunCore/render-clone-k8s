import k8s from '@kubernetes/client-node';
const kc = new k8s.KubeConfig();
kc.loadFromDefault();
const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
// const k8sApi = k8s.KubernetesObjectApi.makeApiClient(kc);
export const stream = new k8s.Log(kc);
export default k8sApi;