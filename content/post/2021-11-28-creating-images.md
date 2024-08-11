---
title: Kubernetes with Java - Creating Images
subtitle: Bundling your Java apps into OCI images to run under Kubernetes
author: Salman Malik
date: 2021-11-28
tags: ["java", "kubernetes", "docker", "oci", "buildpacks"]
---

## Building production quality images for Java apps 

To run a spring-boot app on k8s, you need to create a container image. The images need to be in the [Open Container Image format](https://github.com/opencontainers/image-spec). In this article, we will review how to create OCI images two different ways:

- Using a *Dockerfile*
- Using *Cloud Native Buildpacks*

Note: The Open Container Image (OCI) format antecedent of the *Docker* image format as a standard specification. Images created using *Docker* follow these same specifications today. 

## A good OCI image

Before looking at the options for creating images, we need to talk about what are the attributes of a *good* OCI image. Some of the most important attributes for images containing spring-boot apps are:

- The base OS libraries, JDK, and the application artifacts all need to be included in the image. Picking the right OS and JDK version are not trivial because they can have security and performance impacts.
- The ability to gracefully shutdown is important to ensure work being performed is given the chance to complete and to release held resources properly. If the Java process is not started properly, shutting down gracefully might not be possible.
- The ability to pass in JVM and command line arguments is important. Without this capability, the application might not function outright or perform badly with limited resources within a container.
- Effectively using the layering capabilities of OCI images is important. If not used effectively, small updates to the image might require a lot of unnecessary changes to be uploaded to the image registry. This would also necessitate the same changes needing to be downloaded during container creation which can effect the bandwidth usage, disk usage, and time to launch containers in k8s.
- Running the application with a non-root user is important as that reduces the chances a malicious user can gain access to host system through a compromised container. 

## Build image with your own *Dockerfile*

For this option, we will assume that: 

- We have access to a Docker daemon like *Docker Desktop*
- We have already assembled our spring-boot JAR file and it is available at `target/sample-1.0.jar`
- JDK 11 is the target run environment

We can create a simple *Dockerfile* that looks like the following, 

```docker
FROM openjdk:11-jdk
ARG BOOTJAR
COPY ${BOOTJAR} boot.jar
ENTRYPOINT [ "java", "-jar", "boot.jar" ]
```

To create an image called `acme/sample:1.0`, you can use the following command:

```bash
docker build --build-arg BOOTJAR=target/sample-1.0.jar -t acme/sample:1.0 .
```

This looks pretty simple and is probably sufficient for quick testing but it doesn't address some of our concerns. For example, the whole JAR file is added as one layer. On a subsequent update to our app, a new JAR will get created and whole layer in the image will get updated. This will happen whether only Java code within our app changed, a simple properties file changed, any of the dependency JARs changed, or we migrated the app to a new spring-boot version. Other missing criteria include running the app as non-root user and the ability to pass in JVM and app parameters. 

This four line Dockerfile does not meet all our acceptance criteria for a production container image. But, it also didn't take long to create. With a little more effort, we certainly can meet all our criteria building a *Dockerfile*. However, for even less effort, we can produce a container image that meets all of our criteria using buildpacks. 


## Cloud Native Buildpacks

Since version 2.3.0 (May 15th, 2020), both maven and gradle spring-boot plugins support bundling applications as OCI images using [Cloud Native Buildpacks](https://buildpacks.io/). It does require that Docker daemon is running on the computer, but a simple maven or gradle command will convert a spring-boot application into an OCI image without the developer having to:

- maintain a *Dockerfile*
- choose a base OS image
- choose and bundle the right JDK
- properly create image layers
- worry about graceful shutdowns
- configure the application to run as non-root in the container

### Using Maven

To create an image called `acme/sample:1.0` using maven, the following command will package the spring-boot application into an OCI image:

```
mvn spring-boot:build-image -Dspring-boot.build-image.imageName=acme/sample:1.0
```

For more detailed information, visit the [official documentation](https://docs.spring.io/spring-boot/docs/current/maven-plugin/reference/htmlsingle/#build-image) to see other available options.

### Using Gradle

To create an image called `acme/sample:1.0` using gradle, the following command will package the spring-boot application into an OCI image:

```
gradle bootBuildImage --imageName=acme/sample:1.0
```

For more detailed information, visit the [official documentation](https://docs.spring.io/spring-boot/docs/current/gradle-plugin/reference/htmlsingle/#build-image) to see what other options are available.

### Benefits

The main benefits for OCI images created using this technique for developers are:

- Maven or gradle are most probably already used and this functionality is built-in
- Base OS image picked is optimized to run spring-boot Java apps
- Don't have to worry about which JDK flavor to pick (Oracle, AdoptOpenJDK, Liberica, Temurin, etc)  
- Security updates in the base OS or JDK can be applied by just recreating the image
- The built app is layered in the image to optimize image downloads and app startup
- Appropriate memory settings are automatically passed to the Java runtime based on available memory for the container and other app factors
- [Spring cloud bindings](https://github.com/spring-cloud/spring-cloud-bindings) are added to the application classpath. This will auto-configure the application to connect to external services when credentials and connection information is passed into the container at runtime.

## Conclusion

We just examined two options to bundle spring-boot applications into OCI images. In my opinion, for greenfield development where teams build with spring-boot, buildpacks save time making production quality spring-boot app container images. The developer can concentrate on their spring-boot app and leverage the investment made in buildpacks by the community.

Want to hear us discuss custom container image builds or more about buildpacks or buildpack customization? We would love to hear from you.