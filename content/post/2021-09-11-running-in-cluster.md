---
title: Kubernetes with Java - Running in the Cluster
subtitle: Using Kubernetes API through a Java app from inside the Kubernetes cluster with RBAC
author: Salman Malik
date: 2021-09-11
tags: ["java", "kubernetes", "spring-boot", "rbac"]
---

### What are we going to do?  

This post builds on top of [Kubernetes with Java - Introduction](../2021-08-27-show-deployments) and [Kubernetes with Java - Asynchronous APIs](../2021-09-08-show-deployments-async) posts which showed us how to interact with the Kubernetes API to list *deployment* resources and provide an API of our own to list teams and apps belonging to those teams running in the cluster. In this post, we will 

- Configure a spring-boot app to be able to access the Kubernetes API when running inside a Kubernetes cluster
- Learn how to package up a spring-boot app into an OCI image (aka Docker image)
- Configure RBAC with *Role*, *RoleBinding*, and *ServiceAccount* so our spring-boot app has the ability to run with only the Kubernetes APIs that we think it should have access to and nothing more
- Create *Deployment* and *Service* resources to deploy our spring-boot app and expose its API within the cluster

#### Prerequisites

- Access to source code for the project - https://github.com/fnjoin/blog-team-apps
- Access to a running Kubernetes cluster - we will assume *minikube*
- A cluster admin role so we can use RBAC based *role* and *service-account* within Kubernetes. If you started a minikube instance, you already have this role 

### Connecting to Kubernetes API inside Kubernetes cluster

Earlier, we created an `ApiClientConfig` class in [Kubernetes with Java - Introduction](../2021-08-27-show-deployments) and added the mechanism to create an *api-client* which connects to the Kubernetes API server when the app is running **outside** of the cluster. We will now introduce a new bean which creates an *api-client* which knows how to communicate with the Kubernetes API server while running **inside** the cluster. Since other parts of the application expect only one *api-client* bean in the whole system, we have to configure that *api-client* appropriately depending on where the app is running. We will use the spring-boot profiles mechanism to differentiate between which environment we are running in when creating this bean.

We will introduce a `cloud` profile. When `cloud` profile is active, we will assume that the app is running inside the Kubernetes cluster, otherwise it will assume to be running outside. The code will look like the following:

```java
@Bean
@Profile("cloud")
public ApiClient internalApiClient() throws IOException {
    log.info("Using cluster client");
    return ClientBuilder
            .cluster()
            .build();
}

@Bean
@Profile("!cloud")
public ApiClient externalApiClient() throws IOException {
    KubeConfig kubeConfig = KubeConfig.loadKubeConfig(new FileReader(getConfigFile()));
    log.info("Current Context: Name={}", kubeConfig.getCurrentContext());
    return ClientBuilder
            .kubeconfig(kubeConfig)
            .build();
}

private File getConfigFile() {
    String kubeConfigVar = System.getenv("KUBECONFIG");
    if (StringUtils.isNotBlank(kubeConfigVar)) {
        log.info("Using KUBECONFIG variable: Value='{}'", kubeConfigVar);
        return new File(kubeConfigVar);
    } else {
        File configDir = new File(System.getProperty("user.home"), ".kube");
        File configFile = new File(configDir, "config");
        log.info("Using home file: Path='{}'", configFile.getPath());
        return configFile;
    }
}
```

Notice, the usage of `@Profile` annotations. Also, see how simple the `internalApiClient()` method is. This is because, connecting to Kubernetes API while running inside the cluster itslef is super easy and we will be relying on Kubernetes Role Based Access Control (RBAC) security mechanisms to define which Kubernetes API our app will have access to. Also, the API endpoint, its hostname, port, and the way communication is secured is standard across all distributions of Kubernetes and that is why we didn't have to specify any of that when creating this bean.

These are all the changes needed in our spring-boot application to be able to connect to the Kubernetes API while running inside the cluster itself. Now, we just need to make sure to run with the `cloud` profile when running inside the Kubernetes cluster.

### Packaging spring-boot app in an OCI image

Now that our code is ready to be run inside Kubernetes, we need to package it as an OCI image. We also need to settle on the image name and which image registry the image will be hosted in. For this to happen, we need access to a running docker daemon, be able to to connect to it, and have acsess to an image regitry where our OCI image will be stored. 

> Linux has the capability to run a docker deamon natively. Also, docker-desktop is a good choice for Windows or Mac. Another interesting choice is exposing the docker daemon running inside minikube to the host machine - we will go with that last option.

