---
title: Custom Domains
permalink: /cloud/configuration/custom-domains
category: Configuring Cube Cloud
menuOrder: 4
---

To set up a custom domain, go to your deployment's setting page:

<IMAGE_HERE>

Type in your custom domain, and click **Add**. In this example, we're using a
subdomain `insights.acme.com`:

<IMAGE_HERE>

After doing this, add the following `CNAME` records to your DNS provider:

| Name          | Value                      |
| ------------- | -------------------------- |
| `YOUR_DOMAIN` | `https://cloud.cube.dev/*` |

Using the example subdomain from earlier, a `CNAME` record would look like:

| Name       | Value                      |
| ---------- | -------------------------- |
| `insights` | `https://cloud.cube.dev/*` |
