---
title: You Can Match How Many Deployments Amazon Does in a Day
author: Archie Cowan
subtitle: (Per Engineer)
date: 2021-11-28
tags: ["practices", "deployments"]
---

Wonder how many deployments Amazon does in a day? In November 2014, [Dr. Werner Vogels reported that Amazon achieves 50M deployments a year across their dev, test, and production environments](https://www.allthingsdistributed.com/2014/11/apollo-amazon-deployment-engine.html). That's 136k deployments per day or about 1.6 per second. His article describes the systems they created to automate deployment across their infrastructure. That is only one aspect of reaching that astronomical position. You also need a lot of engineers to reach that level of productivity.

So, Amazon does 50M a year. When will your team achieve 1M deployments in their environments? 1M deployments may be difficult to believe if your team practices a monthly deployment or a quarterly deployment to your production environment. A team deploying to production every month will reach 10^6 deployments in a little over 83,333 years. A team deploying to production quarterly needs 250,000 years to reach 1M deployments.

I don't know how many engineers work at Amazon. But, we can speculate about how they get to 50M.

First, we can try to bring 50M down to a more human scale. Let's just assume they have 50K engineers for the sake of this example [^1]. This would be about 1,000 deployments per engineer per year. That's still a lot of deployments per engineer (about 4 per day assuming 240 work days per year).

Perhaps, on average, each engineer is able to complete 2 software changes per week that are deployed to production. Each change is deployed to a dev environment a few times, maybe a test environment once or twice, and mostly just once to production. These will be small changes - probably any one change is not something observable by a customer. That's less than 100 software changes per engineer per year. The number of deployments is magnified by the amount of automation in their systems. Perhaps there are 5 to 10 deployments per change by an individual engineer at Amazon. Each engineer maybe makes 2-3 software changes per week that ship to production.
Possibly updates shared libraries like the AWS SDK drive thousands of deployments too.

Is 2-3 software changes deployed to production per week something engineers on your team can achieve? Can you imagine automating 5-10 steps in your deployment process to deliver a change to production?

How long will it take different sized teams with different deployment velocities to reach 1M deployments? Consider the following table.

|                  | 3 (engineers)    | 7       | 20      | 55       | 148      | 403      | 1,097    | 2,981    |
| ---------------- | ---------------- | ------- | ------- | -------- | -------- | -------- | -------- | -------- |
| 3 (deploys/year) | 16,666.7 (years) | 4,761.9 | 1,666.7 | 617.3    | 225.2    | 82.7     | 30.4     | **11.2** |
| 7                | 7,142.9          | 2,040.8 | 714.3   | 264.6    | 96.5     | 35.4     | **13.0** | **4.8**  |
| 20               | 2,500.0          | 714.3   | 250.0   | 92.6     | 33.8     | **12.4** | **4.6**  | **1.7**  |
| 55               | 909.1            | 259.7   | 90.9    | 33.7     | **12.3** | **4.5**  | **1.7**  | **0.6**  |
| 148              | 337.8            | 96.5    | 33.8    | **12.5** | **4.6**  | **1.7**  | **0.6**  | **0.2**  |

Across the horizontal access we have hypothetical team size. Down the vertical access we have number of changes per engineer per year. Both axis increase exponentially. The cells use the following formula to estimate the number of years it would take to reach one million deployments:
$$
\frac{10^6}{commits * engineers * deployments}
$$
That is, one million over the product of the number of commits, engineers, and deployments where the commits and engineers follow the axis above and number of deployments is simply 10 per commit. In a spreadsheet, basically this formula

```
=1000000 / ($B22 * C$2 * 10)
```

I belabor this point to show that for many organizations, achieving this change velocity is possible. 1M deployments is actually possible in about 10 years for organizations with more than 20 engineers making between 50 and 150 changes per engineer per year.


## Why does high deployment velocity matter?


Teams that have higher deployment frequency learn more quickly and their changes are safer. Every change is a learning opportunity to see how it affects your environment. Changes are safer when they are smaller.


![image-20211114130001416](/img/2021-11-14-reach1m/image-20211114130001416.png)


Teams that learn more are able to make more progress more quickly. This is basically the essence of what I take away from the State of Devops Reports over the last few years.



- [State of DevOps 2014](https://services.google.com/fh/files/misc/state-of-devops-2014.pdf)
- [State of DevOps 2015](https://services.google.com/fh/files/misc/state-of-devops-2015.pdf)
- [State of DevOps 2016](https://services.google.com/fh/files/misc/state-of-devops-2016.pdf)
- [State of DevOps 2017](https://services.google.com/fh/files/misc/state-of-devops-2017.pdf)
- [Accelerate State of DevOps 2018](https://services.google.com/fh/files/misc/state-of-devops-2018.pdf)
- [Accelerate State of DevOps 2019](https://services.google.com/fh/files/misc/state-of-devops-2019.pdf)
- [Accelerate State of DevOps 2021](https://services.google.com/fh/files/misc/state-of-devops-2021.pdf)



Also, a [whitepaper specifically on the ROI of DevOps transformation](https://services.google.com/fh/files/misc/whitepaper_roi_of_devops_transformation_2020_google_cloud.pdf) where change velocity is addressed with respect to return on investment.

![image-20211114133040063](/img/2021-11-14-reach1m/image-20211114133040063.png)



Elite technology performance, as characterized by

* high change velocity
* low change failure rate
* faster recovery time from failures (mttr)
* faster lead time for changes

results in a better return on investment for the business.


Can you also achieve these results at your organization? Yes, we believe you can. We have influenced this type of change in real organizations. If you have a story or a challenge to share with us, we'd love to hear from you. Please reach out.


[^1]: You can find online that Amazon had ~36K engineers in 2019. 50K is in the same order of magnitude.
