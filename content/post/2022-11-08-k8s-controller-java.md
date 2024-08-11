---
title: Kubernetes Controller Pattern Example with Java and MySQL
subtitle: A controller written in Java that creates MySQL databases in a Kubernetes cluster
author: Salman Malik
date: 2022-11-08
tags: ["java", "kubernetes", "spring-boot", "api-events", "controller", "mysql"]
---

This post is a continuation of [Kubernetes with Java - Handling Events](../2022-01-03-k8s-event-handling) which showed us how to subscribe to API events for a given type of Kubernetes resource and deal with them in near real-time. In this post, we will learn how to use that capability along side other client machinery components to write a Kubernetes controller.

## What are we trying to do

For this post, our goal is to make it easier to create multiple MySQL database instances in a Kubernetes cluster. To do that manually, one would need to create/maintain the following built-in Kubernetes resources for each database:

- A *StatefulSet* resource that will create a *Pod* with a *PersistentVolume* so that we don't lose our database data
- A *Service* resource to front MySQL *Pod* with a consistent DNS name
- A *Secret* resource that will keep the connection and credentials information to connect to that database instance

To support having databases of varying capabilities, we would need to parameterize CPU, memory, and storage requirements for each database.

## Attempt at defining Kubernetes

Before we work towards our goal, we need to step back and understand how Kubernetes fundamentally works. At the simplest level, Kubernetes is a platform consisting of an API server which handles CRUD operations for lots of resource types. In reponse to the CRUD operations, after storing the state of resources in an internal database (*etcd*), the API server publishes events describing the change to those resources. Those events are subscribed by other components that come bundled with every Kubernetes cluster called **controllers**. The controllers handle the lifecycle of the resource type they were written for and issue CRUD commands through the API server to change the state of their own resource or child resources.

> For example, a **ReplicaSet** controller will NOT only listen to events for its own resource type but will also be listening to events for **Pod** resources. It will probably ask the API server to create or delete **Pod** resources as it tries to reconcile what **Pod** resources are presently running and what was specified in the **ReplicaSet** definition.

In addition to the built-in resources like *Pod*, *ReplicaSet*, or *Deployment*, Kubernetes allows you to extend its functionality by registering your own custom-resource types and controllers to handle their lifecycles. The custom-resource are represented by a *CustomResourceDefinition* resource (aka *CRD*) and describes the group, kind, version, spec, and status sections of the custom-resource. In addition, *printer-column* attributes are also defined in the *CRD*. `kubectl` and other tools like it ([k9s](../2022-02-07-fav-k8s-cli-tool)) use these attributes to show a summary of the resource.

## Back to solving our problem

We will define and register a custom-resource of type *Mysql* with our cluster. This custom-resource will allow us to define a database with set CPU, memory, and storage resources. Also, like all other Kubernetes resources types, there will be a place to store the current status in the custom-resource. We will also need to create a controller which uses the Kubernetes Client machinery to implement the Kubernetes controller pattern so it can  handle the lifecycle of *Mysql* resources.

