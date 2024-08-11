---
title: Kubernetes with Java - Introduction
author: Salman Malik
subtitle: Getting started with the Kubernetes API client libraries for Java
date: 2021-08-27
tags: ["java", "kubernetes", "spring-boot"]
---

### What are we going to do?  

 - Learn how to initialize the k8s api client in a java spring-boot application
 - Extract metadata from deployments in a namespace and transform that metadata into new views  
 - Prepare you for more sophisticated problem solving using the k8s API in future articles

### Motivation

- You have a few dozen different applications (as Kubernetes deployment resources) running in your cluster
- All of those applications use labels to designate the name of the team that manages that application, and the application name
- You want to provide APIs that:
  - Lists all teams that have applications running in the cluster
  - Lists all apps that belong to a team

### Scenario

Assumption: you have minikube locally and you don't already have a namespace called `dev`. First, let's create the namespace where we will start our sample applications:

```shell
kubectl create namespace dev
```

Now, let's create some deployments to model lots of different teams with lots of apps. This creates 5 teams with 9 applications each (petnames.txt contains 50 petnames). 

```shell
curl -Lo petnames.txt https://fnjoin.com/data/2021-08-21-show-pods-petnames.txt 
cat petnames.txt | paste - - - - - - - - - - | \
while read line ; do 
  set -- $line
  team=team-$1
  shift
  for app ; do 
    app=app-$app
    kubectl create deployment $app --image=k8s.gcr.io/echoserver:1.4 -n dev
    kubectl label deployment $app team=$team -n dev
  done
done
```

Once that completes you'll have 45 echoservers running. Running `kubectl get deployments -n dev` would reveal output like:

```shell
NAME                         READY   UP-TO-DATE   AVAILABLE   AGE
app-acaroid-emilee           0/1     1            0           47s
app-ageless-lynna            0/1     1            0           35s
app-airless-jettie           0/1     1            0           12s
app-announceable-yasmin      0/1     1            0           18s
app-apocopic-chanel          0/1     1            0           27s
app-benmost-rudy             0/1     1            0           39s
app-blastular-sparkle        0/1     1            0           29s
app-bromidic-kamden          0/1     1            0           23s
app-buggier-helga            0/1     1            0           32s
app-bullheaded-tran          0/1     1            0           19s
....
```

------

