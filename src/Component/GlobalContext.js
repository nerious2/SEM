import React, {createContext, useReducer} from 'react';



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
    latestInstalledPackage: {
        package: '',
        version: '',
    },

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
    case 'SET_LATEST_INSTALLED_PACKAGE':
        return {
            ...state,
            latestInstalledPackage: action.payload,
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
