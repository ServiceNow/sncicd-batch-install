export interface User {
    username: string;
    password: string;
}

export interface AppProps extends User {
    nowInstallInstance: string;
    workspace?: string;
}

export interface Package {
    id: string;
    load_demo_data?: boolean;
    notes?: string;
    requested_customization_version?: string;
    requested_version?: string; // Required if packages.type is set to application; ignored if set to plugin.
    type: string; // Required. Type of package(application/plugin)
}
export interface Payload {
    name: string;
    notes?: string;
    packages: Package[];
}

export interface ErrorResult {
    status: string;
    status_label: string;
    status_message: string;
    status_detail: string;
    error: string;
}

export enum Errors {
    USERNAME = 'nowUsername is not set',
    PASSWORD = 'nowPassword is not set',
    NO_INSTALL_INSTANCE = 'nowInstallInstance is not set',
    CANCELLED = 'Canceled',
    MISSING_PAYLOAD = 'Payload is empty, corrupted or not set',
    NO_WORKSPACE = 'GITHUB_WORKSPACE env not found',
    WRONG_SOURCE = 'Manifest source is not supported',
}

export interface Responce {
    data: {
        result: RequestResult,
    };
}

export interface RequestResult {
    links: {
        progress: {
            id: string,
            url: string,
        },
        results: {
            id: string,
            url: string,
        },
        rollback: {
            id: string,
            url: string,
        },
    };
    status: string;
    status_label: string;
    status_message: string;
    status_detail: string;
    error: string;
    percent_complete: number;
}

export interface ResultsResponce {
    data: {
        result: {
            batch_plan: BatchPlan,
            batch_items: BatchItem[],
        },
    };
}

export interface BatchPlan {
    state: string;
    id: string;
    url: string;
    notes?: string;
    name?: string;
}

export interface BatchItem {
    state: string;
    version?: string;
    type: string;
    id: string;
    url: string;
    notes?: string;
    name?: string;
    item_id: string;
    customization_version?: string;
    status_message: string;
}

export enum ResponseStatus {
    Pending = 0,
    Running = 1,
    Successful = 2,
    Failed = 3,
    Canceled = 4,
}

export interface axiosConfig {
    headers: {
        'User-Agent': string,
        Accept: string,
    };
    auth: User;
}
