"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const axios_1 = __importDefault(require("axios"));
const path_1 = __importDefault(require("path"));
const App_types_1 = require("./App.types");
class App {
    constructor(props) {
        this.TRIGGER_FAIL = 'fail_trigger';
        this.sleepTime = 3000;
        this.errCodeMessages = {
            401: 'The user credentials are incorrect.',
            403: 'Forbidden. The user is not an admin or does not have the CICD role.',
            404: 'Not found. The requested item was not found.',
            405: 'Invalid method. The functionality is disabled.',
            409: 'Conflict. The requested item is not unique.',
            500: 'Internal server error. An unexpected error occurred while processing the request.',
        };
        this.props = props;
        this.user = {
            username: props.username,
            password: props.password,
        };
        this.config = {
            headers: {
                'User-Agent': 'sncicd_extint_github',
                Accept: 'application/json',
            },
            auth: this.user,
        };
    }
    /**
     * Prepare Request URL
     *
     * @returns     string Url to API
     */
    getRequestUrl() {
        if (this.props.nowInstallInstance) {
            return `https://${this.props.nowInstallInstance}.service-now.com/api/sn_cicd/app/batch/install`;
        }
        else {
            throw new Error(App_types_1.Errors.NO_INSTALL_INSTANCE);
        }
    }
    /**
     * Build Request payload
     *
     * @param source    String
     * @throws          Error
     * @returns         Payload object
     */
    buildRequestPayload(source = '') {
        let payload;
        switch (source) {
            case 'file':
                payload = this.getRequestPayloadFromFile();
                break;
            case 'workflow':
                payload = this.getRequestPayloadFromWorkflow();
                break;
            default:
                throw new Error(App_types_1.Errors.WRONG_SOURCE);
        }
        return payload;
    }
    /**
     * Read Request payload from file, Workspace props should be predefined.
     *
     * @throws      Error
     * @returns     Payload object
     */
    getRequestPayloadFromFile() {
        if (this.props.workspace) {
            const filename = core.getInput('filename') || 'now_batch_manifest.json';
            const fullpath = path_1.default.join(this.props.workspace, filename);
            try {
                // eslint-disable-next-line
                const payload = require(fullpath);
                return payload;
            }
            catch (error) {
                throw new Error(App_types_1.Errors.MISSING_PAYLOAD);
            }
        }
        else {
            throw new Error(App_types_1.Errors.NO_WORKSPACE);
        }
    }
    /**
     * Read Request payload from workflow.
     *
     * @throws      Error
     * @returns     Payload object
     */
    getRequestPayloadFromWorkflow() {
        try {
            return JSON.parse(core.getInput('manifest'));
        }
        catch (error) {
            throw new Error(App_types_1.Errors.MISSING_PAYLOAD);
        }
    }
    /**
     * Makes the request to Now batch_install api
     * Prints the progress
     *
     * @returns     Promise void
     */
    async installBatch() {
        try {
            const payload = this.buildRequestPayload(core.getInput('source'));
            const url = this.getRequestUrl();
            const response = await axios_1.default.post(url, payload, this.config);
            await this.printStatus(response.data.result);
        }
        catch (error) {
            let message;
            if (error.response && error.response.status) {
                if (this.errCodeMessages[error.response.status]) {
                    message = this.errCodeMessages[error.response.status];
                }
                else {
                    const result = error.response.data.result;
                    message = result.error || result.status_message;
                }
            }
            else {
                message = error.message;
            }
            throw new Error(message);
        }
    }
    /**
     * Some kind of throttling, it used to limit the number of requests
     * in the recursion
     *
     * @param ms    Number of milliseconds to wait
     * @returns     Promise void
     */
    sleep(ms) {
        return new Promise(resolve => {
            setTimeout(resolve, ms);
        });
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
    async printStatus(result, resultsUrl = '') {
        if (+result.status === App_types_1.ResponseStatus.Pending) {
            core.info(result.status_label);
            core.setOutput('rollbackURL', result.links.rollback.url);
        }
        if (+result.status === App_types_1.ResponseStatus.Running || +result.status === App_types_1.ResponseStatus.Successful) {
            core.info(`${result.status_label}: ${result.percent_complete}%`);
        }
        // Recursion to check the status of the request
        if (+result.status < App_types_1.ResponseStatus.Successful) {
            //save result url, query if needed
            const response = await axios_1.default.get(result.links.progress.url, this.config);
            resultsUrl = result.links.results.url;
            // Throttling
            await this.sleep(this.sleepTime);
            // Call itself if the request in the running or pending state
            await this.printStatus(response.data.result, resultsUrl);
        }
        else {
            // for testing only!
            if (process.env.fail === 'true')
                throw new Error('Triggered step fail');
            // Log the success result, the step of the pipeline is success as well
            if (+result.status === App_types_1.ResponseStatus.Successful) {
                core.info(result.status_message);
                core.info(result.status_detail);
            }
            // Log the failed result, the step throw an error to fail the step
            if (+result.status === App_types_1.ResponseStatus.Failed) {
                let msg = result.error || result.status_message;
                if (resultsUrl) {
                    const batchResults = (await axios_1.default.get(resultsUrl, this.config));
                    console.log("Batch Results=", batchResults.data);
                    batchResults.data.result.batch_items.forEach((item) => {
                        msg += "\n" + item.status_message;
                    });
                }
                console.log("msg=", msg);
                console.log('ResUrl2=', resultsUrl);
                throw new Error(msg);
            }
            // Log the canceled result, the step throw an error to fail the step
            if (+result.status === App_types_1.ResponseStatus.Canceled) {
                throw new Error(App_types_1.Errors.CANCELLED);
            }
        }
    }
}
exports.default = App;
