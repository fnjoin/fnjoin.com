---
title: 10x Faster Spring Boot Startup Times
subtitle: Spring Native Startup Performance
author: Salman Malik
date: 2022-03-20
tags: ["kubernetes", "native", "java", "buildpacks", "performance", "spring-boot"]
---

Applications based on spring-boot are not known for extremely fast startup times and low memory usage. Usually spring-boot application are meant for long running backend processes and we have learned to live with the startup time and higher memory usage. This is because leveraging spring-boot solves so many other problems for the developer and speeds up the overall development process. In other words, we are OK with more developer productivity at the cost of higher resource usage at runtime specially at application startup.

## Introducing spring-native

This situation is about to change for the better with upcoming spring-boot `3.0` release and the [spring-native project](https://docs.spring.io/spring-native/docs/current/reference/htmlsingle/). With the `3.0` release, spring-boot will optionally support compiling our spring-boot apps to native executables. Because of spring-boot, we have the convenience of not having to worry about installing and maintaining server run-times like Tomcat and Jetty separately from our apps. This is because spring-boot apps, their dependencies, alongside the server runtimes are bundled together - in a single self-executable JAR. Now that self-executable is not really executable without a JRE being present on the system. With spring-boot `3.0` and specifically the  spring-native project, the JRE can be included in the built artifact and it will truly be self executable - no JRE required on the system at runtime.

The current version of spring-native is `0.11.3` and starting with spring-boot `2.6.4`, you can already try out this experimental capability. Your project must be using either JDK 11 or 17. The easiest way to try out this capability is to rely on the spring-boot Gradle or Maven plugin's capability of using buildpacks to convert your app into an OCI image. With a slight modification in the build configuration, the generated OCI image will include a native built executable without having to bundle a JRE in the image.

This generally results in an OCI image that is smaller, starts up to 10x faster and uses roughly 1/5 the memory at startup - compared to non-native version. This does come at a price during the compilation phase where it takes much longer than a standard Java build. The native compilation is composed of the following 7 different stages:

1. Initializing
1. Performing analysis
1. Building universe
1. Parsing methods
1. Inlining methods
1. Compiling methods
1. Creating image

The details of what actually happens during these 7 stages will be left for a future post. In the meantime, head over to the [spring-native project](https://docs.spring.io/spring-native/docs/current/reference/htmlsingle/) to read more about this process.

## Creating native executables

We talked about the steps to create an OCI image for a spring-boot app in an earlier post - see [Kubernetes with Java - Creating Images](../2021-11-28-creating-images). Here we will use Gradle and setup our `build.gradle` file to configure the spring-boot plugin such that it produces a native executable in the OCI image. For a complete working example `build.gradle`, see [here](https://github.com/maliksalman/spring-native-samples/blob/main/simple-jpa-gradle/build.gradle).

First we need to configure the plugins. Along with the standard spring-boot related plugins, we need to configure the spring-native' AOT plugin. The most recent version of spring-native project is `0.11.3` at this time:

```groovy
plugins {
	id 'org.springframework.boot' version '2.6.4'
	id 'io.spring.dependency-management' version '1.0.11.RELEASE'
	id 'java'
	id 'org.springframework.experimental.aot' version '0.11.3'
}
```

Next, we need to make sure we can pull our dependencies from Spring's own Maven repository in addition to Maven Central like so:

```groovy
repositories {
	maven { url 'https://repo.spring.io/release' }
	mavenCentral()
}
```

We also need to tell the spring-boot plugin to create the native version of the OCI image:

```groovy
tasks.named('bootBuildImage') {
	builder = 'paketobuildpacks/builder:tiny'
	environment = ['BP_NATIVE_IMAGE': 'true']
}
```

As far as Spring's own libraries, the spring-native project already knows how to compile them to native code. But third party libraries might need a bit more attention. For example, here are the dependencies of a typical spring-boot project that uses spring-web MVC, spring-data JPA, actuators, MySQL connector, Prometheus Micrometer Registry, Lombok, and Open API Swagger UI:

```groovy
dependencies {
	implementation 'org.springframework.boot:spring-boot-starter-web'
	implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
	implementation 'org.springframework.boot:spring-boot-starter-actuator'
	runtimeOnly 'mysql:mysql-connector-java'

	implementation 'io.micrometer:micrometer-registry-prometheus'

	implementation 'org.springdoc:springdoc-openapi-ui:1.6.4'
	implementation 'org.springdoc:springdoc-openapi-native:1.6.4'

	compileOnly 'org.projectlombok:lombok'
	annotationProcessor 'org.projectlombok:lombok'

	testImplementation 'org.springframework.boot:spring-boot-starter-test'
}
```

As you can see we only needed to add a special `springdoc-openapi-native` dependency for native compilation to work properly. All other dependencies were just the normal versions that you would have included in a non-native compilation situation. Just to be clear, that native dependency doesn't actually include native compiled bits in the dependency. Instead it includes Java and configuration code to tell spring how to natively compile the `springdoc-openapi` code. Once native compilation becomes more common, you will probably not have to explicitly add native related dependencies like above.

To create the native executable images we just need to invoke `bootBuildImage` Gradle target like so:

```
./gradlew clean bootBuildImage
```

## Results

The OCI image building with native executable does take longer compared to one with standard compiled Java byte-code and a bundled JRE. During testing, the non-native OCI image generation took around 25 seconds on average while the native OCI image generation took 312 seconds on average (a bit over 5 minutes). The native compilation is slow and will probably be slower compared to non-native compilation for the foreseeable future. As spring-native and native compilation features of JDK improve, the time it takes to perform the native compilation will come down over time. This time has already improved for the better over the last year as spring-native matured.

Looking at the output from a native OCI image generation, we can see that majority of the time was spent performing the native compilation. The rest of it was spent assembling the OCI image. The time spent for the entirety of OCI image creation can be visualized with the following chart.

{{< figure src="/img/native-compile-breakdown.jpg" alt="OCI Image with native executable breakdown" >}}

To see the difference in performance between standard Java compiled and native compiled code, the app was started multiple times, capturing startup times and memory usage on startup. The native version of the app started up in 0.226 seconds on average while using around 69 MB of memory. The non-native version of the app started up in 7.805 seconds on average while using 404 MB of memory.

{{< figure src="/img/native-vs-standard.jpg" alt="Native vs Standard" >}}

## Running environment

A bit about our compilation and running environment. The above statistics were generated on a 2019 MacBook Pro 16 with 6 core i7 and 32GB of memory. In addition, the laptop was running the latest version of macOS (Monterey - 12.2.1) and Docker Desktop (4.6.0). When the same tests ware run on an M1 MacBook Air with 8GB of memory, it was about twice as slow to do the native compile. This was because the native compile capabilities have not been optimized for an M1 chip yet and probably because the native compile is a memory intensive operation and 8GB might not have been enough. This situation on M1 based system will probably be a lot better on higher-end M1 CPUs with more memory. 

With the increasing usage of ARM based CPUs on the server side and for personal computers (Apple M1), it is important to note that the compiled native executables are built specific to an OS and CPU platform. Since the OS bits being bundled in the OCI image are responsibility of buildpacks, we only have to make sure to perform the native compile on the same CPU platform where we intend to run it. So if the target runtime is x86 then native compile the image on x86.

## Conclusion

The capability to compile Java programs to native executables is a very exciting development for the Java platform. In most situations the increased compile/build times will be worth the significantly reduced resource usage at startup and runtime. With wider adoption of this technology, Java and specifically spring-boot apps will start to use the cloud infrastructure a lot more efficiently than they did in the past. Using spring-boot apps for server-less workloads seems like a real possibility as well.

What have you done to make you Java and specially spring-boot applications startup faster in Kubernetes? Please reach out if you’d like to hear more about this or other topics.

## References

- If you want to try out working examples, please checkout the [spring-native-samples repository](https://github.com/maliksalman/spring-native-samples) - it includes both Gradle and Maven examples. Both example applications have the exact same functionality and dependencies with the only difference being the build system. The README for the project also will let you know how to compile and run the samples.
- If you want to know how to run an app like this inside a Kubernetes cluster, see [Kubernetes with Java - Running in the Cluster](../2021-09-11-running-in-cluster)