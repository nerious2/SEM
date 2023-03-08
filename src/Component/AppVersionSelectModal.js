import React, {createContext, useContext, useReducer, useState, useRef, createRef, useEffect} from 'react';

import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Image,
  NativeModules,
  Text,
  Alert,
  StatusBar,
  Animated,
  Pressable,
  Button,
  Dimensions,
  Platform,
  AppState,
  ToastAndroid,
  PermissionsAndroid,
  Modal,
} from 'react-native';

import RNFS from 'react-native-fs';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import BottomToolbar from './BottomToolbar';
import FastImage from 'react-native-fast-image';
import AppVersionSelectList from './AppVersionSelectList';
import { globalContext, formatBytes, androidAPItoVersion } from './GlobalContext';
import { useNetInfo } from '@react-native-community/netinfo';
import RNApkInstallerN from 'react-native-apk-installer-n';
import ProgressBar from "react-native-animated-progress";
import DeviceInfo from 'react-native-device-info';

/* Peer List Context */
const appVersionSelectContext = createContext();


// app


// #################### DB list Reducer #####################

//initial state
const initialAppVersionSelectState = {
    modalVisible: false,
    package: '',
    label: '',
    iconPath: '',
    latestVersion: '',
    latestDate: '',
    latestApkUrl: '',
    latestUpdateLog: '',
    minimumAndroidSdk: 0,
    versionCode: 0,
    versionList: [],
};
  
// create reducer
const reducerAppVersionSelect = (state = initialAppVersionSelectState, action) => {
    let savedData = new Array();
    switch (action.type) {
    case 'INIT_APP_VERSION_LIST':
        return action.payload;
    case 'SET_MODAL_VISIBLE':
        return {
            ...state,
            modalVisible: action.payload,
        };
    default:
        return state;
    }
};

const AppVersionSelectModalProvider = ({children}) => {
    const [state, dispatch] = useReducer(reducerAppVersionSelect, initialAppVersionSelectState);
    const value = {state, dispatch};
    return (
        <appVersionSelectContext.Provider value={value}>{children}</appVersionSelectContext.Provider>
    );
};

export {AppVersionSelectModalProvider, appVersionSelectContext, initialAppVersionSelectState };






