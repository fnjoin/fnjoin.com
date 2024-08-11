---
title: k9s - My Favorite Kubernetes Tool
subtitle: Kubernetes CLI To Manage Your Clusters In Style
author: Salman Malik
date: 2022-02-07
tags: ["kubernetes", "cli", "tools"]
---

If you work with Kubernetes clusters a lot, you are most probably used to typing a lot of `kubectl` commands. A while ago, I discovered [k9s](https://k9scli.io/) and it made working with Kubernetes clusters so much simpler. To quote the description directly from the *k9s* site:

> K9s is a terminal based UI to interact with your Kubernetes clusters

## Installing

*k9s* is written in *go-lang*. The beauty of programs written in that language is that they are compiled down to a single binary with all the dependencies included. The project's [GitHub site](https://github.com/derailed/k9s/releases) makes pre-compiled binaries available for all major OS's and CPU architectures. Just download the appropriate one and place the single executable binary in your `PATH`.

For MacOS, if you have [Homebrew](https://brew.sh/) installed (you should!), simply running `brew install k9s` will install it.

## Running

Running it is as simple as typing `k9s`. Once that command is run, you are presented with an interface in the shell where the command was issued. It looks like:

{{< figure src="/img/fav-k8s-cli-tool/k9s-pods.png" alt="k9s UI" >}}

The app uses the same mechanism as `kubectl` to connect to the Kubernetes clusters. So if you can connect to your cluster with `kubectl` commands, *k9s* will connect as well.

## Navigating around

Once in the interface, you use the `UP` and `DOWN` keys to navigate lists, `ENTER` key to see details of the current object, `ESC` key to get back to the previous list, and other simple keyboard shortcut keys to do various operations. Most of these operations usually require lengthy `kubectl` commands if done outside of *k9s*. For example, when viewing a list of pods in *k9s*, if you press the `L` key, you get to see the logs for the first container in the pod. Then pressing `ECS` gets you back to the list of pods.

In *k9s*, you can view all kinds of Kubernetes resources. By default, you are shown *Pod*s in the `default` namespace. Its like running `kubectl get pods -w` - the list will update itself as *Pod*s are added, removed, or become ready. To see *Deployment* resources, simply type `:deployments` - now you are looking at list of the *Deployment*s. You have probably already figured out the pattern. `:services` for list of *Service* resources, `:namespaces` for list of *Namespace*s, `:serviceaccounts` for *ServiceAccount*s list, so on and so forth.

You don't have to memorize any of the keyboard commands once in *k9s*. The top portion of the interface tells you about the available commands in a context-sensitive manner. Once you do have them memorized, you can turn off the top portion and reclaim that screen real-estate. The `?` key will give you full list of commands. 

## Conclusion

I stole the sub-title of this post from the k9s site. It says:

> Kubernetes CLI To Manage Your Clusters In Style

And its so true. You feel like a `l33t h4x0r` when you are flying around in the *k9s* interface listing *pods*, creating *port-forward*s, or checking on the status of your *cron-job* invocations. With a small set of commands, you can become very productive in a short amount of time. 

What are your favorite tools when dealing with Kubernetes? Please reach out if you’d like to hear more about this or other topics.