Since we are using spring-boot version 2.5.4, it is very easy to package up our application as an OCI image. The capability to create OCI images is actually a spring-boot maven/gradle plugin capablity. It has been around since spring-boot version 2.3.0. For earlier versions of spring-boot, the [Jib plugins for maven/gradle](https://github.com/GoogleContainerTools/jib) would have been a good option. In this day and age, rolling your own image with a *Dockerfile* is not worth it for spring-boot applications because of these other options.

We can kill two birds with one stone (only figuratively, we love birds!) by exposing the docker daemon running inside our *minikube* instance. This docker daemon will not only build our app image but will act as the image registry when it is time for Kubernetes to download/run the image - there will be nothing to download as the image will already be there. On Linux and Mac, the following will do the trick:

```shell
eval $(minikube -p minikube docker-env)
```

This command will expose the docker daemon in the current shell only. Next we will pick an image name. Lets say the image name will be `sample/team-apps:1.0`, we will issue the following command to create the image:

```shell
./gradlew bootBuildImage --imageName=sample/team-apps:1.0
```

This will build the app into an executable spring-boot jar, and then bundle it up as a OCI image using the [Paketo Buildpacks](https://paketo.io/). First time run takes a couple of minutes but subsequent image builds only take a few seconds. The output will look something like this for a first time build:

```shell
> Task :bootBuildImage
Building image 'docker.io/sample/team-apps:1.0'

 > Pulling builder image 'docker.io/paketobuildpacks/builder:base' ..................................................
 > Pulled builder image 'paketobuildpacks/builder@sha256:deeb603fef3faa8ef43b04f6d7d284a78a136a0872fcf7d6091f8d5a0a8fecc1'
 > Pulling run image 'docker.io/paketobuildpacks/run:base-cnb' ..................................................
 > Pulled run image 'paketobuildpacks/run@sha256:c6e071ac324b948037be8f950199e765a6b9eccce4e0b74f83f38755d528f534'
 > Executing lifecycle version v0.11.4
 > Using build cache volume 'pack-cache-21ce65b290df.build'

 > Running creator
    [creator]     ===> DETECTING
    [creator]     5 of 18 buildpacks participating
    [creator]     paketo-buildpacks/ca-certificates   2.4.1
    [creator]     paketo-buildpacks/bellsoft-liberica 8.5.0
    [creator]     paketo-buildpacks/executable-jar    5.2.1
    [creator]     paketo-buildpacks/dist-zip          4.2.1
    [creator]     paketo-buildpacks/spring-boot       4.6.0
    [creator]     ===> ANALYZING
    [creator]     Previous image with name "docker.io/sample/team-apps:1.0" not found
    [creator]     ===> RESTORING
    [creator]     ===> BUILDING
    [creator]
    [creator]     Paketo CA Certificates Buildpack 2.4.1
    [creator]       https://github.com/paketo-buildpacks/ca-certificates
    [creator]       Launch Helper: Contributing to layer
    [creator]         Creating /layers/paketo-buildpacks_ca-certificates/helper/exec.d/ca-certificates-helper
    [creator]
    [creator]     Paketo BellSoft Liberica Buildpack 8.5.0
    [creator]       https://github.com/paketo-buildpacks/bellsoft-liberica
    [creator]       Build Configuration:
    [creator]         $BP_JVM_TYPE                 JRE             the JVM type - JDK or JRE
    [creator]         $BP_JVM_VERSION              11.*            the Java version
    [creator]       Launch Configuration:
    [creator]         $BPL_HEAP_DUMP_PATH                          write heap dumps on error to this path
    [creator]         $BPL_JVM_HEAD_ROOM           0               the headroom in memory calculation
    [creator]         $BPL_JVM_LOADED_CLASS_COUNT  35% of classes  the number of loaded classes in memory calculation
    [creator]         $BPL_JVM_THREAD_COUNT        250             the number of threads in memory calculation
    [creator]         $JAVA_TOOL_OPTIONS                           the JVM launch flags
    [creator]       BellSoft Liberica JRE 11.0.12: Contributing to layer
    [creator]         Downloading from https://github.com/bell-sw/Liberica/releases/download/11.0.12+7/bellsoft-jre11.0.12+7-linux-amd64.tar.gz
    [creator]         Verifying checksum
    [creator]         Expanding to /layers/paketo-buildpacks_bellsoft-liberica/jre
    [creator]         Adding 129 container CA certificates to JVM truststore
    [creator]         Writing env.launch/BPI_APPLICATION_PATH.default
    [creator]         Writing env.launch/BPI_JVM_CACERTS.default
    [creator]         Writing env.launch/BPI_JVM_CLASS_COUNT.default
    [creator]         Writing env.launch/BPI_JVM_SECURITY_PROVIDERS.default
    [creator]         Writing env.launch/JAVA_HOME.default
    [creator]         Writing env.launch/JAVA_TOOL_OPTIONS.append
    [creator]         Writing env.launch/JAVA_TOOL_OPTIONS.delim
    [creator]         Writing env.launch/MALLOC_ARENA_MAX.default
    [creator]       Launch Helper: Contributing to layer
    [creator]         Creating /layers/paketo-buildpacks_bellsoft-liberica/helper/exec.d/active-processor-count
    [creator]         Creating /layers/paketo-buildpacks_bellsoft-liberica/helper/exec.d/java-opts
    [creator]         Creating /layers/paketo-buildpacks_bellsoft-liberica/helper/exec.d/jvm-heap
    [creator]         Creating /layers/paketo-buildpacks_bellsoft-liberica/helper/exec.d/link-local-dns
    [creator]         Creating /layers/paketo-buildpacks_bellsoft-liberica/helper/exec.d/memory-calculator
    [creator]         Creating /layers/paketo-buildpacks_bellsoft-liberica/helper/exec.d/openssl-certificate-loader
    [creator]         Creating /layers/paketo-buildpacks_bellsoft-liberica/helper/exec.d/security-providers-configurer
    [creator]         Creating /layers/paketo-buildpacks_bellsoft-liberica/helper/exec.d/security-providers-classpath-9
    [creator]       Java Security Properties: Contributing to layer
    [creator]         Writing env.launch/JAVA_SECURITY_PROPERTIES.default
    [creator]         Writing env.launch/JAVA_TOOL_OPTIONS.append
    [creator]         Writing env.launch/JAVA_TOOL_OPTIONS.delim
    [creator]
    [creator]     Paketo Executable JAR Buildpack 5.2.1
    [creator]       https://github.com/paketo-buildpacks/executable-jar
    [creator]       Class Path: Contributing to layer
    [creator]         Writing env/CLASSPATH.delim
    [creator]         Writing env/CLASSPATH.prepend
    [creator]       Process types:
    [creator]         executable-jar: java org.springframework.boot.loader.JarLauncher (direct)
    [creator]         task:           java org.springframework.boot.loader.JarLauncher (direct)
    [creator]         web:            java org.springframework.boot.loader.JarLauncher (direct)
    [creator]
    [creator]     Paketo Spring Boot Buildpack 4.6.0
    [creator]       https://github.com/paketo-buildpacks/spring-boot
    [creator]       Creating slices from layers index
    [creator]         dependencies
    [creator]         spring-boot-loader
    [creator]         snapshot-dependencies
    [creator]         application
    [creator]       Launch Helper: Contributing to layer
    [creator]         Creating /layers/paketo-buildpacks_spring-boot/helper/exec.d/spring-cloud-bindings
    [creator]       Spring Cloud Bindings 1.8.0: Contributing to layer
    [creator]         Downloading from https://repo.spring.io/release/org/springframework/cloud/spring-cloud-bindings/1.8.0/spring-cloud-bindings-1.8.0.jar
    [creator]         Verifying checksum
    [creator]         Copying to /layers/paketo-buildpacks_spring-boot/spring-cloud-bindings
    [creator]       Web Application Type: Contributing to layer
    [creator]         Reactive web application detected
    [creator]         Writing env.launch/BPL_JVM_THREAD_COUNT.default
    [creator]       4 application slices
    [creator]       Image labels:
    [creator]         org.springframework.boot.version
    [creator]     ===> EXPORTING
    [creator]     Adding layer 'paketo-buildpacks/ca-certificates:helper'
    [creator]     Adding layer 'paketo-buildpacks/bellsoft-liberica:helper'
    [creator]     Adding layer 'paketo-buildpacks/bellsoft-liberica:java-security-properties'
    [creator]     Adding layer 'paketo-buildpacks/bellsoft-liberica:jre'
    [creator]     Adding layer 'paketo-buildpacks/executable-jar:classpath'
    [creator]     Adding layer 'paketo-buildpacks/spring-boot:helper'
    [creator]     Adding layer 'paketo-buildpacks/spring-boot:spring-cloud-bindings'
    [creator]     Adding layer 'paketo-buildpacks/spring-boot:web-application-type'
    [creator]     Adding 5/5 app layer(s)
    [creator]     Adding layer 'launcher'
    [creator]     Adding layer 'config'
    [creator]     Adding layer 'process-types'
    [creator]     Adding label 'io.buildpacks.lifecycle.metadata'
    [creator]     Adding label 'io.buildpacks.build.metadata'
    [creator]     Adding label 'io.buildpacks.project.metadata'
    [creator]     Adding label 'org.springframework.boot.version'
    [creator]     Setting default process type 'web'
    [creator]     Saving docker.io/sample/team-apps:1.0...
    [creator]     *** Images (47750fba3362):
    [creator]           docker.io/sample/team-apps:1.0

Successfully built image 'docker.io/sample/team-apps:1.0'

BUILD SUCCESSFUL in 1m 47s
```

There is a lot that went on with that image build - all the heavy lifting was done by the buildpacks. We will leave the details of using buikdpacks for to build app images for a future post.

### Setup RBAC in Kubernetes

To keep things simple, we will run our app in the same namespace (`dev`) that our sample apps from [Kubernetes with Java - Introduction](../2021-08-27-show-deployments) post were running in. The details of the Kubernetes RBAC mechanism is described very well in the [official Kubernetes documentation](https://kubernetes.io/docs/reference/access-authn-authz/rbac/) but we will just go over the  highlights here.

We need to create a *Role* and a *ServiceAccount* first. Then create a *RoleBinding* to link the *Role* and *ServiceAccount* together. A *ServiceAccount* can be associated with many *Role* objects, the reverse is true as well. All three of these resources are configured using YAML definitions with `kubectl`. They are included in the source code in the `k8s` directory as `rbac.yaml`. Apply them to the cluster using the following command (assuming that we are running from the root of the project):

```shell
kubectl apply -f k8s/rbac.yaml
```

The `rbac.yaml` contents look like:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: team-apps
  namespace: dev
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: team-apps-role
  namespace: dev
rules:
  - apiGroups:
      - apps
    resources:
      - deployments
    verbs:
      - watch
      - get
      - list
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-apps-role-binding
  namespace: dev
subjects:
  - kind: ServiceAccount
    name: team-apps
    namespace: dev
roleRef:
  kind: Role
  name: team-apps-role
  apiGroup: rbac.authorization.k8s.io
```

The *service-account* definition is just a name at this point. The *role* is where the Kubernetes API permissions are defined. In this case, we are only allowing watch, get, and list operations for the *deployment* resources. The *deployment* resources are part of the `apps` API group - this is the same reason when we dealt with the `V1Deployment` objects in Java, we got hold of them using the `AppsV1Api.listNamespacedDeployment*()` method. Finally, the *role-binding* binds the *role* and *service-account* together.

### Deploy the app in Kubernetes

The source code includes the `app.yaml` file in `k8s` directory. This file includes the *Deployment* and *Service* resource definitions that we need to apply using `kubectl`. The command will look like the following:

```shell
kubectl apply -f k8s/app.yaml
```

The contents of `app.yaml` look like:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: team-apps
  namespace: dev
spec:
  replicas: 1
  selector:
    matchLabels:
      app: team-apps
  template:
    metadata:
      labels:
        app: team-apps
    spec:
      serviceAccountName: team-apps
      restartPolicy: Always
      containers:
        - name: app
          image: example/team-apps:1.0
          env:
            - name: SPRING_PROFILES_ACTIVE
              value: cloud,async
          ports:
            - name: web
              containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: team-apps-service
  namespace: dev
spec:
  selector:
    app: team-apps
  ports:
    - port: 8181
      targetPort: web

```

Notice the usage of `serviceAccountName` in the *deployment* manifest. Without speciying that, our app will not have permissions to use the Kubernetes API when running inside the cluster. Also, notice that we supplied the `SPRING_PROFILES_ACTIVE` environment variable be set to `cloud,async` so those Spring profiles are active when the app starts up.

#### Accessing the *team-apps* API

If you want to access the API inside the cluster and you are trying to do it from a pod running in the `dev` namesapce then the URL would simply be - `http://team-apps-service:8181`

If you want to access the API inside the cluster but you are trying to do it from a pod running in a namespace other than `dev` then the URL would be - `http://team-apps-service.dev.svc.cluster.local:8181`

If you want to access the API from outside the cluster, there are a lot more options and complexities to be considered. But the easiest way to verify that the service is properly working is simply setting up a *port-forward* - which can be done with the following command:

```shell
kubectl port-forward service/team-apps-service -n dev 8282:8181
```
This will make port `8282` on localhost forward to port `8181` on the `team-apps-service` service, which will then forward the request to port `8080` on the app container.  

> The decision to use different ports (8080, 8181, 8282) is just for demonstration purposes. It is to show the levels of port-forwarding or proxying that is involved in this way of accessing our app
