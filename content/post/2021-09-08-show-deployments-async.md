---
title: Kubernetes with Java - Asynchronous APIs
subtitle: Choosing between synchronous and asynchronous Kubernetes API in Java
author: Salman Malik
date: 2021-09-08
tags: ["java", "kubernetes", "spring-boot", "asynchronous"]
---

### What are we going to do?  

This post builds on top of [Kubernetes with Java - Introduction](../2021-08-27-show-deployments) which relied on synchronous Kubernetes API to get information for apps runnings in Kubernetes cluster. In this post, we will 
 
 - Learn when to use synchronous and when to use asynchronous Kubernetes API mechanisms
 - Learn how to use asynchronous Kubernetes API to exrtact deployments metadata
 - How to use spring-boot profiles to conditionally enable functionality 

### Synchronous vs asynchronous APIs

Kubernetes API provides two mechanisms to consume information for the clients. The synchronous API is appropriate when you want to access the Kubernetes API infrequently or if it changes rarely on the cluster. As you can imagine, the more requests we make to our app, the more requests it will make to the Kubernetes API, putting pressure on the cluster while it is trying to deal with managing app workloads. This interaction can be visulized like:

{{< figure src="/img/show-deployments-async/synchronous-call.jpg" alt="Synchronous Call to Kubernetes API" >}}

The asynchronous API is more appropriate if our app will be accessing the Kubernetes API very frequently. In this scenario, the client (our application) subscribes to change events - also known as creating a *watch*. The client can then react to these changes in near real-time or simply cache the information locally to use later. This kind of interaciton can be visualized like so:

{{< figure src="/img/show-deployments-async/asynchronous-call.jpg" alt="Asynchronous Call to Kubernetes API" >}}

### Using the asynchronous API

The two additional objects we will be dealing with will be `io.kubernetes.client.informer.SharedIndexInformer` and `io.kubernetes.client.informer.cache.Indexer`. The *informer* object is roughly responsible for requesting to watch the *deployment* listing from the Kubernetes API and then dealing with the change events as they happen in the cluster. The *indexer* on the other hand is like a local cache of the *deployment* list and is updated by the *informer*. Our app will be asking the *indexer* to list the *deployments* when we want to see it and it will serve them from its cache.

#### Creating the *informer-factory*

To create the *informer* we need to first instantiate a `SharedInformerFactory` using the *api-client*. We can do that by creating a new spring bean in our `ApiClientConfig` class like so:

```java
@Bean
public SharedInformerFactory sharedInformerFactory(ApiClient apiClient) {
    return new SharedInformerFactory(apiClient);
}
```

#### Creating the *informer* and *indexer*

Next, we will create a new service class called `AsynchronousTeamAppsService` which implements `TeamAppsService`.

> In the [previous post](../2021-08-27-show-deployments), we created a `SynchronousTeamAppsService` class which  also implemented the `TeamAppsService` interface. That class interacted with the Kubernetes API in a synchronous manner. Normally, you would chose only one way to access the Kubernetes API based on your use case.

We will then need to inject *api-client*, *informer-factory*, and the *namespace* objects in our servie instance.

```java
import io.kubernetes.client.informer.SharedIndexInformer;
import io.kubernetes.client.informer.SharedInformerFactory;
import io.kubernetes.client.informer.cache.Indexer;
import io.kubernetes.client.openapi.ApiClient;
import io.kubernetes.client.openapi.apis.AppsV1Api;
import io.kubernetes.client.openapi.models.V1Deployment;
import io.kubernetes.client.openapi.models.V1DeploymentList;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
public class AsynchronousTeamAppsService implements TeamAppsService {

    private final Indexer<V1Deployment> indexer;
    private final SharedIndexInformer<V1Deployment> informer;

    public AsynchronousTeamAppsService(
            ApiClient client,
            SharedInformerFactory informerFactory,
            @Value("${namespace}") String namespace) {
        
        log.info("Creating asynchronous team-app service, Namespace={}", namespace);
        AppsV1Api appsV1Api = new AppsV1Api(client);
        
        informer = informerFactory.sharedIndexInformerFor(params -> appsV1Api.listNamespacedDeploymentCall(
                        namespace,
                        null,
                        null,
                        null,
                        null,
                        TEAM_LABEL,
                        null,
                        params.resourceVersion,
                        null,
                        params.timeoutSeconds,
                        params.watch,
                        null),
                V1Deployment.class,
                V1DeploymentList.class);
        indexer = informer.getIndexer();
    }
```

In the code above, the *informer* and *indexer* are setup in our service constructor. Notice, the arguments to the informer are almost the same as our earlier synchronous service calls. We need to keep the reference to the *informer* object so that we can controll the background event synchronization. We will do that through spring bean lifecycle annotations like so:

```java
    @PostConstruct
    public void init() {
        informer.run();
    }

    @PreDestroy
    public void destroy() {
        informer.stop();
    }
```

#### Listing all teams

Now that we have the *informer* synchronizing with the Kubernetes API in the background and feeding the *indexer* cache - we need to implement the `listTeams()` method. 

```java
public Set<String> listTeams() {
    return indexer.list()
            .stream()
            .map(deployment -> deployment.getMetadata().getLabels().get("team"))
            .collect(Collectors.toSet());
}
```

The *indexer* simply returns a list of `V1Deployment` objects from its `list()` method. Once we have a list, we can use the java stream mechanism to transform each item to a team name, adding them to a java *set* which will take care of duplicates.  

#### Listing *team-apps* for a team 

Implementing the `listTeamApps()` method is pretty simple as well. Since our *indexer* has a list of *ALL* deployments that have the `team` label, we need to filter the stream to only those where the team label's value match our given team. Once the list is filtered, we simply map from `V1Deployment` to `TeamApp` objects. The relavant code will look like:

```java
public List<TeamApp> listTeamApps(String team) {
    return indexer.list()
            .stream()
            .filter(deployment -> team.equals(deployment.getMetadata().getLabels().get("team")))
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

### Using Spring profiles

Now that we have two beans that implement `TeamAppsService` interface and our *controller* is expecting a single instance, we need to instruct Spring to instantiate only one of them. There are lots of ways of doing this - one of them is Spring profiles. By using the `@Profile` annotations, we can controll which bean gets instantiated and hence injected in our controller. The annotation usage will look like following:

```java
@Profile("async")
public class AsynchronousTeamAppsService implements TeamAppsService { ... }
```

... and 

```java
@Profile("!async")
public class SynchronousTeamAppsService implements TeamAppsService { ... }
```

When running with `async` spring profile, the `AsynchronousTeamAppsService` bean will get instantiated and `SynchronousTeamAppsService` will not. If not running with that profile (when not specified, `default` profile is in effect), the opposite will be true. A very thorough write up on Spring Profiles can be [found here](https://www.baeldung.com/spring-profiles). 

### Conclusion

In this post we introduced the asynchronous APIs so that we can use the *informer* and *indexer* mechanisms to cache *deployment* object metadata in the background within our app. In a future post, we might look at how to listen to the change events and react to them in near real-time.

### Referenced Code

To see working code from this post (with slight modifications), see the [Git repository](https://github.com/fnjoin/blog-team-apps).