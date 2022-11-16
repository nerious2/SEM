import React, {useEffect, useState, useRef, useContext} from 'react';
import {
    FlatList,
    StyleSheet,
    View,
    Pressable,
    Text,
    ToastAndroid,
    Image,
    AppState,
    Platform,
    NativeModules,
} from 'react-native';
import ProgressBar from "react-native-animated-progress";
import RNApkInstallerN from 'react-native-apk-installer-n';
import FastImage from 'react-native-fast-image';
import RNFS from 'react-native-fs';
import { useNetInfo } from '@react-native-community/netinfo';
import { appDetailContext } from './AppDetailModal';
import { globalContext, formatBytes, androidAPItoVersion } from './GlobalContext';
import { appVersionSelectContext } from './AppVersionSelectModal';
import DeviceInfo from 'react-native-device-info';

export default function AppList({item}) {

  return (
    <FlatList
      data={item}
      style={styles.block}
      renderItem={({item, index}) =>
        <AppListItem
            item={item}
            index={index}
        />
      }
      keyExtractor={(item, index) => index.toString()}
      ItemSeparatorComponent={() => <View />}
      ListFooterComponent={() => <View />}
    //   ListFooterComponentStyle={{height: 20,}}
    />
  );
}



// ==================== AppListItem ====================