If you wanted to get more information about the deployments, you could get the output of the above command in JSON format and transform it with something like [jq](https://stedolan.github.io/jq/) to get the relevant information out like so:

```shell
kubectl get deployments -n dev -o json | jq '[ .items[] | { name: .metadata.labels.app, team: .metadata.labels.team, readyInstances: .status.readyReplicas }]'
``````

This command will transform the information from `kubectl` to show a list of apps along with their team names, and how many instances of each are ready. This capability to access Kubernetes information from CLI is very powerful on its own but we want to provide this information through an API since most people in our fictional organization won't have access to run the `kubectl` commands against the cluster for security reasons.

>This is a contrived example, as almost all Kubernetes platforms make some kind of dashboard available that let you view resources in the cluster along with their labels. This example mainly shows you how one would go about interacting with the Kubernetes API using Java.

### Introducing the Kubernetes Java Client libraries

Kubernetes API clients are published in multiple languages. The [Java version of these libraries](https://github.com/kubernetes-client/java) are published in public maven repositories. As of this writing, version `13.0.0` is the latest version available. Depending on which version of Kubernetes cluster you will be targeting, it is advisable to check the official [compatibility matrix](https://github.com/kubernetes-client/java/wiki/2.-Versioning-and-Compatibility). If using gradle, you can add the following dependency to your `build.gradle`:

```groovy
implementation 'io.kubernetes:client-java-extended:13.0.0'
```

If using maven, then add the following dependency to `pom.xml`:

```xml
<dependency>
    <groupId>io.kubernetes</groupId>
    <artifactId>client-java-extended</artifactId>
    <version>13.0.0</version>
</dependency>
```

### Initializing the client

Before using the Kubernetes client, we need to initialize it by letting it know how to connect to the Kubernetes cluster's API server. There are two variations of this. Either we will be running this app inside the Kubernetes cluster as a pod itself or we will be running outside of the cluster we want to target. In either case `io.kubernetes.client.openapi.ApiClient` encapsulates that connection.

We will leave the details on how to initialize the client when running inside a Kubernetes cluster for a [later post](../2021-09-11-running-in-cluster). When running this app outside a Kubernetes cluster, we will use the same mechanism `kubectl` uses to connect to a remote Kubernetes cluster. The following code will instantiate a spring bean of type `ApiClient`:

```java
import io.kubernetes.client.openapi.ApiClient;
import io.kubernetes.client.util.ClientBuilder;
import io.kubernetes.client.util.KubeConfig;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.File;
import java.io.FileReader;
import java.io.IOException;

@Slf4j
@Configuration
public class ApiClientConfig {

    @Bean
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
}
```

### Use the client to lookup the deployments

Now that we have the *api-client*, we are ready to lookup the *deployments* metadata. Here we will make some assumptions:

- We are only interested in deployments running in the `dev` namespace
- We are only interested in deployments containing `app` and `team` labels
- We are interested in the following attributes of the deployments:
  - App name
  - Team that app belongs to
  - How many instances/replicas of that app are running/ready

We will first declare a Java bean that will hold the information about a running application, lets call it `TeamApp`. We are using [project Lombok](https://projectlombok.org/) to cut down on boiler-plate code here. We will also be using the [*builder* pattern](https://blogs.oracle.com/javamagazine/java-builder-pattern-bloch) for this bean:

```java
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class TeamApp {
    String name;
    String team;
    int readyInstances;
}
```

We will declare an interface that is the contract for our API. One method will provide the names for teams that have applications running in the cluster. The other method will return list of *team-app* objects for a given team. the interface will look like:

```java
import java.util.List;
import java.util.Set;

public interface TeamAppsService {

    String APP_LABEL = "app";
    String TEAM_LABEL = "team";

    Set<String> listTeams();
    List<TeamApp> listTeamApps(String team);
}
```

Next we will create an implementation of this interface and expose it as spring bean:

```java
import io.kubernetes.client.openapi.ApiClient;
import io.kubernetes.client.openapi.apis.AppsV1Api;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class SynchronousTeamAppsService implements TeamAppsService {

    private final AppsV1Api appsV1Api;
    private final String namespace;

    public SynchronousTeamAppsService(
            ApiClient client,
            @Value("${namespace}") String namespace) {
        
        log.info("Creating synchronous team-app service, Namespace={}", namespace);
        this.appsV1Api = new AppsV1Api(client);
        this.namespace = namespace;
    }

    ...
}
```

In the constructor above, *api-client* bean is injected by Spring, which is used to create an `AppsV1Api` object - this is the object we will be dealing with to access *app* level Kubernetes objects like  `Deployment` and `StatefulSet` among others. There are other *API* objects in the `io.kubernetes.client.openapi.apis` package that deal with other kinds of built-in Kubernetes objects. For example, we can use `CoreV1Api` to deal with `Pod`, `ConfigMap`, `Secret`, and `Service`.

Next is the `namespace` variable that is injected into this bean by Spring. The `application.properties` file in the project sets this value as `dev` but it can be overridden at runtime through various Spring Framework means. 

```java
public Set<String> listTeams() {
    return appsV1Api.listNamespacedDeployment(
                    namespace,
                    null,
                    null,
                    null,
                    null,
                    TEAM_LABEL,
                    null,
                    null,
                    null,
                    null,
                    null)
            .getItems()
            .stream()
            .map(deployment -> deployment.getMetadata().getLabels().get("team"))
            .collect(Collectors.toSet());
}
```

The star of this functionality is the `AppsV1Api.listNamespacedDeployment()` call with lots of `null` values being passed in. To understand what these values are, here is the source code of this method's signature from the library:

```java
public V1DeploymentList listNamespacedDeployment(
        String namespace,
        String pretty,
        Boolean allowWatchBookmarks,
        String _continue,
        String fieldSelector,
        String labelSelector,
        Integer limit,
        String resourceVersion,
        String resourceVersionMatch,
        Integer timeoutSeconds,
        Boolean watch)
        throws ApiException {
    ...
}
```

This Java API mimics the Kubernetes API very closely. All these arguments are meant for more advanced usages, but for our purposes, supplying `namespace` and `labelSelector` parameters are sufficient. The `labelselector` parameter is a string that can be formatted according to the [official documentation](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/#label-selectors). We will supply the label name of `team` as the value for that parameter. This ensures that returned pods will have that label present no matter what the label values are.

This method returns a `V1DeploymentList` which has the `getItems()` method which can give us a list of `V1Deployment` objects. Once we have that list, we can use the Java stream mechanism to transform each object to a team name, adding them to a Java *set* which will take care of duplicates. Like the `V1Deployment` object, most Kubernetes built-in resources have a corresponding class in the `io.kubernetes.client.openapi.models` package.

> There is a pattern at play here. In the *api* object you'll find methods of the form `listNamespacedSomething()` that pretty much takes this exact set of arguments. It returns a `V1SomethingList` object which has a `getItems()` method that returns a list of `V1Something` objects.

Finally, we need to implement the `TeamAppsService.listTeamApps()` method. It will use the same *api* call but instead of mapping `V1Deployment` to a team name, it will map them to `TeamApp` objects. The relevant code will look like:

```java
public List<TeamApp> listTeamApps(String team) {
    return appsV1Api.listNamespacedDeployment(
                    namespace,
                    null,
                    null,
                    null,
                    null,
                    TEAM_LABEL + "=" + team,
                    null,
                    null,
                    null,
                    null,
                    null)
            .getItems()
            .stream()
            .map(this::toTeamApp)
            .collect(Collectors.toList());
}

private TeamApp toTeamApp(V1Deployment v1Deployment) {
    return TeamApp.builder()
            .name(v1Deployment.getMetadata().getLabels().get(APP_LABEL))
            .team(v1Deployment.getMetadata().getLabels().get(TEAM_LABEL))
            .readyInstances(v1Deployment.getStatus().getReadyReplicas())
            .build();
}
```

Also, notice that the `labelSelector` argument is of the form `team=TEAM_NAME`. This will ensure we only get *deployment* objects belonging to the given team.

### Using the service to serve the results

At this point, we can use this *service* bean to lookup the information. We will introduce a *controller* to front this *service* functionality. The *controller* can look like this:

```java
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Set;

@RestController
@RequiredArgsConstructor
public class TeamAppsController {

    private final TeamAppsService service;

    @GetMapping("/teams")
    private Set<String> listTeams() {
        return service.listTeams();
    }

    @GetMapping("/teams/{team}/apps")
    private List<TeamApp> listTeamApps(@PathVariable String team) {
        return service.listTeamApps(team);
    }
}
```

Notice the use of `@RequiredArgsConstructor` annotation. It is another time saver from project Lombok. It generates a class constructor that accepts parameters for all `private final` variables in the class and sets them accordingly. Spring then notices this constructor and has no choice but to inject the matching required beans. Even though our service implementation class is `SynchronousTeamAppsService`, spring will inject it for the `service` variable since that bean implements the `TeamAppsService` interface.

### Whats next

The APIs we used above make synchronous calls to the Kubernetes API server. In a [future post](../2021-09-08-show-deployments-async), we will explore how to enable the same functionality using asynchronous mechanisms provided by the Kubernetes API. 

### Conclusion

In this post we introduced the [Kubernetes Java Client](https://github.com/kubernetes-client/java). It is relatively easy to use the library to automate, monitor, and/or extend the Kubernetes platform. Most of the community uses *Go* programming language for these purposes and there are lots of good reasons to do that. Fast startup times, small footprint native executables, efficient threading support, etc.

Java programs can achieve all these qualities as well. Java has a large open-source libraries ecosystem and the collective community has vast experience in designing resilient and scalable systems. The prevalence of spring-boot, reactive programming, and upcoming [native-image capabilities with GraalVM](https://www.graalvm.org/reference-manual/native-image/) are good indicators that Java will stay relevant even in the Kubernetes ecosystem.

### Referenced Code

To see working code from this post (with slight modifications), see the [Git repository](https://github.com/fnjoin/blog-team-apps).