export default function AppVersionSelectModal () {

    const appVSContextState = useContext(appVersionSelectContext).state;
    const appVSContextDispatch = useContext(appVersionSelectContext).dispatch;

    const [appLatestUpdateLog, setAppLatestUpdateLog] = useState('');


    // 스크롤뷰 Ref
    const scrollViewRef = useRef();

    // Global Context
    const globalContextState = useContext(globalContext).state;
    const globalContextDispatch = useContext(globalContext).dispatch;

    // 다운로드 버튼 텍스트
    const [actionButtonText, setActionButtonText] = useState('');
    const [progressBar, setProgressBar] = useState(-1);
    const [nowDownloadJobId, setNowDownloadJobId] = useState(-1);

    const isInternetReachable = useNetInfo().isInternetReachable;

    const [scrollDimensionHeight, setScrollDimensionHeight] = useState(0);
    const [scrollCurrentY, setScrollCurrentY] = useState(0);



    const handleScroll = (event) => {
        console.log(event.nativeEvent.contentOffset.y);
        // scrollCurrentY = event.nativeEvent.contentOffset.y;
        setScrollCurrentY(event.nativeEvent.contentOffset.y);
    }

    const handleScrollLayout = (event) => {
        setScrollDimensionHeight(event.nativeEvent.layout.height);
        // scrollDimensionHeight = event.nativeEvent.layout.height;
        console.log('event nativeEvent layout');
        console.log(event.nativeEvent.layout);
    }
    
    useEffect(() => {
        // 내림차순 정렬
        function descend(a, b) {
            return a.index > b.index ? -1 : a.index < b.index ? 1 : 0;
        }


        if (!appVSContextState.latestUpdateLog) return;
        const result = appVSContextState.latestUpdateLog.filter((item) => item?.version === appVSContextState.latestVersion);

        if (result.length > 0) {
            setAppLatestUpdateLog(result[0].contents === '' ? '업데이트 정보가 없습니다.' : result[0].contents);
        } else {
            setAppLatestUpdateLog('업데이트 정보가 없습니다.');
        }

        let str = '';
        if (Platform.Version < appVSContextState.minimumAndroidSdk) {
        // if (16 < item.minimum_android_sdk) {
            str = '설치불가';
        } else {
            str = '다운로드';
        }
        setActionButtonText(str);

    }, [appVSContextState]);



    const onPressAppButton = async (appPackage, newVersion, url, [actionButtonText, setActionButtonText], [progressBar, setProgressBar], [nowDownloadJobId, setNowDownloadJobId]) => {

        console.log('====appPackage : ', appPackage);
        console.log('====newVersion : ', newVersion);

        const downloadfilePath = `${RNFS.ExternalCachesDirectoryPath}/@sem_temp.apk`;
        console.log('============= nowDownloadJobId :: ', nowDownloadJobId);

        // 다른 다운로드 작업 진행중 or 새로고침 중일 경우 예외처리
        if (globalContextState.isAppRefresh) {
            ToastAndroid.show('앱 새로고침 작업이 끝나고 시도해주세요.', ToastAndroid.SHORT);
            return;
        } else if (nowDownloadJobId != -1) {
            // 다운로드 취소
            setActionButtonText('취소 중');
            RNFS.stopDownload(nowDownloadJobId);
            console.log('stopDownload ', nowDownloadJobId);

            if (nowDownloadJobId == globalContextState.nowDownloadJobId) {
                console.log('current job ID (GlobalContext)');
                globalContextDispatch({
                    type: 'SET_NOW_DOWNLOAD_JOBID',
                    payload: -1
                });
            }

            // 임시파일 삭제 넣어야됨
            try {
                // update apk 파일이 이미 있는 경우 삭제
                
                
                const updateApkExist = await RNFS.exists(downloadfilePath);
                console.log('update temp APK exists : ', updateApkExist);
                if (updateApkExist) {
                    console.log('unlink update APK');
                    await RNFS.unlink(downloadfilePath);
                    console.log('unlink update APK OK');
                }
            } catch (e) {
                console.log('onPressAppButton : temp apk check error === ', e);
            }

            return;
        } else if (globalContextState.nowDownloadJobId != -1) {
            ToastAndroid.show('이미 다른 다운로드가 진행 중입니다.', ToastAndroid.SHORT);
            return;
        }


        console.log('url : ', url);
        console.log('DOWOLOAD ', downloadfilePath);
    
        if (!isInternetReachable) {
            ToastAndroid.show('인터넷이 연결되어 있지 않습니다. 와이파이를 연결해주세요.', ToastAndroid.SHORT);
            return;
        }
    
        try {
            const latestActionButtonText = actionButtonText;
            setActionButtonText('진행 중');

            let jobId = -1;

            // update apk 파일이 이미 있는 경우 삭제
            const updateApkExist = await RNFS.exists(downloadfilePath);
            console.log('update temp APK exists : ', updateApkExist);
            if (updateApkExist) {
                console.log('unlink update APK');
                await RNFS.unlink(downloadfilePath);
                console.log('unlink update APK OK');
            }


            // 자체 타임아웃 구현
            const downloadTimeout = setTimeout(() => {
                console.log('jobid :: ', jobId);
                if (jobId != -1) {
                    RNFS.stopDownload(jobId);
                    console.log('stopDownload ', jobId);

                    globalContextDispatch({
                        type: 'SET_NOW_DOWNLOAD_JOBID',
                        payload: -1
                    });
                }

                setNowDownloadJobId(-1);
                setProgressBar(0);

                ToastAndroid.show('서버에 연결하는데 실패했습니다.', ToastAndroid.SHORT);
                setActionButtonText(latestActionButtonText);

                console.log('====== timeout :');
            }, 30000);
        
            const ret = RNFS.downloadFile({
                fromUrl: url,
                toFile: downloadfilePath,
                connectionTimeout: 30000,
                readTimeout: 30000,
                progressInterval: 500,
                // progressDivider: 10,
                begin: (res) => {
                    clearTimeout(downloadTimeout);
                    console.log("Response begin ===\n\n");
                    console.log(res);
                    if (res.statusCode == 200) {
                        setProgressBar(0);
                        
                    } else {
                        ToastAndroid.show('다운로드에 실패했습니다. 잠시 후 다시 시도하세요.', ToastAndroid.SHORT);
                        setActionButtonText(latestActionButtonText);
                        setNowDownloadJobId(-1);
                        setProgressBar(0);
                    }
                },
                progress: (res) => {
                    //here you can calculate your progress for file download
            
                    console.log("Response written ===\n\n");
                    let progressPercent = (res.bytesWritten / res.contentLength) * 100; // to calculate in percentage
                    console.log("\n\nprogress===", progressPercent)
                    setProgressBar(progressPercent);
                    // this.setState({ progress: progressPercent.toString() });
                    // item.downloadProgress = progressPercent;
                    console.log(res);
                }
            });
            console.log('set jobId ::: ', ret.jobId);
            setNowDownloadJobId(ret.jobId);

            globalContextDispatch({
                type: 'SET_NOW_DOWNLOAD_JOBID',
                payload: ret.jobId
            });
            jobId = ret.jobId;
    
            ret.promise.then(res => {

                globalContextDispatch({
                    type: 'SET_NOW_DOWNLOAD_JOBID',
                    payload: -1
                });

                setNowDownloadJobId(-1);
                setProgressBar(0);

                if(res.statusCode == 200) {
                    // AppState.addEventListener('change', handleAppStateChange);
                    // setProgressBar(100);
                    setActionButtonText('설치 중');
                    console.log("res for saving file===", res);
                    console.log('globalContext installing package : ', appPackage, newVersion);

                    // 인스톨 패키지 기록
                    globalContextDispatch({
                        type: 'SET_INSTALLING_PACKAGE',
                        payload: {
                            package: appPackage,
                            version: newVersion,
                            setActionButtonText: setActionButtonText,
                            latestActionButtonText: latestActionButtonText,
                        }
                    });

                    RNApkInstallerN.install(downloadfilePath);
                }
            }).catch(error => {

                globalContextDispatch({
                    type: 'SET_NOW_DOWNLOAD_JOBID',
                    payload: -1
                });

                if (error.message.includes('Download has been aborted')) {
                    ToastAndroid.show('다운로드를 취소했습니다.', ToastAndroid.SHORT);
                } else {
                    ToastAndroid.show('다운로드에 실패했습니다. 잠시 후 다시 시도하세요.', ToastAndroid.SHORT);
                }
                
                setActionButtonText(latestActionButtonText);
                setNowDownloadJobId(-1);
                setProgressBar(0);

                console.log('_____ERROR ', error.message, error.code);
            });

        } catch (e) {
            console.log('error : ', e);
            if (globalContextState.nowDownloadJobId != -1) {
                RNFS.stopDownload(globalContextState.nowDownloadJobId);
                console.log('stopDownload ', globalContextState.nowDownloadJobId);

                globalContextDispatch({
                    type: 'SET_NOW_DOWNLOAD_JOBID',
                    payload: -1
                });
            }
            setNowDownloadJobId(-1);
            setProgressBar(0);

        }
    }
    



    return (
        <Modal
            animationType="none"
            transparent={true}
            visible={appVSContextState.modalVisible}
            onRequestClose={() => {
                if (globalContextState.nowDownloadJobId !== -1) {
                    ToastAndroid.show('앱 다운로드가 진행 중입니다. 다운로드가 끝난 후 시도하세요.', ToastAndroid.SHORT);
                } else {
                    appVSContextDispatch({
                        type: 'SET_MODAL_VISIBLE',
                        payload: false,
                    });
                }

            }}
        >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    {/* Modal Header */}
                    <View style={styles.modalHeader} >
                        <View style={styles.modalHeaderInner}>
                            {/* Icon */}
                            {/* <Image
                            source={{uri : appDetailContextState.iconPath}}
                            style={{width: 40, height: 40}}
                            resizeMethod='scale'
                            resizeMode='cover'
                            /> */}
                            <View>
                            <FastImage style={{width: 40, height: 40}} resizeMode={FastImage.resizeMode.contain} source={{uri: appVSContextState.iconPath}} />
                                {/* 패치 마크 */}
                                {
                                    appVSContextState?.isPatched && (
                                        <View style={{position: 'absolute', bottom: -2, right: -3}}>
                                            <FastImage
                                                source={require('../../image/patch.png')}
                                                style={{width: 30, height: 8}}
                                                resizeMode={FastImage.resizeMode.contain}
                                            />
                                        </View>
                                    )
                                }
                            </View>

                            {/* Text */}
                            <View style={{flex: 1, marginLeft: 10,}}>
                                <Text numberOfLines={1} style={{fontWeight: 'bold', fontSize: 15, lineHeight: 18,}}>{appVSContextState.label}</Text>
                                <Text numberOfLines={1} style={{fontSize: 12, lineHeight: 15,}}>버전 선택</Text>
                            </View>
                        </View>

                        {/* X 버튼 */}
                        <Pressable
                            style={({ pressed }) => [
                            {
                                width: 55,
                                // height: 50,
                                justifyContent: "center",
                                alignItems: "center",
                                // backgroundColor: '#a0a0a0',
                            }
                            ]}
                            onPress={() => {
                                if (globalContextState.nowDownloadJobId !== -1) {
                                    ToastAndroid.show('앱 다운로드가 진행 중입니다. 다운로드가 끝난 후 시도하세요.', ToastAndroid.SHORT);
                                } else {
                                    appVSContextDispatch({
                                        type: 'SET_MODAL_VISIBLE',
                                        payload: false,
                                    });
                                }
                            }}
                        >
                            <MaterialIcons name={'close'} color={'#000000'} size={35} />
                        </Pressable>
                        
                    </View>
                    
                    {/* Modal Body */}
                    <ScrollView 
                        style={{flex: 1, width: '100%',}}
                        ref={scrollViewRef}
                        onScroll={handleScroll}
                        onLayout={handleScrollLayout}
                    >
 
                        {/* 최신 버전 */}
                        <View style={{marginLeft: 10, marginBottom: 15,}}>
                            <Text style={{fontWeight: 'bold', fontSize: 16, lineHeight: 19, marginVertical: 15,}}>최신 버전</Text>

                            <View style={{flexDirection: 'row', justifyContent: 'space-between',}} >
                                <View style={{flex: 1, marginRight: 10,}}>
                                    <Text style={{fontSize: 12, lineHeight: 15,}}>{`[버전 : ${appVSContextState.latestVersion} / 업데이트 날짜 : ${appVSContextState.latestDate}]`}</Text>

                                    {/* 필요 안드로이드 버전 */}
                                    <View style={{flexDirection: 'row', marginVertical: 3,}}>
                                        <View style={{backgroundColor: '#000000', height: 20, borderRadius: 5, paddingHorizontal: 5, justifyContent: 'center',}} >
                                            <Text style={{fontWeight: 'bold', fontSize: 10, lineHeight: 13, color: '#ffffff',}}>Android {androidAPItoVersion(appVSContextState.minimumAndroidSdk)}</Text>
                                        </View>
                                        <View style={{flex: 1}}/>
                                    </View>

                                    <Text style={{fontSize: 14, color: '#000000', lineHeight: 17,}}>{appLatestUpdateLog}</Text>
   
                                </View>


                                {/* 실행/업데이트/다운로드 버튼 */}
                                <View style={{ justifyContent: 'center', marginRight: 10,}}>
                                    <Pressable 
                                        style={({ pressed }) => [
                                            {
                                                backgroundColor: actionButtonText == '설치불가'
                                                    ? '#404040'
                                                    : pressed
                                                        ? '#a0a0a0'
                                                        : 'white'
                                            },
                                            styles.appButton
                                        ]}
                                        onPress={() => {
                                            if (actionButtonText == '설치불가') {
                                                // const version = NativeModules.InstalledApps.getAndroidRelease();
                                                ToastAndroid.show(`해당 기기의 안드로이드 버전과 호환되지 않습니다.\n현재 Android 버전 : ${DeviceInfo.getSystemVersion()}\n필요 Android 버전 : ${androidAPItoVersion(appVSContextState.minimumAndroidSdk)}`, ToastAndroid.LONG);
                                            } else {
                                                onPressAppButton(appVSContextState.package, appVSContextState.latestVersion, appVSContextState.latestApkUrl, [actionButtonText, setActionButtonText], [progressBar, setProgressBar], [nowDownloadJobId, setNowDownloadJobId]);
                                            }
                                        }}
                                    >
                                        <Text style={{
                                            color : actionButtonText == '설치불가'
                                            ? '#ffffff'
                                            : '#000000',
                                            fontSize: 14,
                                            lineHeight: 17,
                                        }}>{actionButtonText}</Text>
                                        {
                                            nowDownloadJobId !== -1 && (
                                                <View style={{width: '90%', marginTop: 3,}}>
                                                    <ProgressBar
                                                        progress={progressBar}
                                                        height={8}
                                                        backgroundColor="#000000"
                                                        trackColor='#eeeeee'
                                                        animated={false}
                                                    />
                                                </View> 
                                            )
                                        }

                                    </Pressable>

                                    {/* 앱 용량 표시 */}
                                    {
                                        appVSContextState?.apk_size !== undefined && (
                                            <Text style={styles.appSize}>{formatBytes(appVSContextState.apk_size, 1)}</Text>
                                        )
                                    }
                                </View>


                            </View>

                        </View>

                        <View style={styles.separator} />

                        {/* 이전 버전 */}

                        <View style={{marginBottom: 5,}}>
                            <Text style={{fontWeight: 'bold', fontSize: 16, lineHeight: 19, marginTop: 15, marginBottom: 5, marginHorizontal: 10,}}>이전 버전</Text>
                            <AppVersionSelectList 
                                item={appVSContextState.versionList}
                                packageName={appVSContextState.package}
                                packageLabel={appVSContextState.label}
                                onPressAppButton={onPressAppButton}/>
                        </View>
                
                    </ScrollView>

                </View>
            </View>

            
            {/* 하단 페이지 이동 바 */}
            <BottomToolbar mainScrollViewRef={scrollViewRef} scrollCurrentY={scrollCurrentY} scrollDimensionHeight={scrollDimensionHeight} />
            
        </Modal>
    );
}


const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        // marginBottom: 22
    },
    modalView: {
        margin: 20,
        width: '90%',
        height: '95%',
        backgroundColor: "white",
        borderRadius: 10,
        // padding: 35,
        alignItems: "center",
        borderWidth: 2,
        borderColor: '#000000',
        // 그림자
        // shadowColor: "#000",
        // shadowOffset: {
        //   width: 0,
        //   height: 2
        // },
        // shadowOpacity: 0.25,
        // shadowRadius: 4,
        // elevation: 5
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        // paddingBottom: 10,
        borderBottomColor: '#000000',
        borderBottomWidth: 2,

    },
    modalHeaderInner: {
        flexDirection: 'row',
        flex: 1,
        height: 50,
        // backgroundColor: '#707070',
        alignItems: 'center',
        paddingLeft: 10,
        // paddingTop: 10,
        marginTop: 5,
        marginBottom: 5,
    },
    separator: {
        borderBottomWidth: 1.7,
        borderBottomColor: '#000000',
        width: '100%',
        // marginVertical: 10,
    },
    appSize: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 16,
    },
    appButton: {
        width: 70,
        height: 50,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#000000',
        justifyContent: 'center',
        alignItems: 'center',
    },
});