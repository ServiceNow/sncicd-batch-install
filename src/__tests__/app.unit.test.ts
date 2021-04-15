// import { jest, describe, beforeAll, beforeEach, it, expect } from '@jest/globals'
import * as core from '@actions/core'
import axios from 'axios'
import App from '../App'
import { AppProps, Errors, RequestResult, Payload } from '../App.types'

describe(`App lib`, () => {
    let props: AppProps
    const inputs: any = {
        version: '1.0.1',
    }

    beforeAll(() => {
        jest.spyOn(core, 'getInput').mockImplementation((name: string) => {
            return inputs[name]
        })

        // Mock error/warning/info/debug
        jest.spyOn(core, 'error').mockImplementation(jest.fn())
        jest.spyOn(core, 'warning').mockImplementation(jest.fn())
        jest.spyOn(core, 'info').mockImplementation(jest.fn())
        jest.spyOn(core, 'debug').mockImplementation(jest.fn())
    })

    beforeEach(() => {
        props = { password: '2', nowInstallInstance: 'test', username: '1' }
    })
    describe(`Get Request URL`, () => {
        it(`it should build URL with correct params`, () => {
            const app = new App(props)

            expect(app.getRequestUrl()).toEqual(
                `https://${props.nowInstallInstance}.service-now.com/api/sn_cicd/app/batch/install`,
            )
        })
        it(`it should fail without instance parameter`, () => {
            props.nowInstallInstance = ''
            const app = new App(props)

            expect(() => app.getRequestUrl()).toThrow(Errors.NO_INSTALL_INSTANCE)
        })
    })
    
    describe(`Install batch`, () => {
        it(`should call functions`, () => {
            const app = new App(props)
            const post = jest.spyOn(axios, 'post')
            const getRequestUrl = jest.spyOn(app, 'getRequestUrl').mockImplementation(() => 'https://test.service-now.com/api/sn_cicd/app/batch/install');
            const buildRequestPayload = jest.spyOn(app, 'buildRequestPayload')
                .mockImplementation(
                    () => {
                        return {
                            "name": "123",
                            "packages": [
                                {
                                    "id": "1",
                                    "type": "application",
                                    "load_demo_data": false,
                                    "requested_version": "2",
                                    "requested_customization_version": "3",
                                    "notes": "test"
                                }
                            ]
                        }
                    }
                );

            const response: RequestResult = {
                links: {
                    progress: {
                        id: '1',
                        url: "https://example.com/1",
                    },
                    result: {
                        id: '2',
                        url: 'https://example.com/2',
                    },
                    rollback: {
                        id: '3',
                        url: 'https://example.com/3',
                    },
                },
                status: '1',
                status_label: 'string',
                status_message: 'string',
                status_detail: 'string',
                error: 'string',
                percent_complete: 100,
            }
            post.mockResolvedValue(response)
            jest.spyOn(global.console, 'log')

            app.installBatch()

            expect(getRequestUrl).toHaveBeenCalledTimes(1)
            expect(buildRequestPayload).toHaveBeenCalledTimes(1)
            expect(post).toHaveBeenCalled()
        })
    })

    describe(`buildRequestPayload`, () => {
        const app = new App({ password: '2', nowInstallInstance: 'test', username: '1' })
        const requestPayloadFromFile = jest.spyOn(app, 'getRequestPayloadFromFile');
        const requestPayloadFromWorkflow = jest.spyOn(app, 'getRequestPayloadFromWorkflow');
        let payload: Payload;
        
        beforeAll(() => {
            payload = {
                "name": "123",
                "packages": [
                    {
                        "id": "1",
                        "type": "application",
                        "load_demo_data": false,
                        "requested_version": "2",
                        "requested_customization_version": "3",
                        "notes": "test"
                    }
                ]
            }
            
            requestPayloadFromFile.mockImplementation(() => payload)
            requestPayloadFromWorkflow.mockImplementation(() => payload)
           
        })

        it(`should call getRequestPayloadFromFile`, () => {
            const actualPayload = app.buildRequestPayload('file');
            
            expect(requestPayloadFromFile).toHaveBeenCalledTimes(1);
            expect(actualPayload).toEqual(payload)
        })

        it(`should call getRequestPayloadFromWorkflow`, () => {
            const actualPayload = app.buildRequestPayload('workflow');
            
            expect(requestPayloadFromWorkflow).toHaveBeenCalledTimes(1);
            expect(actualPayload).toEqual(payload)
        })

        it(`should throw an error`, () => {
            expect(() => app.buildRequestPayload('undefined')).toThrow(Errors.WRONG_SOURCE)
        })
    })
})