> We will not be producing a production grade MySQL controller/operator. It will be missing a lot of features which for example [MySQL Operator for kubernetes](https://dev.mysql.com/doc/mysql-operator/en/mysql-operator-introduction.html) or [VMware Tanzu SQL with MySQL for Kubernetes](https://docs.vmware.com/en/VMware-Tanzu-SQL-with-MySQL-for-Kubernetes/index.html) provide. Those features include ability to have read replicas, perform automated backups, provide seamless version upgrades, etc. Instead, our goal is to showcase how to write a controller using Kubernetes Client for Java and spring-boot which does something useful.

Our *Mysql* CRD is defined as:

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: mysqls.fnjoin.com
spec:
  scope: Namespaced
  group: fnjoin.com
  names:
    plural: mysqls
    singular: mysql
    kind: Mysql
  versions:
    - name: v1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                cpu:
                  type: string
                memory:
                  type: string
                storage:
                  type: string
            status:
              type: object
              properties:
                ready:
                  type: boolean
                conditions:
                  type: array
                  items:
                    type: object
                    properties:
                      type:
                        type: string
                      status:
                        type: string
                      lastTransitionTime:
                        type: string
                        format: date-time
      additionalPrinterColumns:
        - name: storage
          type: string
          jsonPath: .spec.storage
          description: Storage capacity allocated
        - name: memory
          type: string
          jsonPath: .spec.memory
          description: Memory allocated
        - name: cpu
          type: string
          jsonPath: .spec.cpu
          description: CPU millis allocated
        - name: ready
          type: string
          jsonPath: .status.ready
          description: Is MySql resource ready
```

In addition to what is described above, our resource will also include a *metadata* section. The *metadata* section is inherited by all Kubernetes resources, it has a standard structure, and we don't need to define it in our *CRD*. With this *CRD* applied to the cluster, we can define a `Mysql` resource like:

```YAML
apiVersion: fnjoin.com/v1
kind: Mysql
metadata:
  name: db-1
spec:
  storage: 256Mi
  memory: 128Mi
  cpu: 250m

```

Notice that our *CRD* defined a *status* section but we didn't set any *status* details ourselves when creating a `Mysql` resource. Maintaining the *status* section of a resource is one of the main things a controller takes care of. Our controller will also do that. The other thing that our controller needs to do is to create and maintain child resources when needed.

Before we look into what goes inside the controller, lets visualize how our controller will interact with other components in the Kubernetes cluster, see the following diagram:

{{< figure src="/img/k8s-controller-java/overview.jpg" alt="Kubernetes Server Components Overview" >}}

## Kubernetes Client machinery involved

What goes into creating the controller? We already know about the *Informer* and the associated *Indexer* objects from our [previous post](../2022-01-03-k8s-event-handling). Once setup, these objects listen to incoming API events when the Kubernetes API server adds, deletes, or changes any resources we are interested in. In addition, we will now introduce *WorkQueue*, *Reconciler*, and *Controller* objects.

The *WorkQueue* object acts as the recipient of events coming from the *Informer*. The *WorkQueue* intentionally loses all details from the events it recieves and converts them into *Request* objects which only have two attributes: *namespace* and *name*. This allows the *WorkQueue* to also apply rate-limiting logic to squash multiple events refering to the same entity as one.

> An interesting thing to note is that Kubernetes team publishes client libraries in multiple languages and use the same terms in all of the libraries. So for example, a **WorkQueue** works the same way no matter which language client library you use.

The *Reconciler* then uses the *WorkQueue* as its input and tries to reconcile the world everytime it gets a *Request* from the *WorkQueue*.

Finally, a *Controller* is composed of all of the above objects and works with a *java.util.concurrent.ExecutorService* to perform its work in a multi-threaded environment. The controller will also implement a leader-election mechanism to make sure that only a single instance of the controller can reconcile the world. It would be chaos otherwise.


## Code Organization

While creating this controller, we realized that a lot of what goes into creating a controller can be categorized as boiler-plate. So we organized the boiler-plate code in a `com.fnjoin.k8s.controller.customresource.base` package. All the controller code specific to our `Mysql` custom-resource went in the `com.fnjoin.k8s.controller.customresource.mysql` package. See how the code is laid out:

{{< figure src="/img/k8s-controller-java/code-organization.png" alt="Code Organization" >}}

> Perhaps, in the future the `base` package can be bundled as a library.

## Initializing the Controller

With the Kubernetes Client machinery discussed earlier, we can visualize the initialization of a controller like so:

{{< figure src="/img/k8s-controller-java/initializing.jpg" alt=" Initializing the Controller" >}}

The `init(...)` method from our abstract controller (`CustomResourceController`) looks like:

```Java
public void init(int workerCount, String kind, ChildResourceListener... childListeners) {

    // Create the informer
    SharedIndexInformer<O> informer =
            connection.getSharedInformerFactory().sharedIndexInformerFor((CallGeneratorParams params) -> connection.getCustomObjectsApi().listClusterCustomObjectCall(group,
                            version,
                            plural,
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            params.resourceVersion,
                            null,
                            params.timeoutSeconds,
                            params.watch,
                            null),
                    objectClass,
                    listClass);
    indexer = informer.getIndexer();

    // setup the informer to add requests to work-queue when events are received
    RateLimitingQueue<Request> workQueue = new DefaultRateLimitingQueue<>();
    informer.addEventHandler(new CustomResourceEventHandler<>(workQueue));

    // initialize child listeners to inform work-queue on child-resource events
    for (ChildResourceListener childListener : childListeners) {
        childListener.initInformer(connection, workQueue, group + "/" + version, kind);
    }

    // creating the internal controller
    controller = new LeaderElectingController(getLeaderElector(),
            ControllerBuilder.defaultBuilder(connection.getSharedInformerFactory())
                    .withReconciler(new CustomResourceReconciler(connection,
                            objectMapper,
                            group,
                            plural,
                            version,
                            this))
                    .withWorkQueue(workQueue)
                    .withWorkerCount(workerCount)
                    .withReadyFunc(() -> informer.hasSynced() && Arrays.stream(childListeners)
                            .allMatch(listener -> listener.hasSynced()))
                    .build());

}

private LeaderElector getLeaderElector() {

    // setup leader-election so only one controller instance handles reconciliation
    LeaseLock lock = new LeaseLock(connection.getSpace(),
            objectClass.getSimpleName().toLowerCase() + "-controller-leader",
            connection.getInstanceIdentity(),
            connection.getApiClient());

    // See 'LeaderElectionConfig' section at https://github.com/kubernetes/client-go/blob/master/tools/leaderelection/leaderelection.go
    return new LeaderElector(new LeaderElectionConfig(lock,
            Duration.ofSeconds(30),
            Duration.ofSeconds(15),
            Duration.ofSeconds(5)));
}
```

Our controller reconciles the state of `Mysql` resources when it receives API events from the Kubernetes API server. It creates *StatefulSet*, *Service*, and *Secret* child resources in response to `Mysql` resource being created. It also makes sure that those child resources stay available. To do that, it needs to listen for events for those child resources. Looking at the code above we can visualize how multiple *Informers* feed events into a single *WorkQueue*:

{{< figure src="/img/k8s-controller-java/events.jpg" alt="Populating the WorkQueue" >}}

## The Generic Reconciler logic

For every *Request* in the *WorkQueue*, our controller's reconcile logic compares the state of `Mysql` resource with the reality. For example, if it finds that a *StatefulSet* doesn't exist in the cluster, it needs to create it. Also, it needs to indicate that state in the *Status* section of our *Mysql* resource. The reconciler logic can be visualized like so:

{{< figure src="/img/k8s-controller-java/reconcile.jpg" alt="Reconciler Logic" >}}

The reconciler logic at a high level is not very different from what reconcilers for other resource types might need to implement. So we created a generic `CustomResourceReconciler` which implements the logic in a generic fashion. It looks like:

```java
import com.fnjoin.k8s.controller.config.KubernetesConnection;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.kubernetes.client.common.KubernetesListObject;
import io.kubernetes.client.extended.controller.reconciler.Reconciler;
import io.kubernetes.client.extended.controller.reconciler.Request;
import io.kubernetes.client.extended.controller.reconciler.Result;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import java.util.Optional;

@RequiredArgsConstructor
public class CustomResourceReconciler<O extends CustomResource<O>, L extends KubernetesListObject> implements Reconciler {

    private final CustomResourceController<O, L> controller;

    @Override
    public Result reconcile(Request request) {
        try {
            Optional<O> obj = controller.find(request.getNamespace(), request.getName());
            if (obj.isPresent()) {
                
                O original = obj.get();
                String uid = original.getMetadata().getUid();

                boolean resourceInDesiredState = controller.isResourceInDesiredState(uid, original);
                boolean statusChangeNeeded = false;

                if (resourceInDesiredState) {
                    statusChangeNeeded = controller.isStatusChangeNeeded(uid, original);
                }

                if (!resourceInDesiredState || statusChangeNeeded) {
                    
                    // apply the changes here
                    O changed = controller.applyChanges(uid, original.deepCopy());
                    controller.applyStatusChanges(changed);

                    String resourceVersion = original.getMetadata().getResourceVersion();
                    replaceExisting(resourceVersion, changed);
                    return new Result(true);
                }
            }
        } catch (Throwable e) {
            return new Result(true);
        }
        return new Result(false);
    }

    @SneakyThrows
    public void replaceExisting(String resourceVersion, O applied) {
        applied.getMetadata().setResourceVersion(resourceVersion);
        connection.getCustomObjectsApi().replaceNamespacedCustomObject(group,
                version,
                applied.getMetadata().getNamespace(),
                plural,
                applied.getMetadata().getName(),
                applied,
                null,
                null);
    }
}
```
In the above code, all error handling and logging logic was removed to not distract from the core concepts - they are still present in the actual working code. 

## `Mysql` custom-resource in Java

With the base package present, we need to implement the `CustomResource` interface to represent our custom-resource. Here is what that looks like:

```Java
import io.kubernetes.client.common.KubernetesObject;

public interface CustomResource<T> extends KubernetesObject {
    T deepCopy();
}
```

With the implementation being `MysqlCustomResource` class and it looks like:

```Java
import com.fnjoin.k8s.controller.customresource.base.CustomResource;
import io.kubernetes.client.common.KubernetesListObject;
import io.kubernetes.client.openapi.models.V1Condition;
import io.kubernetes.client.openapi.models.V1ListMeta;
import io.kubernetes.client.openapi.models.V1ObjectMeta;
import io.kubernetes.client.openapi.models.V1ObjectMetaBuilder;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MysqlCustomResource implements CustomResource<MysqlCustomResource> {

    String apiVersion;
    String kind;
    V1ObjectMeta metadata;
    Spec spec;
    Status status;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Spec {
        String storage;
        String memory;
        String cpu;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Status {
        boolean ready;
        java.util.List<V1Condition> conditions;
    }

    @Data
    public static class List implements KubernetesListObject {
        java.util.List<MysqlCustomResource> items;
        String apiVersion;
        String kind;
        V1ListMeta metadata;
    }

    @Override
    public MysqlCustomResource deepCopy() {
        return MysqlCustomResource.builder()
                .apiVersion(apiVersion)
                .kind(kind)
                .metadata(new V1ObjectMetaBuilder()
                        .withName(metadata.getName())
                        .withNamespace(metadata.getNamespace())
                        .withAnnotations(copyMap(metadata.getAnnotations()))
                        .withLabels(copyMap(metadata.getLabels()))
                        .withResourceVersion(metadata.getResourceVersion())
                        .build())
                .spec(Spec.builder()
                        .storage(spec.getStorage())
                        .memory(spec.getMemory())
                        .cpu(spec.getCpu())
                        .build())
                .status(status != null ?
                        Status.builder()
                                .ready(status.isReady())
                                .conditions(new ArrayList<>(status.getConditions() == null ? Collections.emptyList() : status.getConditions()))
                                .build() :
                        Status.builder()
                                .ready(false)
                                .conditions(new ArrayList<>())
                                .build())
                .build();
    }

    private <T> Map<String, T> copyMap(Map<String, T> map) {
        return new HashMap<>(map == null ? Collections.emptyMap() : map);
    }

```

Lombok saves us from lots of boiler-plate java-bean code. The main thing to notice is the `deepCopy()` method, which is very useful during reconciliation. A future experiment would be to implement this as Java `record` type. Its not clear how well that would work yet because of how Kubernetes Client for Java internally uses *Gson* for converting JSON representation of these resources to Java.

## `Mysql` controller/reconcile logic

The generic reconciler logic mentioned earlier relied on extenders of our `CustomResourceController` abstract class to implement various methods. Here is what our implementation looks like:

```java
import com.fnjoin.k8s.controller.config.KubernetesConnection;
import com.fnjoin.k8s.controller.customresource.base.ChildResourceListener;
import com.fnjoin.k8s.controller.customresource.base.CustomResourceController;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.kubernetes.client.openapi.models.V1Condition;
import io.kubernetes.client.openapi.models.V1OwnerReference;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
@Slf4j
public class MysqlCustomResourceController extends CustomResourceController<MysqlCustomResource, MysqlCustomResource.List> {

    private final StatefulsetListener statefulsetListener;
    private final SecretListener secretListener;
    private final ServiceListener serviceListener;

    public MysqlCustomResourceController(KubernetesConnection connection, ObjectMapper objectMapper, StatefulsetListener statefulsetListener, SecretListener secretListener, ServiceListener serviceListener) {
        super(connection,
                objectMapper,
                "fnjoin.com",
                "mysqls",
                "v1",
                MysqlCustomResource.class,
                MysqlCustomResource.List.class);
        this.statefulsetListener = statefulsetListener;
        this.secretListener = secretListener;
        this.serviceListener = serviceListener;
    }

    @PostConstruct
    public void init() {
        super.init(2, "Mysql", statefulsetListener, secretListener, serviceListener);
    }

    @Override
    public boolean isResourceInDesiredState(String uid, MysqlCustomResource resource) {

        String namespace = resource.getMetadata().getNamespace();
        String name = resource.getMetadata().getName();

        return List.of(statefulsetListener, secretListener, serviceListener)
                .stream()
                .allMatch(listener -> listener.find(namespace, name).isPresent());
    }

    @Override
    public boolean isStatusChangeNeeded(String uid, MysqlCustomResource resource) {
        return applyStatusChanges(resource.deepCopy());
    }

    @Override
    public MysqlCustomResource applyChanges(String uid, MysqlCustomResource resource) {

        String namespace = resource.getMetadata().getNamespace();
        String name = resource.getMetadata().getName();
        V1OwnerReference reference = createOwnerReference(uid, resource);

        if (statefulsetListener.find(namespace, name).isEmpty()) {
            statefulsetListener.createStatefulSet(namespace, name, reference, resource.getSpec());
        }

        if (secretListener.find(namespace, name).isEmpty()) {
            secretListener.createSecret(namespace, name, reference);
        }

        if (serviceListener.find(namespace, name).isEmpty()) {
            serviceListener.createService(namespace, name, reference);
        }

        return resource;
    }

    @Override
    public boolean applyStatusChanges(MysqlCustomResource resource) {

        String namespace = resource.getMetadata().getNamespace();
        String name = resource.getMetadata().getName();

        AtomicBoolean changed = new AtomicBoolean(false);
        AtomicBoolean isReady = new AtomicBoolean(true);
        List<V1Condition> conditions = resource.getStatus().getConditions();

        statefulsetListener.find(namespace, name)
                .ifPresentOrElse(sts -> {
                    if (sts.getStatus() != null &&
                            Objects.equals(sts.getStatus().getReadyReplicas(), Integer.valueOf(1)) &&
                            Objects.equals(sts.getStatus().getReplicas(), Integer.valueOf(1))) {
                        statefulsetListener.updateCondition(changed, conditions, ChildResourceListener.ConditionStatus.AVAILABLE, "StatefulSet");
                    } else {
                        isReady.set(false);
                        statefulsetListener.updateCondition(changed, conditions, ChildResourceListener.ConditionStatus.CREATING, "StatefulSet");
                    }
                }, () -> {
                    isReady.set(false);
                    statefulsetListener.updateCondition(changed, conditions, ChildResourceListener.ConditionStatus.MISSING, "StatefulSet");
                });

        serviceListener.find(namespace, name)
                .ifPresentOrElse(service -> {
                    statefulsetListener.updateCondition(changed, conditions, ChildResourceListener.ConditionStatus.AVAILABLE, "Service");
                }, () -> {
                    isReady.set(false);
                    statefulsetListener.updateCondition(changed, conditions, ChildResourceListener.ConditionStatus.MISSING, "Service");
                });

        secretListener.find(namespace, name)
                .ifPresentOrElse(secret -> {
                    statefulsetListener.updateCondition(changed, conditions, ChildResourceListener.ConditionStatus.AVAILABLE, "Secret");
                }, () -> {
                    isReady.set(false);
                    statefulsetListener.updateCondition(changed, conditions, ChildResourceListener.ConditionStatus.MISSING, "Secret");
                });

        // change the ready flag if needed
        if (resource.getStatus().isReady() != isReady.get()) {
            resource.getStatus().setReady(isReady.get());
            changed.set(true);
        }

        return changed.get();
    }
}
```

Notice that `Mysql` custom-resource specific logic is not that complex.

## Desired result

At this point we can run the controller - outside of the cluster, in a terminal or in the IDE. It is spring-boot app so `./gradlew clean bootrun` should do the trick. After the *CRD* has been applied and the controller is running. We can apply the [sample *Mysql* YAML](https://github.com/fnjoin/mysql-k8s-controller/blob/main/k8s/sample1.yaml) to the cluster using `kubectl`:

```
kubectl apply -f k8s/sample1.yaml
```

The resuls of `kubectl get mysql db-1 -o yaml` should then look like:

```yaml
apiVersion: fnjoin.com/v1
kind: Mysql
metadata:
  creationTimestamp: "2022-11-01T21:41:32Z"
  generation: 3
  name: db-1
  namespace: default
  resourceVersion: "97078"
  uid: 52a2abef-bfe8-433c-a2bf-37a40c6f70e4
spec:
  cpu: 250m
  memory: 128Mi
  storage: 256Mi
status:
  conditions:
    - lastTransitionTime: "2022-11-01T17:41:31.957460-04:00"
      status: AVAILABLE
      type: Service
    - lastTransitionTime: "2022-11-01T17:41:31.957475-04:00"
      status: AVAILABLE
      type: Secret
    - lastTransitionTime: "2022-11-01T17:41:38.431363-04:00"
      status: CREATING
      type: StatefulSet
  ready: false
```

Notice the `status` section with the `ready` flag and the various `condition` objects. They were updated by the controller as our custom-resource was reconciled.

## Running the controller in the cluster

We will assume that our controller will run in its own *Namespace* called `mysql-controller` and that namespace exists. The following RBAC related *ClusterRole* and *ClusterRoleBinding* will need to be applied first to setup appropriate level of permissions for our controller:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: mysql-controller
rules:
  - apiGroups: [""]
    resources: ["secrets", "services"]
    verbs: ["watch", "get", "list", "create"]
  - apiGroups: ["apps"]
    resources: ["statefulsets"]
    verbs: ["watch", "get", "list", "create"]
  - apiGroups: ["coordination.k8s.io"]
    resources: ["leases"]
    verbs: ["*"]
  - apiGroups: ["fnjoin.com"]
    resources: ["mysqls"]
    verbs: ["*"]
```

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: mysql-controller
subjects:
  - kind: ServiceAccount
    name: default
    namespace: mysql-controller
roleRef:
  kind: ClusterRole
  name: mysql-controller
  apiGroup: rbac.authorization.k8s.io
```

Notice the permissions are limited to what the controller code actually needs. They could be tightened up a bit more but we will leave that to another post. The rest of the setup would include applying a *Deployment* to the namespace after the code has been bundled as an OCI image. The *Deployment* can look like:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql-controller
  namespace: mysql-controller
spec:
  replicas: 1
  selector:
    matchLabels:
      type: java
  template:
    metadata:
      labels:
        type: java
    spec:
      restartPolicy: Always
      containers:
        - name: app
          image: fnjoin.com/mysql-controller-java:1.0
          env:
            - name: SPACE
              valueFrom:
                fieldRef:
                  fieldPath: metadata.namespace
            - name: INSTANCEIDENTITY
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
```

Notice the environment variables `SPACE` and `INSTANCEIDENTITY`. They are used for leader-election purposes - see the [`application.yaml`](https://github.com/fnjoin/mysql-k8s-controller/blob/main/src/main/resources/application.yml) and [`KubernetesConnection.java`](https://github.com/fnjoin/mysql-k8s-controller/blob/main/src/main/java/com/fnjoin/k8s/controller/config/KubernetesConnection.java) in the code-base to see how they are used. 

The deployment YAML also assumes that the controller code will be bundled into an OCI image called `fnjoin.com/mysql-controller-java:1.0`. How you do that was explained in [Kubernetes with Java - Creating Images](../2021-11-28-creating-images). TL;DR - there is a [convinience script](https://github.com/fnjoin/mysql-k8s-controller/blob/main/k8s/create-java-image.sh) in the code-base that will do that.

## Conclusion

It is possible to write Kubernetes controllers in Java, we just need to understand the support classes provided by the Kubernetes Client for Java library. There is a lack of good information on how to write controllers in Java - hopefully this post will help solve that issue. Our choice to use spring-boot was also intentional since a lot of Java developers are already familiar with it. In addition to providing its core capability of dependency injection, it also makes it easy to bundle the code into OCI images. Compiling to a *native-image* are almost GA with latest spring-boot release and will make Java/spring-boot based controllers start up even faster and use far less CPU and memory resources. That last reason has typically been a hallmark for binaries created with *Golang*. Also, we have a huge ecosystem of OSS software that can help us in creating these resources.

Reach out if you would like to learn more about any of the topics discussed here. Also, if you have written a Kubernetes controller in any language, what were some the gotchas you faced? We would love to hear from you.

## References

- To see working code from this post (with slight modifications), see the [Git repository](https://github.com/fnjoin/mysql-k8s-controller).
- If you want to know how to bundle a spring-boot app like this as an OCI image (also known as Docker image), see [Kubernetes with Java - Creating Images](../2021-11-28-creating-images)
- If you want to know how to run an app like this inside a Kubernetes cluster, see [Kubernetes with Java - Running in the Cluster](../2021-09-11-running-in-cluster)