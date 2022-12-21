import React, {createContext, useReducer, useRef, useEffect} from 'react';



/* Peer List Context */
const globalContext = createContext();


// #################### DB list Reducer #####################

//initial state
const initialGlobalAppState = {
    isAppRefresh: false,
    nowDownloadJobId: -1,
    installingPackage: {
        package: '',
        version: '',
        setActionButtonText: null,
        latestActionButtonText: '',
    },
    deletingPackage: {
        package: '',
    },
    latestInstalledPackage: {
        package: '',
        version: '',
    },
    notNotifyUpdatePackage: null,
    deviceModel: '',
};
  
// create reducer
const reducerGlobalApp = (state = initialGlobalAppState, action) => {
    switch (action.type) {
    case 'SET_REFRESH_STATE':
        return {
            ...state,
            isAppRefresh: action.payload,
        };
    case 'SET_NOW_DOWNLOAD_JOBID':
        return {
            ...state,
            nowDownloadJobId: action.payload,
        };
    case 'SET_INSTALLING_PACKAGE':
        return {
            ...state,
            installingPackage: action.payload,
        };
    case 'SET_DELETING_PACKAGE':
        return {
            ...state,
            deletingPackage: action.payload,
        };
    case 'SET_LATEST_INSTALLED_PACKAGE':
        return {
            ...state,
            latestInstalledPackage: action.payload,
        };
    case 'SET_NOT_NOTIFY_UPDATE_PACKAGE':
        return {
            ...state,
            notNotifyUpdatePackage: action.payload,
        };
    case 'SET_DEVICE_MODEL':
        return {
            ...state,
            deviceModel: action.payload,
        };
    default:
        return state;
    }
};

const GlobalAppStateProvider = ({children}) => {
    const [state, dispatch] = useReducer(reducerGlobalApp, initialGlobalAppState);
    const value = {state, dispatch};
    return (
        <globalContext.Provider value={value}>{children}</globalContext.Provider>
    );
};

export {GlobalAppStateProvider, globalContext};


// bytes를 용량 단위의 문자열로 반환
export const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + sizes[i];
}

// 첫 렌더링 때 실행 막기
export const useDidMountEffect = (func, deps) => {
	const didMount = useRef(false);

	useEffect(() => {
		if (didMount.current) func();
		else didMount.current = true;
	}, deps);
};


// 안드로이드 API를 버전 이름 문자열로 반환
export const androidAPItoVersion = (sdk) => {
    let versionStr = '';
    switch (sdk) {
        case 1:
            versionStr = '1.0';
            break;
        case 2:
            versionStr = '1.1';
            break;
        case 3:
            versionStr = '1.5';
            break;
        case 4:
            versionStr = '1.6';
            break;
        case 5:
            versionStr = '2.0';
            break;
        case 6:
            versionStr = '2.0.1';
            break;
        case 7:
            versionStr = '2.1';
            break;
        case 8:
            versionStr = '2.2';
            break;
        case 9:
            versionStr = '2.3';
            break;
        case 10:
            versionStr = '2.3.3';
            break;
        case 11:
            versionStr = '3.0';
            break;
        case 12:
            versionStr = '3.1';
            break;
        case 13:
            versionStr = '3.2';
            break;
        case 14:
            versionStr = '4.0';
            break;
        case 15:
            versionStr = '4.0.3';
            break;
        case 16:
            versionStr = '4.1';
            break;
        case 17:
            versionStr = '4.2';
            break;
        case 18:
            versionStr = '4.3';
            break;
        case 19:
            versionStr = '4.4';
            break;
        case 20:
            versionStr = '4.4W';
            break;
        case 21:
            versionStr = '5.0';
            break;
        case 22:
            versionStr = '5.1';
            break;
        case 23:
            versionStr = '6.0';
            break;
        case 24:
            versionStr = '7.0';
            break;
        case 25:
            versionStr = '7.1';
            break;
        case 26:
            versionStr = '8.0';
            break;
        case 27:
            versionStr = '8.1';
            break;
        case 28:
            versionStr = '9';
            break;
        case 29:
            versionStr = '10';
            break;
        case 30:
            versionStr = '11';
            break;
        case 31:
        case 32:
            versionStr = '12';
            break;
        case 33:
            versionStr = '13';
            break;
        default:
            versionStr = '알 수 없음';
            break;
    }
    return versionStr;
}
