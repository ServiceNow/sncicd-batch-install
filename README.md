# ServiceNow CI/CD GitHub Action for Batch Install

Installs two or more packages in a single specified batch.

https://developer.servicenow.com/dev.do#!/reference/api/quebec/rest/cicd-api#cicd-POST-app-batch-install

# Usage
## Step 1: Prepare values for setting up your variables for Actions
- credentials (username and password for a service account)
- instance URLs for your dev, test, prod, etc. environments

## Step 2: Configure Secrets in your GitHub repository
On GitHub, go in your repository settings, click on the secret _Secrets_ and create a new secret.

Create secrets called 
- `NOW_USERNAME`
- `NOW_PASSWORD`
- `NOW_CLIENT_INSTANCE` only the **domain** string is required from the instance URL, for example https://**domain**.service-now.com


## Step 3: Example Workflow Template
https://github.com/ServiceNow/sncicd_githubworkflow

## Step 4: Configure the GitHub Action if need to adapt for your needs or workflows
```yaml
# This step is required if source is equal to file
- name: Checkout
  uses: actions/checkout@v2
- name: Batch Install 
  id: sncicd-batch-install # id of the step
  uses: ServiceNow/sncicd-batch-install@1.0 
  with:
    # required(file/workflow)
    source: file
    # optional(otherwise use default name now_batch_manifest.json)
    filename: manifest.json
    # required if source is equal to workflow
    manifest: <JSON string here> 
  env:
    nowUsername: ${{ secrets.NOW_USERNAME }}
    nowPassword: ${{ secrets.NOW_PASSWORD }}
    nowInstallInstance: ${{ secrets.NOW_CLIENT_INSTANCE }}
```
Inputs:
- **source** - Required. Source of the payload, file/workflow available.
- **filename** - Optional. If source=file, the name of the file with payload. Default: name now_batch_manifest.json.
- **manifest** - Required if source=workflow. JSON string with the payload.
    
Outputs:
- **rollbackURL** - URL to rollback the batch.

JSON payload example:
```json
{
    "name": "Batch name here",
    "notes": "Your notes here",
    "packages": [
        {
            "id": "{{sys_id}}",
            "type": "application",
            "load_demo_data": false,
            "requested_version": "{{version}}",
            "requested_customization_version": "{{version}}",
            "notes": "{{notes}}"
        }
    ]
}
```

Environment variable should be set up in the Step 1
- nowUsername - Username to ServiceNow instance
- nowPassword - Password to ServiceNow instance
- snowSourceInstance ServiceNow instance where application is developing

# Contributing

## Tests

Tests should be ran via npm commands:

#### Unit tests
```shell script
npm run test
```   

#### Integration test
```shell script
npm run integration
```   

## Build

```shell script
npm run build
```

## Formatting and Linting
```shell script
npm run format
npm run lint
```

# Notices

## Support Model

ServiceNow built this integration with the intent to help customers get started faster in adopting CI/CD APIs for DevOps workflows, but __will not be providing formal support__. This integration is therefore considered "use at your own risk", and will rely on the open-source community to help drive fixes and feature enhancements via Issues. Occasionally, ServiceNow may choose to contribute to the open-source project to help address the highest priority Issues, and will do our best to keep the integrations updated with the latest API changes shipped with family releases. This is a good opportunity for our customers and community developers to step up and help drive iteration and improvement on these open-source integrations for everyone's benefit. 

## Governance Model

Initially, ServiceNow product management and engineering representatives will own governance of these integrations to ensure consistency with roadmap direction. In the longer term, we hope that contributors from customers and our community developers will help to guide prioritization and maintenance of these integrations. At that point, this governance model can be updated to reflect a broader pool of contributors and maintainers. 
