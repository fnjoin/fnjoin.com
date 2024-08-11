---
title: Config Updates Without Redeployment for Spring and Kubernetes
author: Archie Cowan
subtitle: Spring PropertySources and Kubernetes Configmaps
date: 2021-12-18
tags: ["deployments", "Kubernetes"]
---

Here's what you'll accomplish by the end of this article:

* Create a small Spring Boot application that loads a property file from a configurable location overriding configuration that is packaged with the application.
* Package the application in a docker image and see how to override the config file via docker commands.
* Deploy the application to kubernetes.
* Use a Kubernetes Configmap to update your configuration without redeployment of your application.
* Learn about when using these methods together is recommended.


## Starting your Spring Boot application example


A fast way to get a spring boot application started is the Spring Initializr. All you need for this example is Spring Boot and Spring WebFlux.

[Download the project from Spring Initializr](https://start.spring.io/#!type=maven-project&language=java&platformVersion=2.6.1&packaging=jar&jvmVersion=11&groupId=com.example&artifactId=demo&name=demo&description=Demo%20project%20for%20Spring%20Boot&packageName=com.example.demo&dependencies=webflux)

In its initial state, this application should start and open a web server on port 8080 by running the `com.example.demo.DemoApplication` class.

The next step is to add a controller that enables you to load a value. Create a new class in the `com.example.demo` package called `HelloController`.

```java
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {

    @GetMapping(path = "/hello")
    public Greeting hello(@Value("${message}") String message ) {
        return new Greeting(message);
    }

}

class Greeting {
    private String greeting;
    public Greeting(String greeting) {
        this.greeting = greeting;
    }

    public String getGreeting() {
        return greeting;
    }

    public void setGreeting(String greeting) {
        this.greeting = greeting;
    }
}
```

A quick breakdown fo what we have here:

* `@RestController` tells spring this class provides endpoints to make available on the web server
* `@GetMapping(path = "/hello")` creates an endpoint on the path `/hello`
* `@Value("${message}") String message` injects a property called message whenever this function is called
* The `Greeting` class is just a struct for us to return in our message

Next, let's define the `message` property in `src/main/resources/application.properties`.

```bash
message=This is the default message.
```


At this point, when you run the application and make a GET request to /hello, you'll see receive this response:

```json
{"greeting":"This is the default message."}
```

The `application.proeprties` file cannot be updated at runtime. But, you can provide spring configuration instructions to load a configuration from another source. For this, we need an additional dependency and a configuration class.

First, the dependency is `commons-configuration`. Add this to your dependencies in the `pom.xml`

```xml
<dependency>
  <groupId>commons-configuration</groupId>
  <artifactId>commons-configuration</artifactId>
  <version>1.10</version>
</dependency>
```

This package provides a component that loads a property file from disk and then reloads it when changes are detected. You need to wrap `PropertiesConfiguration` from `commons-configuration` into a class that provides the `PropertySource` interface so that Spring can bring this configuration into the application context and inject the values.  

```java
import org.apache.commons.configuration.PropertiesConfiguration;
import org.springframework.core.env.PropertySource;

/**
 * ReloadablePropertySource wraps a commons-config PropertiesConfiguration
 * in a Spring PropertySource interface so that a PrpoertiesConfiguration
 * can be added to a Spring Environment Property Sources list.
 */
class ReloadablePropertySource extends PropertySource {

    private PropertiesConfiguration propertiesConfiguration;

    public ReloadablePropertySource(String name,
                        PropertiesConfiguration propertiesConfiguration) {
        super(name);
        this.propertiesConfiguration = propertiesConfiguration;
    }

    @Override
    public Object getProperty(String s) {
        return propertiesConfiguration.getProperty(s);
    }
}
```

Next you need to instantiate this in a spring configuration class.

```java
import org.apache.commons.configuration.PropertiesConfiguration;
import org.apache.commons.configuration.reloading.FileChangedReloadingStrategy;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MutablePropertySources;

import java.io.File;

@Configuration
public class DemoConfiguration {

    private ConfigurableEnvironment env;

    public DemoConfiguration(@Autowired ConfigurableEnvironment env) {
        this.env = env;
    }

    @Bean
    @ConditionalOnProperty(name = "spring.config.location",
                            matchIfMissing = false)
    public PropertiesConfiguration propertiesConfiguration(
            @Value("${spring.config.location}") String path) throws Exception {
        PropertiesConfiguration configuration =
            new PropertiesConfiguration( new File(path));
        FileChangedReloadingStrategy fcrs = new FileChangedReloadingStrategy();
        fcrs.setRefreshDelay(1000);
        configuration.setReloadingStrategy(fcrs);
        return configuration;
    }

    @Bean
    @ConditionalOnProperty(name = "spring.config.location",
                            matchIfMissing = false)
    public ReloadablePropertySource reloadablePropertySource(
            PropertiesConfiguration properties) {
        ReloadablePropertySource ret =
            new ReloadablePropertySource("dynamic", properties);
        MutablePropertySources sources = env.getPropertySources();
        sources.addFirst(ret);
        return ret;
    }
}
```

Here's what's happening in `DemoConfiguration` [^2]:

* `@ConditionalOnProperty(name = "spring.config.location", matchIfMissing = false)` gates these methods from running unless a property `spring.config.location` is available. You will pass this on the command line with a system property in a few steps.
* the `propertiesConfiguration` method creates a `commons-configuration` `PropertiesConfiguration` object that refreshes after 1 second if there are  nay changes.
* the `reloadablePropertySource` method takes the `PropertiesConfiguration` you created and makes it the first place Spring will look for properties with `sources.addFirst(ret)`.

[^2]: The configuration classes demonstrated here were adapted from a [Baeldung article](https://www.baeldung.com/spring-reloading-properties) with a few critical changes.

Try rerunning your application and verify that it behaves the same as before. Nothing should have changed yet with the way your endpoint works.


Now, add a new folder in the root of your project called `k8s` and create a new file `config.properties` with this content:

```bash
message=Hello my name is Jake
```

This will be your override file. The embedded `application.properties` should remain in place.

Including the following system property argument in your VM options will define the property needed for the configuration override you just created in `DemoConfiguration` to run.

```bash
-Dspring.config.location=k8s/config.properties
```

When you recompile and rerun your application, the `/hello` endpoint will now return the message in `k8s/config.properties` instead of `application.properties`! Try updating `config.properties` and observe how the message variable changes.



## Running the DemoApplication in Docker

As a sanity check before you jump into Kubernetes, verify the application behavior using Docker only. This can save you some time if you have issues.

First you need to build a docker image with your application. As outlined in [creating images for java apps on kubernetes](/post/2021-11-28-creating-images), you can quickly build an image for a Spring Boot application with buildpacks.

```bash
mvn spring-boot:build-image -Dspring-boot.build-image.imageName=demoapplication:0.1
```

This gets you a pretty robust image for your application without having to create a Dockerfile.


Now you can run your application with docker like this:

```bash
docker run -it --rm -p 8081:8080 demoapplication:0.1
```

Upon running a GET request on `/hello` you are greeted with the default message.

```bash
curl http://localhost:8081/hello ; echo
{"greeting":"Default message in application.properties"}
```

You just need to specify the VM arguments using an environment variable as well as mount a volume including your `config.properties`.


```bash
docker run -it --rm -p 8081:8080 \
  -e JAVA_TOOL_OPTIONS='-Dspring.config.location=/hello/config.properties' \
  -v $PWD/k8s/:/hello/  \
  demoapplication:0.1
```

You should see Jake in the greeting now.

```bash
curl http://localhost:8081/hello ; echo
{"greeting":"Hello my name is Jake"}
```

Now you can update `k8s/config.properties` to verify that the properties update live.

config.properties
```bash
message=Hello my name is Enzo
```

```bash
curl http://localhost:8081/hello ; echo
{"greeting":"Hello my name is Enzo"}
```

You're doing great! The application works in docker and the properties update without restarting the application.


# Now with Kubernetes

Now for some fun with kubernetes!

***
***Kubernetes setup***

These steps should work with any recent version of Kubernetes. Minikube is a great resource if you need a local environment. In order to make your docker images available to Kubernetes, you will need access to a container registry. With Minikube, you can skip over the registry effort by attaching your docker client to the docker service in Minikube

```bash
eval $(minikube docker-env)
```

Then use docker as you normally would. [More info here](https://minikube.sigs.k8s.io/docs/commands/docker-env/).

Otherwise, you can use `minikube image load` to copy the image from your docker environment to Minikube. [More info here](https://minikube.sigs.k8s.io/docs/commands/image/).

***

As a first step, create a namespace for the work you will do. The big benefit of this is that you will be able to start from a clean slate very easily by deleting the namespace.

```bash
kubectl create namespace hello-ns
```

Then, set `hello-ns` to the default namespace in your kubectl context so that you don't have to add `-n hello-ns` to all your commands.

```bash
kubectl config set-context --current --namespace=hello-ns
```

Now the work you do going forward will apply to the `hello-ns` namespace only.

### ConfigMap

As a first step, create the configmap from the config.properties file in your k8s folder. The following command generates the configmap manifest and installs it in the hello-ns namespace.

```bash
kubectl create configmap hello-config --from-file=k8s/config.properties
```

You can see what was created with `describe`:

```bash
kubectl describe configmap hello-config
Name:         hello-config
Namespace:    hello-ns
Labels:       <none>
Annotations:  <none>

Data
====
config.properties:
----
message=Hello my name is Jake

BinaryData
====

Events:  <none>
```

Or to view or save a yaml version of the configmap, use `get`:

```bash
kubectl get configmap hello-config -o yaml
```

You can see, a config.properties contains the data from your properties file. You can edit the manifest with `kubectl edit configmap hello-config` or use `kubectl apply -f manifest.yml` to make changes.


Next to get our application running in kubernetes, make sure your image is either in an accessible container registry or available locally.

Now, create a deployment with your `demoapplication:0.1` image.

```bash
kubectl create deployment helloapp --image=demoapplication:0.1
```

And then expose the deployment with a load balancer.

```bash
kubectl expose deployment helloapp --type=LoadBalancer --port 8080
```

If you're running minikube, you'll want to start a tunnel. This command blocks so open a new terminal window.

```bash
minikube tunnel
```

Now, when you access [http://localhost:8080/hello](http://localhost:8080/hello) you should see the default response from your application.

```json
{"greeting":"This is the default message."}
```

You don't yet see the value from the configmap because you haven't wired up the config map with your deploy yet. That's next!


To make config.properties available to your helloapp pods, you must add a volume and a volumeMount to the deployment spec. Below are the parts to add to your manifest using `kubectl edit deployment helloapp`.

```yaml
spec:
  template:
    spec:
      containers:
        ...
        - image: demoapplication:0.1
          volumeMounts:
            - name: config-vol
              mountPath: "/hello/"
      volumes:
      - name: config-vol
        configMap:
          name: hello-config
```

At this point you can `kubectl exec -it podname -- /bin/bash` to see the `/hello/` directory in your pod.

What remains is to configure the application to look at `/hello/config.properties` for the configuration override. Edit the deployment one last time and set the JAVA_TOOL_OPTIONS variable.

```yaml
spec:
  containers:
    - image: demoapplication:0.1
      env:
        - name: JAVA_TOOL_OPTIONS
          value: "-Dspring.config.location=/hello/config.properties"
```

After you edit this time, Kubernetes cycles in a new version of your pod. Now, the greeting on your endpoint reflects the values in `/hello/config.properties`! Congrats!

Now, when you access [http://localhost:8080/hello](http://localhost:8080/hello) you should see the default response from your application.

```json
{"greeting":"Hello my name is Jake"}
```

Now, when you edit the configmap, the file in your pods will reflect the changes after 1 minute by default [^1]. Spring will detect the changes and reload the properties file.

## When this is recommended

There are infinite options for application configuration and this is just one more way to do it! If you have an interest in using spring boot with configmaps, this is a good place to start. However, is this right for your production environment?

Here are some example criteria to consider:

* You're already running Kubernetes.
* There is a business benefit to updating configuration without restarting your application.
* The time to deploy a configuration update is much faster than simply deploying a new container image.
* You prefer not to run a dedicated configuation server in addition to your application [^3].
* Your application configuration is contextual to the Kubernetes namespace in which it runs and you operate many namespaces with different configurations deployed.
* Multiple applications running in the same namespace share configuration values.
* Configuration is committed to your source control system.
* Configuration is delivered to Kubernetes from source control via deployment automation.

You may have additional criteria for your environment. It's good to think it through.

[^3]: The `spring-cloud-kubernetes` package provides additional [systems](https://docs.spring.io/spring-cloud-kubernetes/docs/current/reference/html/#spring-cloud-kubernetes-configuration-watcher) that reduce the time to update properties from configmaps without having to adjust the kubelet sync frequency.

## Enjoy!

Hope this helps you on your journey with Spring Boot and Kuberenetes. Please reach out if you'd like to hear more about these topics.


[^1]: `--sync-frequency` is a [kubelet config option](https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/#mounted-configmaps-are-updated-automatically
) - it defaults to 1m.
