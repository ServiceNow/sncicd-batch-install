import * as core from '@actions/core'
import { AppProps, Errors } from './src/App.types'
import App from './src/App'

export const configMsg = '. Configure Github secrets please'

export const run = (): void => {
    try {
        const errors: string[] = []
        const { nowUsername = '', nowPassword = '', nowInstallInstance = '', GITHUB_WORKSPACE = '' } = process.env

        if (!nowUsername) {
            errors.push(Errors.USERNAME)
        }
        if (!nowPassword) {
            errors.push(Errors.PASSWORD)
        }
        if (!nowInstallInstance) {
            errors.push(Errors.NO_INSTALL_INSTANCE)
        }

        if (errors.length) {
            core.setFailed(`${errors.join('. ')}${configMsg}`)
        } else {
            const props: AppProps = {
                username: nowUsername,
                password: nowPassword,
                nowInstallInstance,
                workspace: GITHUB_WORKSPACE,
            }
            const app = new App(props)

            app.installBatch().catch(error => {
                core.setFailed(error.message)
            })
        }
    } catch (error) {
        core.setFailed(error.message)
    }
}

run()
