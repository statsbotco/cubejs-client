---
title: Deploy with Kubernetes
permalink: /deployment/platforms/kubernetes
category: Deployment
subCategory: Platforms
menuOrder: 1
---

This guide walks you through deploying Cube.js with Kubernetes.

<!-- prettier-ignore-start -->
[[warning |]]
| This is an example of a production-ready deployment, but real-world
| deployments can vary significantly depending on desired performance
| and scale.
<!-- prettier-ignore-end -->

## Prerequisites

- [Kubernetes][link-k8s]

## Build Docker image

Use the instructions [here][ref-deploy-docker-extend] to build a custom Docker
image for Cube.js that includes your `cube.js` configuration file and the
`schema/` folder.

[ref-deploy-docker-extend]: /deployment/platforms/docker#extend-the-docker-image

## Configuration

### Set up secrets

First, we'll write our secrets to a temporary file on disk:

```bash
echo -n <YOUR_DB_PASSWORD> > ./dbpassword.txt
echo -n <YOUR_API_SECRET> > ./apisecret.txt
```

Then we can run the following to create the secrets:

```bash
kubectl create secret generic cube-db-password --from-file=./dbpassword.txt
kubectl create secret generic cube-secret --from-file=./apisecret.txt
```

### Create Cube.js API instance and Refresh Worker

Create a file called `api-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      component: server-api
  template:
    metadata:
      labels:
        component: server-api
    spec:
      containers:
        - name: api
          image: myuser/cubejs-demo:latest
          ports:
            - containerPort: 4000
          env:
            - name: CUBEJS_DB_HOST
              value: postgres
            - name: CUBEJS_DB_NAME
              value: ecom
            - name: CUBEJS_DB_USER
              value: postgres
            - name: CUBEJS_WEB_SOCKETS
              value: 'true'
            - name: CUBEJS_DB_TYPE
              value: postgres
            - name: REDIS_URL
              value: 'redis://redis:6379/0'
            - name: CUBEJS_DB_PASS
              valueFrom:
                secretKeyRef:
                  name: cube-db-password
                  key: CUBEJS_DB_PASS
            - name: CUBEJS_API_SECRET
              valueFrom:
                secretKeyRef:
                  name: cube-secret
                  key: CUBEJS_API_SECRET
```

Then we'll add a new service to our stack in a file called
`api-cluster-ip-service.yml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-cluster-ip-service
spec:
  type: ClusterIP
  selector:
    component: server-api
  ports:
    - port: 4000
      targetPort: 4000
```

### Create Cube Store Router and Worker nodes

## Set up reverse proxy

In production, the Cube.js API should be served over an HTTPS connection to
ensure security of the data in-transit. We recommend using a reverse proxy; as
an example, let's use [NGINX][link-nginx].

<!-- prettier-ignore-start -->
[[info |]]
| You can also use a reverse proxy to enable HTTP 2.0 and GZIP compression
<!-- prettier-ignore-end -->

First we'll create a new ingress rule in a file called `ingress-service.yml`:

```yaml
apiVersion: networking.k8s.io/v1beta1
kind: Ingress
metadata:
  name: ingress-service
  annotations:
    kubernetes.io/ingress.class: 'nginx'
    nginx.ingress.kubernetes.io/use-regex: 'true'
    nginx.ingress.kubernetes.io/rewrite-target: /$1
spec:
  rules:
    - http:
        paths:
          - path:
            backend:
              serviceName: api-cluster-ip-service
              servicePort: 4000
```

## Security

### Use JSON Web Tokens

Cube.js can be configured to use industry-standard JSON Web Key Sets for
securing its API and limiting access to data. To do this, we'll define the
relevant options on our Cube.js API deployment:

<!-- prettier-ignore-start -->
[[warning |]]
| If you have cubes that use `SECURITY_CONTEXT` in their `sql` property, then
| you must configure [`scheduledRefreshContexts`][ref-config-sched-ref-ctx] so
| the refresh workers can correctly create pre-aggregations.
<!-- prettier-ignore-end -->

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-deployment
spec:
  ...
  template:
    ...
    spec:
      containers:
        - name: api
          image: myuser/cubejs-demo:latest
          ports:
            - containerPort: 4000
          env:
            ...
            - name: CUBEJS_JWK_URL
              value: https://cognito-idp.<AWS_REGION>.amazonaws.com/<USER_POOL_ID>/.well-known/jwks.json
            - name: CUBEJS_JWT_AUDIENCE
              value: <APPLICATION_URL>
            - name: CUBEJS_JWT_ISSUER
              value: https://cognito-idp.<AWS_REGION>.amazonaws.com/<USER_POOL_ID>
            - name: CUBEJS_JWT_ALGS
              value: RS256
            - name: CUBEJS_JWT_CLAIMS_NAMESPACE
              value: <CLAIMS_NAMESPACE>
```

### Securing Cube Store

All Cube Store nodes (both router and workers) should only be accessible to
Cube.js API instances and refresh workers. To do this with Kubernetes, we simply
need to make sure that none of the Cube Store services have any exposed ports.

## Monitoring

All Cube.js logs can be found by through the Kubernetes CLI:

```bash
$ kubectl get all ???


$ kubectl get logs ???


```

## Update to the latest version

Rebuild your custom Docker image from the newest stable release available from
[from Docker Hub][link-cubejs-docker] (currently `v%CURRENT_VERSION`). Then
update your `api-deployment.yaml` and `refresh-deployment.yaml` to use the new
tag:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-deployment
spec:
  ...
  template:
    ...
    spec:
      containers:
        - name: api
          image: myuser/cubejs-demo:latest
          ...
```

[link-cubejs-docker]: https://hub.docker.com/r/cubejs/cube
[link-k8s]: https://kubernetes.io/
[link-nginx]: https://www.nginx.com/
[ref-config-sched-ref-ctx]: /config#options-reference-scheduled-refresh-contexts