function AppListItem({item, index}) {

    const appState = useRef(AppState.currentState);

    const isInternetReachable = useNetInfo().isInternetReachable;
    const [progressBar, setProgressBar] = useState(0);
    const [nowDownloadJobId, setNowDownloadJobId] = useState(-1);
    // 다운로드 버튼 텍스트
    const [actionButtonText, setActionButtonText] = useState('');


    // app detail modal context
    const appDetailContextState = useContext(appDetailContext).state;
    const appDetailContextDispatch = useContext(appDetailContext).dispatch;

    // app version select modal context
    const appVSContextState = useContext(appVersionSelectContext).state;
    const appVSContextDispatch = useContext(appVersionSelectContext).dispatch;

    // Global Context
    const globalContextState = useContext(globalContext).state;
    const globalContextDispatch = useContext(globalContext).dispatch;

    // icon path
    const iconPath = `file://${RNFS.DocumentDirectoryPath}/${item.package}/ic_launcher.png`;

    // is past app installed
    const [isPastVersion, setIsPastVersion] = useState(false);

    // jobId
    // const [jobId, setJobId] = useState(-1);


    // const handleAppStateChange = nextAppState => {
    //     console.log(`-----appState nextAppState ${appState.current} -> ${nextAppState}`);
    //     if (
    //       appState.current.match(/inactive|background/) &&
    //       nextAppState === 'active'
    //     ) {
    //         // 인스톨 패키지 기록
    //         globalContextDispatch({
    //             type: 'SET_INSTALLING_PACKAGE',
    //             payload: {
    //                 package: item.package,
    //                 version: item.version,
    //             }
    //         });

    //         AppState.removeEventListener('change', handleAppStateChange);

    //     }

    // }



    // 앱 실행
    const launchApp = (appPackage) => {
        NativeModules.InstalledApps.launchApplication(appPackage)
    }

    const onPressAppButton = async (appPackage, newVersion, url) => {


        // // debug
        // const downloadfilePath = `${RNFS.DownloadDirectoryPath}/${appPackage}.apk`;
        // console.log('globalContext installing package : ', appPackage, newVersion);

        // // 인스톨 패키지 기록
        // globalContextDispatch({
        //     type: 'SET_INSTALLING_PACKAGE',
        //     payload: {
        //         package: appPackage,
        //         version: newVersion,
        //     }
        // });

        // RNApkInstallerN.install(downloadfilePath);
        // return;
        // //debug end

        if (actionButtonText === '실행') {
            launchApp(appPackage);
            return;
        }

        const downloadfilePath = `${RNFS.ExternalCachesDirectoryPath}/@sem_temp.apk`;

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
                    if (res.statusCode !== 200) {
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
    
    useEffect(() => {
        let str = '';




        if (item?.versionName) {
            // 버전이 존재하는 경우 -> 설치된 앱

            // 해당 앱이 버전 선택 가능한 앱이며 (item.is_past_version) 해당 버전대가 설치된 경우는 실행으로 띄워야함
            if (item?.is_past_version !== undefined && item.is_past_version) {
                
                const result = item?.past_version_list?.version_list?.filter((item2) => item2?.version === item.versionName);
                console.log(`${item.package}  result length :: ${result?.length}`)
                if (result?.length > 0) {
                    console.log(`[${item.package}] past version installed`);
                    setIsPastVersion(true);
                    str = '실행';
                    
                } else {
                    console.log('ssssssssssssssss  :: failed');
                    setIsPastVersion(false);

                    if (item.versionName !== item.version && item.is_update_target && Platform.Version >= item.minimum_android_sdk) {
                        str = '업데이트';
                    } else {
                        str = '실행';
                    }
                }

            } else if (item.versionName !== item.version && item.is_update_target && Platform.Version >= item.minimum_android_sdk) {
                str = '업데이트';
            } else {
                str = '실행';
            }
        } else {
            // 안드로이드 API 확인
            if (item?.is_past_version !== undefined && item.is_past_version) {
                str = '버전선택';
            } else if (Platform.Version < item.minimum_android_sdk) {
                str = '설치불가';
            } else {
                str = '다운로드';
            }
        }
        setActionButtonText(str);
    }, [item]);


    return (
        <Pressable
            style={({ pressed }) => [
                {
                    // backgroundColor: pressed
                    // ? '#a0a0a0'
                    // : 'white'
                },
                styles.appBlock
            ]}
            onPress={() => {
                // app detail modal 활성화
                appDetailContextDispatch({
                    type: 'INIT_APP_DETAIL',
                    payload: {
                        modalVisible: true,
                        package: item.package,
                        label: item.label,
                        iconPath: iconPath,
                        description: item?.update_history_contents?.description,
                        patch_description: item?.update_history_contents?.patch_description,
                        update_log: item?.update_history_contents?.update_log,
                        isPatched: item?.is_patched,
                        version: item.version,
                        date: item.date,
                        minimumAndroidSdk: item.minimum_android_sdk,
                    },
                });

            }}
        >
            <View style={{flexDirection: 'row', flex: 1,}}>
                <View style={styles.icon}>
                {/* const iconPath = `file://${RNFS.DocumentDirectoryPath}/${value.package}/ic_launcher.png`; */}
                    {/* <Image
                        source ={{uri : iconPath}}
                        style={{width: 60, height: 60}}
                    /> */}
                    <FastImage style={{width: 60, height: 60}} resizeMode={FastImage.resizeMode.contain} source={{uri: iconPath}} />
                    {/* 패치 마크 */}
                    {
                        item?.is_patched && (
                            <View style={{position: 'absolute', bottom: 10, right: -3}}>
                                <FastImage
                                    source={require('../../image/patch.png')}
                                    style={{width: 45, height: 13}}
                                    resizeMode={FastImage.resizeMode.contain}
                                />
                            </View>
                        )
                    }
                </View>
                <View style={{justifyContent: 'space-between', flex: 1, marginTop: 10, marginBottom: 11, marginRight: 10,}}>
                    <View>
                        <Text style={styles.appLabel} numberOfLines={1}>{item.label}</Text>
                        <View style={{flexDirection: 'row'}}>
                            {
                                item?.versionName && (item?.versionName !== item.version) && (
                                    <Text style={styles.appVersion} numberOfLines={1}>{item.versionName} {!isPastVersion && '→'} </Text>
                                )
                            }
                            {
                                !isPastVersion && (
                                    <Text style={[
                                        {
                                            fontWeight: item?.versionName && (item?.versionName !== item.version) 
                                            ? 'bold' : 'normal',
                                            textDecorationLine: item?.versionName && (item?.versionName !== item.version) && Platform.Version < item.minimum_android_sdk
                                            ? 'line-through' : 'none',
                                            flex: 1,
                                        },
                                        styles.appVersion
                                    ]}
                                    numberOfLines={1}
                                    >
                                        {item.version}
                                    </Text>
                                )
                            }
                        </View>
                        
                    </View>

                    <View style={{flexDirection: 'row'}} >
                        {/* 업데이트 날짜 */}
                        <Text style={styles.appUpdateDate} numberOfLines={1}>{item.date}</Text>
                        {
                            // apk_size가 존재하는 경우 : 용량 표시
                            item?.apk_size !== undefined && actionButtonText !== '실행' && actionButtonText !== '버전선택' &&(
                                <Text style={styles.appSize} numberOfLines={1}> | {formatBytes(item.apk_size, 1)}</Text>
                            )
                        }
                    </View>
                    

                </View>
            </View>

            {/* 실행/업데이트/다운로드 버튼 */}
            <View style={{ justifyContent: 'center'}}>
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
                        if (actionButtonText === '설치불가') {
                            // const version = NativeModules.InstalledApps.getAndroidRelease();
                            ToastAndroid.show(`해당 기기의 안드로이드 버전과 호환되지 않습니다.\n현재 Android 버전 : ${DeviceInfo.getSystemVersion()}\n필요 Android 버전 : ${androidAPItoVersion(item.minimum_android_sdk)}`, ToastAndroid.LONG);
                        } else if (actionButtonText === '버전선택') {
                            // app version select modal 활성화
                            console.log('======= ', JSON.stringify(item?.past_version_list));
                            appVSContextDispatch({
                                type: 'INIT_APP_VERSION_LIST',
                                payload: {
                                    modalVisible: true,
                                    package: item.package,
                                    label: item.label,
                                    iconPath: iconPath,
                                    latestVersion: item.version,
                                    latestDate: item.date,
                                    latestApkUrl: item.apk_url,
                                    latestUpdateLog: item?.update_history_contents?.update_log,
                                    minimumAndroidSdk: item.minimum_android_sdk,
                                    versionCode: item?.past_version_list?.version_code,
                                    versionList: item?.past_version_list?.version_list,
                                    isPatched: item?.is_patched,
                                    apk_size: item?.apk_size,
                                },
                            });
                        } else {
                            onPressAppButton(item.package, item.version, item.apk_url);
                        }
                    }}
                >
                    <Text style={{
                        color : actionButtonText == '설치불가'
                        ? '#ffffff'
                        : '#000000',
                    }}>{actionButtonText}</Text>
                    {
                        nowDownloadJobId != -1 && (
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
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    block: {backgroundColor: '#ffffff'},
    appBlock : {
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#000000',
        marginHorizontal: 20,
        marginVertical: 5,
        paddingRight: 10,
        // width: '100%',
        // height: 100,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    icon: {
        //marginRight: 16,
        width: 60,
        // height: 60,
        // backgroundColor: '#a0a0a0',
        marginHorizontal: 10,
        justifyContent: 'center',
        // alignItems: 'center',
    },
    appLabel: {
        fontSize: 20,
        marginBottom: -2,
    },
    appVersion: {
        fontSize: 15,
    },
    appUpdateDate: {
        fontSize: 13,
    },
    appSize: {
        fontSize: 13,
        flex: 1,
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