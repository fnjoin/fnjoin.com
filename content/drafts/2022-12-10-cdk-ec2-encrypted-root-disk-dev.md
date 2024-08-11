---
title: CDK Template to Launch an EC2 Instance with an Encrypted Root Volume
subtitle: Using CDK, EC2, an Encrypted Root Volume, VPC, and the VS Code Remote SSH plugin
author: Archie Cowan
date: 2022-12-10
tags: ["aws", "cdk", "ec2", "vpc", "vscode"]
---

A teammate recently drew my attention to the benefits of _[Remote Development using SSH](https://code.visualstudio.com/docs/remote/ssh)_, a plugin for [VS Code](https://code.visualstudio.com/). It provides a local experience for developing remotely. I've done remote development with terminals and SSH and my [favorite editor](https://www.vim.org/) for a long time. However, the combination of a full IDE experienece along with the decent terminal experience available in VS Code motivated me to give it a try. In this article, we'll create a remote development environment with AWS CDK.

I initially gave it a shot to test the full IDE experience but probably will continue using this for awhile thanks to the automatic port forwarding feature. When you connect to your remote server with VS Code, it installs its server. This means it can detect when you open a local port (on the remote server) and automatically forward it through your ssh connection. Neat! 

When developing with very dependency (i.e., package downloads) heavy environments, you can develop on a server with gobs of low-latency bandwidth instead of your local network. Likely your home or office network is more constrained that the network of, for instance, a server running in your nearest AWS EC2 Region. 

## Running an EC2 Instance for Development

Now that I want to commit to using EC2 for development longer term, I thought I would make it easier to turn on and turn off what I wanted to use in AWS. This also brings us to the main feature of this article, a Cloud Development Kit (CDK) template to automate the creation and, importantly, the deletion of the resources I'm using. 

CDK enables you to develop in several languages: Typescript, Javascript, Python, Java, C#, Go. My goal in this article is to help you get up and running quickly with the same template that I've been using. There's a lot more depth to CDK than I will provide here. To go deeper, I recommend starting with the [CDK getting started guide](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html). 


### AWS Assumptions

I'm going to assume you have access to an AWS account. If you create an account, please take care to set it up securely. 

### Installing NodeJS

I recommend using NVM or [Node Version Manager](https://github.com/nvm-sh/nvm). There is a quick install solution on that page. Use whatever method you like to install node though. 

### Install CDK

CDK installs using `npm`. 

```shell
npm install -g aws-cdk
```

This provides the `cdk` command. 

### Check Your AWS Access

For the following steps, make sure you're ready with access to your AWS account. You can use the [AWS CLI Getting Started Guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-quickstart.html) to get set up quickly. 



### CDK Bootstrapping

> ⚠️ **Be advised**: Beyond this point, you will be charged by AWS for resources you utilize. When you turn off what you are using, you will no longer be charged. If you remember to turn it off, it will cost less than a cup of coffee. 


CDK requires a small number of resources in your account to deploy your stacks. These include a cloudformation stack that includes some roles and s3 buckets. If you know your AWS account number and the region you wish to run your stack, the following command will set you up: 

```shell
cdk bootstrap aws://ACCOUNT-NUMBER/REGION
```


If you don't have your account number handy, these next steps are inlined from the [getting started guide](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html#getting_started_bootstrap): 

> #### Bootstrapping
> 
> Deploying stacks with the AWS CDK requires dedicated Amazon S3 buckets and other containers to be available to AWS CloudFormation during deployment. Creating these is called bootstrapping. To bootstrap, issue:
> 
> 
> ```shell
> cdk bootstrap aws://ACCOUNT-NUMBER/REGION
> ```
> #### Tip
> If you don't have your AWS account number handy, you can get it from the AWS Management Console. Or, if you have the AWS CLI installed, the following command displays your default account information, including the account number.
> ```shell
> aws sts get-caller-identity
> ```
> If you created named profiles in your local AWS configuration, you can use the --profile option to display the account information for a specific profile. The following example shows how to display account information for the prod profile.
> 
> 
> ```shell
> aws sts get-caller-identity --profile prod
> ```
> To display the default Region, use aws configure get.
> 
> ```shell
> aws configure get region
> aws configure get region --profile prod
> ```


Now you're ready to get started


## Starting our Template 

In your projects folder, make a new directory for our template: 

```shell
mkdir ec2-dev
cd ec2-dev
```

CDK assumes the name of the folder is the name of the project so start in an empty folder. 

```shell
cdk init app --language typescript
```

following the completion of the above you should see this: 

```shell
ec2-dev % ls
README.md		cdk.json		lib			package-lock.json	test
bin			jest.config.js		node_modules		package.json		tsconfig.json
```

In `bin/ec2-dev.ts` you will find what is essentially the main method of your program. Likely you won't need to change much here actually. 

In `lib/ec2-dev-stack.ts` you'll find Ec2DevStackStack. 


In `lib/ec2-dev-stack.ts`, you can remove the commented code so that your file resembles this: 

```typescript
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class Ec2DevStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

  }
}
```

Now we will add each of these pieces to our new template: 

- VPC
- Security Group with Ingress Rules
- A Role for our EC2 instance so that we can access AWS services through the instance profile mechanism. 
- An EC2 instance with a block device


First, let's start with some imports so that we have the resources we need.

```typescript
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';

import { Construct } from 'constructs';
```

Now we can begin adding the pieces we need to complete our stack in the constructor. 

First, we define our VPC. This is a fairly basic starting point. The key points here is that the subnets generated are public so that we can access them from our home network. 


```typescript
// ...

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'dev-vpc', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      natGateways: 0,
      subnetConfiguration: [{
        name: 'public',
        cidrMask: 24, 
        subnetType: ec2.SubnetType.PUBLIC,
      }]
    });

// ... 
```

Next we define our security group and some ingress rules. Note, that we only need to provide access over port 22 for SSH from our home network. You can add additional rules by making additional calls to `sesrverSecurityGroup.addIngressRule`. 

```typescript
    const serverSecurityGroup = new ec2.SecurityGroup(this, 'dev-security-group', {
      vpc,
      allowAllOutbound: true,
    });

    serverSecurityGroup.addIngressRule(
      ec2.Peer.ipv4('1.1.1.1/32'), // replace 1.1.1.1 with your ip address
      ec2.Port.tcp(22), 'allow ssh access from home',
    );
```

I don't recommend this configuration if your home network IP address changes frequently. If this is the case, you probably want to consider [EC2 Instance Connect](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-connect-set-up.html) . Possibly I can address this in a follow up article. 


Next we define a server role for our instance. The following example is very permissive and may not be appropriate in accounts that have shared activities. I run this in an account that is basically my personal dev environment in the cloud and does not risk access to any confidential information. Take care to understand if this meets the security standards of your environment. You can actually skip using instance roles if you want and create your EC2 instance without a role to get started.

```typescript
    const serverRole = new iam.Role(this, 'server-role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess')
      ]
    });
```

Finally, we make our EC2 instance. Here we define the instance type, the AMI we intend to use, the security group, the IAM role, and the key pair to pass into the instance. Additionally, blockDevices are defined so that we can specify an encrypted root volume. 

```typescript
    const inst = new ec2.Instance(this, 'ec2-instance', {
      vpc, 
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC
      },
      role: serverRole,
      securityGroup: serverSecurityGroup,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.LARGE),
      machineImage: ec2.MachineImage.genericLinux({
        'us-east-2': 'ami-0176478f493e6143b',
        'us-east-1': 'ami-02b509fb28354de85',
      }),
      keyName: process.env.KEY_PAIR_NAME,
      blockDevices: [
        {
          deviceName: '/dev/sda1',
          mappingEnabled: true,
          volume: ec2.BlockDeviceVolume.ebs(256, {
            deleteOnTermination: true,
            encrypted: true,
            volumeType: ec2.EbsDeviceVolumeType.GP2
          })
        }
      ]
    });
```

The AMI (Amazon Machine Image) provided in this case can be any AMI. This one in particlar is the [Deep Learning AMI](https://docs.aws.amazon.com/dlami/latest/devguide/what-is-dlami.html). 

This completes our stack! 

One more quick item. If you want to see the ip address of the instance in the console easily, you can print out the public ip with a `CfnOutput`. 

```typescript
    new cdk.CfnOutput(this, 'ec2-instance-public-ip', {
      value: `${inst.instancePublicIp}`,
      description: "public ip of the ec2 instance",
      exportName: "publicIp"
    })
```


The full example looks like this: 

```typescript
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';

import { Construct } from 'constructs';

export class Ec2DevStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'dev-vpc', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      natGateways: 0,
      subnetConfiguration: [{
        name: 'public',
        cidrMask: 24, 
        subnetType: ec2.SubnetType.PUBLIC,
      }]
    });


    const serverSecurityGroup = new ec2.SecurityGroup(this, 'dev-security-group', {
      vpc,
      allowAllOutbound: true,
    });

    serverSecurityGroup.addIngressRule(
      ec2.Peer.ipv4('1.1.1.1/32'), // replace 1.1.1.1 with your ip address
      ec2.Port.tcp(22), 'allow ssh access from home',
    );

    const serverRole = new iam.Role(this, 'server-role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess')
      ]
    });


    const inst = new ec2.Instance(this, 'ec2-instance', {
      vpc, 
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC
      },
      role: serverRole,
      securityGroup: serverSecurityGroup,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.LARGE),
      machineImage: ec2.MachineImage.genericLinux({
        'us-east-2': 'ami-0176478f493e6143b',
        'us-east-1': 'ami-02b509fb28354de85',
      }),
      keyName: process.env.KEY_PAIR_NAME,
      blockDevices: [
        {
          deviceName: '/dev/sda1',
          mappingEnabled: true,
          volume: ec2.BlockDeviceVolume.ebs(256, {
            deleteOnTermination: true,
            encrypted: true,
            volumeType: ec2.EbsDeviceVolumeType.GP2
          })
        }
      ]
    });

    new cdk.CfnOutput(this, 'ec2-instance-public-ip', {
      value: `${inst.instancePublicIp}`,
      description: "public ip of the ec2 instance",
      exportName: "publicIp"
    })

  }
}
```

Before we deploy, take note of this line in the ec2.Instance block: 


```typescript
      keyName: process.env.KEY_PAIR_NAME,
```

This reads an environment variable from your shell called `KEY_PAIR_NAME`. The value contained here is the name of an already existing Key Pair in your AWS account. You can follow this [link to your list of key pairs](https://console.aws.amazon.com/ec2/home?#KeyPairs:) in the console, take note of the region though. You may need to create Key Pair if haven't launched an EC2 instance yet. You will also need the private key for the last step of our article. 

To set the variable in your shell, execute this with the name of your key:

```shell
export KEY_PAIR_NAME=mykeypairname
```


Now, you can launch your stack!

```shell
cdk deploy
```

Note the IP address of your EC2 instance in the CDK output and head to the next step!

## Connecting to your EC2 instance with VS Code

VS Code will prompt you to connect to instances named in your `~/.ssh/config` file. Here is the basic information you should include there to connect. 

```text
Host ec2-dev
  HostName USE_YOUR_EC2_IP_HERE
  IdentityFile ~/.ssh/key_pair_name.pem
  User ubuntu
```

## Turning Off Your Stack

Don't forget to turn off your EC2 instance if you aren't using it! This stack will increase you AWS bill and you don't want to pay for resources you aren't using. 

The following command will remove all the resources from our CDK template above. 

```shell
cdk destroy
```

Alternatively, if you want to retain the contents of the EBS volume, you can stop the EC2 instance through the console or API and resume it later. It will likely come back with a different ip address though. 

> ⚠️ **Be advised**: You are billed for the EBS volume even when your EC2 instance is in a stopped state. To avoid additional charges, undeploy the stack or terminate the instance. 

## Thanks

Thanks for reading my article about VS Code Remote SSH and CDK! There are a number of directions you can take this template for your own use: 

- Give your instance a DNS name
- Automatically turn off the instance if it's not in use
- Use an Elastic IP so that your IP doesn't change after stopping and starting again. 
- Maybe allocate other resources you like to use for development automatically. 

Hope you enjoy. 