import * as core from '@actions/core'
import axios from 'axios'
import path from 'path'

import {
    RequestResult,
    AppProps,
    axiosConfig,
    Errors,
    Payload,
    Response,
    ResponseStatus,
    User,
    ErrorResult,
    ResultsResponse,
    BatchItem,
} from './App.types'

export default class App {
    TRIGGER_FAIL = 'fail_trigger'
    sleepTime = 3000
    user: User
    config: axiosConfig
    props: AppProps
    errCodeMessages: Record<number, string> = {
        401: 'The user credentials are incorrect.',
        403: 'Forbidden. The user is not an admin or does not have the CICD role.',
        404: 'Not found. The requested item was not found.',
        405: 'Invalid method. The functionality is disabled.',
        409: 'Conflict. The requested item is not unique.',
        500: 'Internal server error. An unexpected error occurred while processing the request.',
    }

    constructor(props: AppProps) {
        this.props = props
        this.user = {
            username: props.username,
            password: props.password,
        }
        this.config = {
            headers: {
                'User-Agent': 'sncicd_extint_github',
                Accept: 'application/json',
            },
            auth: this.user,
        }
    }

    /**
     * Prepare Request URL
     *
     * @returns     string Url to API
     */
    getRequestUrl(): string {
        if (this.props.nowInstallInstance) {
            return `https://${this.props.nowInstallInstance}.service-now.com/api/sn_cicd/app/batch/install`
        } else {
            throw new Error(Errors.NO_INSTALL_INSTANCE)
        }
    }

    /**
     * Build Request payload
     *
     * @param source    String
     * @throws          Error
     * @returns         Payload object
     */
    buildRequestPayload(source = ''): Payload {
        let payload: Payload

        switch (source) {
            case 'file':
                payload = this.getRequestPayloadFromFile()
                break
            case 'workflow':
                payload = this.getRequestPayloadFromWorkflow()
                break
            default:
                throw new Error(Errors.WRONG_SOURCE)
        }

        return payload
    }

    /**
     * Read Request payload from file, Workspace props should be predefined.
     *
     * @throws      Error
     * @returns     Payload object
     */
    getRequestPayloadFromFile(): Payload {
        if (this.props.workspace) {
            const filename = core.getInput('filename') || 'now_batch_manifest.json'
            const fullpath = path.join(this.props.workspace, filename)

            try {
                // eslint-disable-next-line
                const payload = require(fullpath)
                return payload
            } catch (error) {
                throw new Error(Errors.MISSING_PAYLOAD)
            }
        } else {
            throw new Error(Errors.NO_WORKSPACE)
        }
    }

    /**
     * Read Request payload from workflow.
     *
     * @throws      Error
     * @returns     Payload object
     */
    getRequestPayloadFromWorkflow(): Payload {
        try {
            return JSON.parse(core.getInput('manifest'))
        } catch (error) {
            throw new Error(Errors.MISSING_PAYLOAD)
        }
    }

    /**
     * Makes the request to Now batch_install api
     * Prints the progress
     *
     * @returns     Promise void
     */
    async installBatch(): Promise<void | never> {
        try {
            const payload: Payload = this.buildRequestPayload(core.getInput('source'))

            const url: string = this.getRequestUrl()
            const response: Response = await axios.post(url, payload, this.config)
            await this.printStatus(response.data.result)
        } catch (error) {
            let message: string
            if (error.response && error.response.status) {
                if (this.errCodeMessages[error.response.status]) {
                    message = this.errCodeMessages[error.response.status]
                } else {
                    const result: ErrorResult = error.response.data.result
                    message = result.error || result.status_message
                }
            } else {
                message = error.message
            }
            throw new Error(message)
        }
    }

    /**
     * Some kind of throttling, it used to limit the number of requests
     * in the recursion
     *
     * @param ms    Number of milliseconds to wait
     * @returns     Promise void
     */
    sleep(ms: number): Promise<void> {
        return new Promise(resolve => {
            setTimeout(resolve, ms)
        })
    }

    /**
     * Print the result of the task.
     * Execution will continue.
     * Task will be working until it get the response with successful or failed or canceled status.
     * Set output rollBackURL variable
     *
     * @param result    TaskResult enum of Succeeded, SucceededWithIssues, Failed, Cancelled or Skipped.
     * @throws          Error
     * @returns         void
     */
    async printStatus(result: RequestResult, resultsUrl = ''): Promise<void> {
        if (+result.status === ResponseStatus.Pending) {
            core.info(result.status_label)
            core.setOutput('rollbackURL', result.links.rollback.url)
        }

        if (+result.status === ResponseStatus.Running || +result.status === ResponseStatus.Successful) {
            core.info(`${result.status_label}: ${result.percent_complete}%`)
        }

        // Recursion to check the status of the request
        if (+result.status < ResponseStatus.Successful) {
            //save result url, query if needed

            const response: Response = await axios.get(result.links.progress.url, this.config)
            resultsUrl = result.links.results.url
            // Throttling
            await this.sleep(this.sleepTime)
            // Call itself if the request in the running or pending state
            await this.printStatus(response.data.result, resultsUrl)
        } else {
            // for testing only!
            if (process.env.fail === 'true') throw new Error('Triggered step fail')
            // Log the success result, the step of the pipeline is success as well
            if (+result.status === ResponseStatus.Successful) {
                core.info(result.status_message)
                core.info(result.status_detail)
            }

            // Log the failed result, the step throw an error to fail the step
            if (+result.status === ResponseStatus.Failed) {
                let msg = result.error || result.status_message
                if (resultsUrl) {
                    const batchResults: ResultsResponse = await axios.get(resultsUrl, this.config)
                    batchResults.data.result.batch_items.forEach((item: BatchItem) => {
                        msg += `\n${item.name}: ${item.state}. ${item.status_message}`
                    })
                }

                throw new Error(msg)
            }

            // Log the canceled result, the step throw an error to fail the step
            if (+result.status === ResponseStatus.Canceled) {
                throw new Error(Errors.CANCELLED)
            }
        }
    }
}
