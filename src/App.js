/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, {useEffect, useContext, useState, useRef, createRef} from 'react';
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
  BackHandler,
} from 'react-native';


import {
  responsiveHeight,
  responsiveWidth,
  responsiveFontSize
} from "react-native-responsive-dimensions";

import { State, Directions, FlingGestureHandler, gestureHandlerRootHOC } from 'react-native-gesture-handler';

import RNFS from 'react-native-fs';
import FastImage from 'react-native-fast-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNetInfo } from '@react-native-community/netinfo';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import VersionCheck from 'react-native-version-check';
import AlertAsync from "react-native-alert-async";
import ProgressBar from "react-native-animated-progress";
import RNApkInstallerN from 'react-native-apk-installer-n';

import Toolbar from './Component/Toolbar';
import BottomToolbar from './Component/BottomToolbar';
import AppDetailModal from './Component/AppDetailModal';

import { globalContext } from './Component/GlobalContext';

import AppList from './Component/AppList';

Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.allowFontScaling = false;

const App: () => Node = () => {
  const [pathApps, setPathApps] = useState([]);
  const [buttonApps, setButtonApps] = useState([]);

  const appState = useRef(AppState.currentState);

  // Global Context
  const globalContextState = useContext(globalContext).state;
  const globalContextDispatch = useContext(globalContext).dispatch;

  const installingPackage = useRef({package: '', version: ''});



  // App Update Available state
  const isAppUpdateAvailable = useRef(false);
  const appUpdateUrl = useRef('');
  const [appUpdateHistory, setAppUpdateHistory] = useState('');

  // AsyncStorage Setting
  const savedAppSetting = useRef({});
  const defaultSetting = {
    updateAlertEnable: true,      // 앱 업데이트 알림 활성화 여부
    version: '',
  };

  useEffect(() => {
    async function getSavedSetting() {
      try {
        console.log('getSavedSetting');
        const asyncSettingData = await AsyncStorage.getItem('@SEM_SETTING');
        
        if (asyncSettingData == null) {
          // 초기값 넣기
          console.log('====AsyncStorage Save Default Setting');
          savedAppSetting.current = defaultSetting;

          // 해당 앱의 버전 넣기
          savedAppSetting.current.version = VersionCheck.getCurrentVersion();

          await AsyncStorage.setItem('@SEM_SETTING', JSON.stringify(defaultSetting));
          
        } else {
          savedAppSetting.current = JSON.parse(asyncSettingData);

          // 저장된 세팅의 버전과 현재 앱의 버전이 다를 경우 -> updateAlertEnable true로 초기화
          if (savedAppSetting.current.version !== VersionCheck.getCurrentVersion()) {
            console.log('====AsyncStorage Setting version is incurrent');
            savedAppSetting.current.updateAlertEnable = true;
            await AsyncStorage.setItem('@SEM_SETTING', JSON.stringify(defaultSetting));
          }

        }
      } catch (e) {
        console.log('====AsyncStorage Error : ', e);
      }

    }

    async function checkTempFile() {
      try {
        // update apk 파일이 이미 있는 경우 삭제
        const downloadfilePath = `${RNFS.DownloadDirectoryPath}/@sem_temp.apk`;
        
        const updateApkExist = await RNFS.exists(downloadfilePath);
        console.log('update temp APK exists : ', updateApkExist);
        if (updateApkExist) {
          console.log('unlink update APK');
          await RNFS.unlink(downloadfilePath);
          console.log('unlink update APK OK');
        }
      } catch (e) {
        console.log('useEffect checkTempFile : temp apk check error === ', e);
      }
    }

    // 앱 실행 시 AsyncStorage에 AppList를 기반으로 리스트 미리 만들기
    async function makeAppListFirst() {
      // AsyncStorage에 앱 리스트 가져오기
      const appList = await AsyncStorage.getItem('@APP_LIST');

      if (appList !== null) {
        readAppList(JSON.parse(appList));
      }

    }
    makeAppListFirst();
    getSavedSetting();
    checkTempFile();

  }, []);

  useEffect(() => {

    console.log('--------------------------useEffect globalContextState installingPackage');
    console.log(JSON.stringify(globalContextState.installingPackage));
    installingPackage.current = globalContextState.installingPackage;

  }, [globalContextState.installingPackage]);


  // back key press event
  useEffect(() => {
    const backAction = () => {
      Alert.alert("종료", "모두의이북을 종료하시겠습니까?", [
        {
          text: "취소",
          onPress: () => null,
          style: "cancel"
        },
        { text: "확인", onPress: () => BackHandler.exitApp() }
      ]);
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, []);




  const handleAppStateChange = async(nextAppState) => {
    console.log(`-----appState nextAppState ${appState.current} -> ${nextAppState}`);
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      console.log('-----App has come to the foreground!');

      const checkApp = installingPackage.current;
      // readAppList(managedAppList.app);

      // 인스톨 상태인지 확인
      if (checkApp.package.length > 0) {
        console.log('app install detected. ', JSON.stringify(checkApp));

        try {
          // update apk 파일이 이미 있는 경우 삭제
          const downloadfilePath = `${RNFS.DownloadDirectoryPath}/@sem_temp.apk`;

          const updateApkExist = await RNFS.exists(downloadfilePath);
          console.log('update temp APK exists : ', updateApkExist);
          if (updateApkExist) {
            console.log('unlink update APK');
            await RNFS.unlink(downloadfilePath);
            console.log('unlink update APK OK');
          }
        } catch (e) {
          console.log('handleAppStateChange : temp apk check error === ', e);
        }


        // 설치된 앱 목록 재확인
        let isInstallSuccess = false;
        let installAppLabel = '';

        function ascend(a, b) {
          return a.label.toLowerCase() > b.label.toLowerCase() ? 1 : a.label.toLowerCase() < b.label.toLowerCase() ? -1 : 0;
        }

        function ascendUninstalledApp(a, b) {
          // SDK 버전에 충족하지 않은 경우 (설치불가) 최하위로 내림
          let a_isUpdatable = (Platform.Version >= a.minimum_android_sdk) ? true : false;
          let b_isUpdatable = (Platform.Version >= b.minimum_android_sdk) ? true : false;
          
          if (a_isUpdatable === b_isUpdatable) {
            return a.label.toLowerCase() > b.label.toLowerCase() ? 1 : a.label.toLowerCase() < b.label.toLowerCase() ? -1 : 0;
          } else if (a_isUpdatable) {
            return -1;
          } else if (b_isUpdatable) {
            return 1;
          } else {
            return 0;
          }

        }

        function ascendInstalledApp(a, b) {
          
          // SDK 버전에 충족하고, 업데이트가 있으면 리스트 최상위로 올림
          
          let a_isUpdated = (a.versionName !== a.version && a.is_update_target && Platform.Version >= a.minimum_android_sdk) ? true : false;
          let b_isUpdated = (b.versionName !== b.version && b.is_update_target && Platform.Version >= b.minimum_android_sdk) ? true : false;

          if (a_isUpdated === b_isUpdated) {
            return a.label.toLowerCase() > b.label.toLowerCase() ? 1 : a.label.toLowerCase() < b.label.toLowerCase() ? -1 : 0;
          } else if (a_isUpdated) {
            return -1;
          } else if (b_isUpdated) {
            return 1;
          } else {
            return 0;
          }
          
        }

        const temp = await NativeModules.InstalledApps.getApps();
    
        let tempAllApps = JSON.parse(temp);
    
        let installedApps = new Array();
        managedAppList.current.app.filter((item) => {
          const result = tempAllApps.filter((i) => i.name === item.package);
    
          if (result.length > 0 && item.package === result[0].name) {
            installedApps.push({...item, versionName: result[0].versionName, versionCode: result[0].versionCode});

            // 설치되었는지 확인
            if (item.package == checkApp.package && 
                result[0].versionName == checkApp.version) {
                console.log ('install success');
                isInstallSuccess = true;
                installAppLabel = item.label;
            }
          }
        });
    
        let uninstalledApps = managedAppList.current.app.filter((item) => !installedApps.some((i) => i?.package === item.package)).sort(ascendUninstalledApp);
    
        installedApps.sort(ascendInstalledApp);
    
    
        // console.log('installedApps : ', JSON.stringify(installedApps));
        // console.log('uninstalledApps : ', JSON.stringify(uninstalledApps));
        console.log('installedApps : ', installedApps.length);
        console.log('uninstalledApps : ', uninstalledApps.length);
    
        setUninstalledAppList(uninstalledApps);
        if (installedApps.length > 0) setInstalledAppList(installedApps);

        if (isInstallSuccess) {
          console.log('app install success.');
          ToastAndroid.show(`${installAppLabel}\n앱을 설치했습니다.`, ToastAndroid.LONG);

          // 마지막으로 설치한 앱으로 기록
          // globalContextDispatch({
          //   type: 'SET_LATEST_INSTALLED_PACKAGE',
          //   payload: {
          //     package: globalContextState.installingPackage.package,
          //     version: globalContextState.installingPackage.version,
          //   }
          // });

        } else {
          console.log('app install failed.');
          ToastAndroid.show(`앱이 설치되지 않았습니다.`, ToastAndroid.LONG);
        }

        // 인스톨 패키지 초기화
        globalContextDispatch({
          type: 'SET_INSTALLING_PACKAGE',
          payload: {
            package: '',
            version: '',
          }
        });
        
      }
    }
    if (
      appState.current.match(/inactive|active/) &&
      nextAppState === 'background'
    ) {
      console.log('-----App has come to the background!');
    }
    appState.current = nextAppState;
  };

  useEffect(() => {
    console.log('============ Dimensions : ', Dimensions.get("window"));
    requestPermission();
    AppState.addEventListener('change', handleAppStateChange);
    return () => {
      AppState.removeEventListener('change', handleAppStateChange);
    };
  }, []);

  // Internet 연결 상태 확인
  const isInternetReachable = useNetInfo().isInternetReachable;

  // 현재 다운로드 중인 jobid
  const [nowDownloadJobId, setNowDownloadJobId] = useState(-1);

  // 앱 새로고침
  const [isAppRefresh, setIsAppRefresh] = useState(false);
  const [refreshText, setRefreshText] = useState('');
  const [refreshProgressBar, setRefreshProgressBar] = useState(-1);

  // 헤더만 활성화
  const [isHeaderEnable, setIsHeaderEnable] = useState(false);


  // 설치된 앱 리스트 활성화
  const [appUpdateListEnable, setAppUpdateListEnable] = useState(false);
  const [installedAppListEnable, setInstalledAppListEnable] = useState(true);
  const [uninstalledAppListEnable, setUninstalledAppListEnable] = useState(true);

  // 앱 리스트
  // const [managedAppList, setManagedAppList] = useState([]);
  const managedAppList = useRef([]);

  // 메인 스크롤뷰 Ref
  const mainScrollViewRef = useRef();

  // 앱 상세정보 Modal
  const [appDetailModal, setAppDetailModal] = useState(true);


  /* 안드로이드 권한 */

  const requestPermission = async () => {
    try {
      if (Platform.OS === "android") {
        await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
        ]).then( async(result)=>{
            if (result['android.permission.WRITE_EXTERNAL_STORAGE'] === 'granted'
            && result['android.permission.READ_EXTERNAL_STORAGE'] === 'granted') {
                console.log("모든 권한 획득");
                // await checkNoMedia();
                //ToastAndroid.show('환영합니다', ToastAndroid.SHORT);
            } else{
              console.log("권한거절");
              Alert.alert(
                '권한 설정',
                `앱을 사용하기 위해서 권한 설정이 필요합니다.`,
                [
                  {text: '확인', onPress: () => {
                    requestPermission();          
                  }},
                ],
                {cancelable: false},
              );
            }
        })
      
      }
    } catch (err) {
      console.warn(err);
    }
  };

  // 앱 업데이트를 수행한다
  const updateApp = async (url, forceUpdate=false) => {
    // 다른 다운로드 작업 진행중 or 새로고침 중일 경우 예외처리
    if (!forceUpdate) {

      if (isAppRefresh) {

        ToastAndroid.show('앱 새로고침 작업이 끝나고 시도해주세요.', ToastAndroid.SHORT);
        return;
  
      } else if (globalContextState.nowDownloadJobId != -1) {
  
        ToastAndroid.show('이미 다른 다운로드가 진행 중입니다.', ToastAndroid.SHORT);
        return;
  
      }

    }

    setIsHeaderEnable(true);
    setRefreshText('앱 업데이트 진행 중');

    const downloadfilePath = `${RNFS.DownloadDirectoryPath}/@sem_temp.apk`;
    console.log('url : ', url);
    console.log('DOWOLOAD ', downloadfilePath);
    let jobId = -1;

    try {

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

        ToastAndroid.show('서버에 연결하는데 실패했습니다.', ToastAndroid.SHORT);
        setRefreshText('앱 업데이트 실패');
        setRefreshProgressBar(-1);

        // 3초 뒤에 해더 제거
        setTimeout(() => {
          setIsHeaderEnable(false);
        }, 3000);

        console.log('====== timeout :');
      }, 15000);

      const ret = RNFS.downloadFile({
        fromUrl: url,
        toFile: downloadfilePath,
        connectionTimeout: 15000,
        readTimeout: 15000,
        progressInterval: 500,
        // progressDivider: 10,
        begin: (res) => {
          clearTimeout(downloadTimeout);
          console.log("Response begin ===\n\n");
          console.log(res);
          if (res.statusCode == 200) {
            setRefreshProgressBar(0);
            setNowDownloadJobId(res.jobId);
          } else {
            ToastAndroid.show('다운로드에 실패했습니다. 잠시 후 다시 시도하세요.', ToastAndroid.SHORT);
            setRefreshText('앱 업데이트 실패');
            setRefreshProgressBar(-1);
            setNowDownloadJobId(-1);

            // 3초 뒤에 해더 제거
            setTimeout(() => {
              setIsHeaderEnable(false);
            }, 3000);
          }
        },
        progress: (res) => {
          //here you can calculate your progress for file download
  
          console.log("Response written ===\n\n");
          let progressPercent = (res.bytesWritten / res.contentLength) * 100; // to calculate in percentage
          console.log("\n\nprogress===", progressPercent)
          setRefreshProgressBar(progressPercent);
          // this.setState({ progress: progressPercent.toString() });
          // item.downloadProgress = progressPercent;
          console.log(res);
        }
      });

      console.log('set jobId ::: ', ret.jobId);

      const result = await ret.promise;
      console.log(' result == ', result);

      if(result.statusCode == 200) {
        setRefreshProgressBar(-1);
        setRefreshText('앱 업데이트 설치');
        
        // 3초 뒤에 해더 제거
        setTimeout(() => {
          setIsHeaderEnable(false);
        }, 3000);
        console.log("res for saving file===", result);

        RNApkInstallerN.install(downloadfilePath);

      } else {
        throw result.statusCode;
      }

    } catch (e) {

      
      console.log ('updateApp failed :: ', e);
      ToastAndroid.show('업데이트를 실패했습니다. 잠시 후 다시 시도하세요.', ToastAndroid.SHORT);
      setRefreshText('앱 업데이트 실패');
      setRefreshProgressBar(-1);
      setNowDownloadJobId(-1);

      // 3초 뒤에 해더 제거
      setTimeout(() => {
        setIsHeaderEnable(false);
      }, 3000);
    }


  }

  // 기기에 설치된 앱 리스트를 가져온다
  const readAppList = async (appList) => {
    
    function ascend(a, b) {
      return a.label.toLowerCase() > b.label.toLowerCase() ? 1 : a.label.toLowerCase() < b.label.toLowerCase() ? -1 : 0;
    }


    function ascendUninstalledApp(a, b) {
      // SDK 버전에 충족하지 않은 경우 (설치불가) 최하위로 내림
      let a_isUpdatable = (Platform.Version >= a.minimum_android_sdk) ? true : false;
      let b_isUpdatable = (Platform.Version >= b.minimum_android_sdk) ? true : false;
      
      if (a_isUpdatable === b_isUpdatable) {
        return a.label.toLowerCase() > b.label.toLowerCase() ? 1 : a.label.toLowerCase() < b.label.toLowerCase() ? -1 : 0;
      } else if (a_isUpdatable) {
        return -1;
      } else if (b_isUpdatable) {
        return 1;
      } else {
        return 0;
      }

    }

    function ascendInstalledApp(a, b) {
      
      // SDK 버전에 충족하고, 업데이트가 있으면 리스트 최상위로 올림
      let a_isUpdated = (a.versionName !== a.version && a.is_update_target && Platform.Version >= a.minimum_android_sdk) ? true : false;
      let b_isUpdated = (b.versionName !== b.version && b.is_update_target && Platform.Version >= b.minimum_android_sdk) ? true : false;

      if (a_isUpdated === b_isUpdated) {
        return a.label.toLowerCase() > b.label.toLowerCase() ? 1 : a.label.toLowerCase() < b.label.toLowerCase() ? -1 : 0;
      } else if (a_isUpdated) {
        return -1;
      } else if (b_isUpdated) {
        return 1;
      } else {
        return 0;
      }
      
    }


    const temp = await NativeModules.InstalledApps.getApps();
    console.log(temp);
    
    let tempAllApps = JSON.parse(temp);
    // console.log('Installed App List : ', tempAllApps.length);
    // console.log('appList : ', JSON.stringify(appList));
    // console.log('tempAllApps : ', JSON.stringify(tempAllApps));


    let installedApps = new Array();
    appList.filter((item) => {
      const result = tempAllApps.filter((i) => i.name === item.package);

      if (result.length > 0 && item.package === result[0].name) {
        installedApps.push({...item, versionName: result[0].versionName, versionCode: result[0].versionCode});
      }
    });

    let uninstalledApps = appList.filter((item) => !installedApps.some((i) => i?.package === item.package)).sort(ascendUninstalledApp);

    installedApps.sort(ascendInstalledApp);


    // console.log('installedApps : ', JSON.stringify(installedApps));
    // console.log('uninstalledApps : ', JSON.stringify(uninstalledApps));
    console.log('installedApps : ', installedApps.length);
    console.log('uninstalledApps : ', uninstalledApps.length);

    setUninstalledAppList(uninstalledApps);
    if (installedApps.length > 0) setInstalledAppList(installedApps);
    
  }


  useEffect(() => {
    console.log('isInternet :: ', isInternetReachable);
    if (isInternetReachable && !isAppRefresh) {
      setIsAppRefresh(true);
    } else if (!isInternetReachable) {
      setRefreshText('인터넷이 연결되어 있지 않습니다.');
    }
  }, [isInternetReachable]);

  // 앱 새로고침
  const [uninstalledAppList, setUninstalledAppList] = useState([]);
  const [installedAppList, setInstalledAppList] = useState([]);

  useEffect(() => {

    async function appRefresh () {      
      if (!isAppRefresh) return;

      console.log('====APP REFRESH!!!!');

      globalContextDispatch({
        type: 'SET_REFRESH_STATE',
        payload: true
      });


      try {
        setRefreshText('새로고침 진행 중');
        

        let jobId = -1;


        // download update.json
        const url = 'https://repo.senia.kr/sem/update.json';
        const downloadfilePath = `file://${RNFS.CachesDirectoryPath}/update.json`;

        // update.json이 이미 있는 경우 삭제
        const updateJsonExist = await RNFS.exists(downloadfilePath);
        console.log('update JSON exists : ', updateJsonExist);
        if (updateJsonExist) {
          console.log('unlink update JSON');
          await RNFS.unlink(downloadfilePath);
          console.log('unlink update JSON OK');
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

          ToastAndroid.show('서버에 연결하는데 실패했습니다.', ToastAndroid.SHORT);
          setRefreshText('새로고침 실패, 네트워크 환경을 확인하세요.');

          globalContextDispatch({
            type: 'SET_REFRESH_STATE',
            payload: false
          });

          // 3초 뒤에 해더 제거
          setTimeout(() => {
            setIsAppRefresh(false);
          }, 3000);

          console.log('====== timeout :');
        }, 10000);
        

        const ret = RNFS.downloadFile({
          fromUrl: url,
          toFile: downloadfilePath,
          connectionTimeout: 10000,
          readTimeout: 10000,
          progressInterval: 500,
          // progressDivider: 10,
          begin: (res) => {
            clearTimeout(downloadTimeout);
            console.log("Response begin ===\n\n");
            console.log(res);
            if (res.statusCode == 200) {
              setNowDownloadJobId(res.jobId);
            } else {
              ToastAndroid.show('새로고침에 실패했습니다. 잠시 후 다시 시도하세요.', ToastAndroid.SHORT);
            }
            
          },
          progress: (res) => {
          //here you can calculate your progress for file download

            console.log("Response written ===\n\n");
            let progressPercent = (res.bytesWritten / res.contentLength) * 100; // to calculate in percentage
            console.log("\n\nprogress===", progressPercent)
            // setRefreshProgressBar(progressPercent);
            // this.setState({ progress: progressPercent.toString() });
            // item.downloadProgress = progressPercent;
            console.log(res);
          }
        });

        globalContextDispatch({
          type: 'SET_NOW_DOWNLOAD_JOBID',
          payload: ret.jobId
        });

        jobId = ret.jobId;

        ret.promise.then(async(res) => {

          globalContextDispatch({
            type: 'SET_NOW_DOWNLOAD_JOBID',
            payload: -1
          });

          setNowDownloadJobId(-1);


          if(res.statusCode == 200) {
            // setRefreshProgressBar(100);
            console.log("res for saving file===", res);
            const updateData = JSON.parse(await RNFS.readFile(downloadfilePath, 'utf8'));
            
            // console.log('update Data ::: ', JSON.stringify(updateData));

            // 앱 업데이트 유무 확인
            if (updateData.update_version !== VersionCheck.getCurrentVersion()) {
              console.log('need update');

              // 필수 업데이트가 아니고, 업데이트 알림을 이전에 끈 경우 알림 메시지 스킵savedAppSetting
              if (updateData.update_type === 'emergency' || savedAppSetting.current.updateAlertEnable) {

                const emergencyTitle = '중요 업데이트';
                const emergencyContents = '모두의이북 앱의 새로운 버전이 출시되었습니다. 업데이트를 하지 않을 시 앱을 사용하실 수 없습니다.';
                const emergencySelect = [
                  {text: '업데이트', onPress: () => 'yes'},
                ];
  
                const normalTitle = '업데이트';
                const normalContents = '모두의이북 앱의 새로운 버전이 출시되었습니다.';
                const normalSelect = [
                  {text: '알림끄기', onPress: () => 'disable'},
                  {text: '취소', onPress: () => 'no'},
                  {text: '업데이트', onPress: () => 'yes'},
                ];
  
                setRefreshText(`${updateData.update_type === 'emergency' ? emergencyTitle : normalTitle} 발견`);
  
                const choice = await AlertAsync(
                  updateData.update_type === 'emergency' ? emergencyTitle : normalTitle,
                  `${updateData.update_type === 'emergency' ? emergencyContents : normalContents}\n\n${updateData.update_history}`,
                  updateData.update_type === 'emergency' ? emergencySelect : normalSelect,
                  {
                    cancelable: updateData.update_type === 'emergency' ? false : true,
                    onDismiss: () => 'no',
                  },
                );
  
                console.log('choice :::: ', choice);

                if (choice === 'yes') {
                  // 업데이트 수행
                  await updateApp(updateData.update_url, true);

                  

                } else if (choice === 'disable') {
                  // 알림 표시 안함 AsyncStorage 저장
                  savedAppSetting.current.updateAlertEnable = false;
                  await AsyncStorage.setItem('@SEM_SETTING', JSON.stringify(savedAppSetting.current));
                  console.log('saved setting ===> AsyncStorage');
                }


              } else {
                console.log('update alert skip');
              }

              isAppUpdateAvailable.current = true;
              appUpdateUrl.current = updateData.update_url;
              setAppUpdateHistory(updateData.update_history);

            }
            

            // 아이콘 유무 체크, 없을 경우 새로 다운로드
            const appList = updateData.app;
            const appListLength = appList.length;


            // AsyncStorage에 앱 리스트 저장
            await AsyncStorage.setItem('@APP_LIST', JSON.stringify(appList));

            managedAppList.current = updateData;

            for (const [index, value] of appList.entries()) {

              // 헤더 표시 변경
              setRefreshText(`앱 정보 가져오는 중 (${index+1} / ${appListLength})`);
              // setRefreshProgressBar((index+1) / appListLength * 100);
              console.log(`${index} : ${value.package}`);
              const iconPath = `file://${RNFS.DocumentDirectoryPath}/${value.package}/ic_launcher.png`;
              const iconExist = await RNFS.exists(iconPath);
              console.log('icon path : ', iconPath);
              console.log('file exists : ', iconExist);
              if (!iconExist) {
                try {

                  await RNFS.mkdir(`file://${RNFS.DocumentDirectoryPath}/${value.package}/`);
                  console.log ('download icon :: ', value.icon_url);

                  const icon_ret = RNFS.downloadFile({
                    fromUrl: value.icon_url,
                    toFile: iconPath,
                  });

                  console.log('icon ready ', index);

                  const result = await icon_ret.promise;
                  console.log('icon end ', index);
                  console.log(' result == ', result);


                } catch (e) {
                  console.log ('for of error : ', e);
                }


              }

              // update history 처리
              const updateHistoryPath = `file://${RNFS.CachesDirectoryPath}/update_history.json`;
              try {
                const updateHistoryExist = await RNFS.exists(updateHistoryPath);
                console.log('update History exists : ', updateHistoryExist);
                if (updateHistoryExist) {
                  console.log('unlink update History');
                  await RNFS.unlink(updateHistoryPath);
                  console.log('unlink update History OK');
                }


                // AsyncStorage에 이미 저장되어있는지 확인

                let needUpdateHistory = true;
                const savedUpdateHistory = await AsyncStorage.getItem(value.package);

                if (savedUpdateHistory != null) {
                  const latestUpdateHistory = JSON.parse(savedUpdateHistory);
                  
                  const result = latestUpdateHistory.update_log.filter((item) => item?.version === value.version);
                  console.log('ddddddddddd  result length :: ', result.length)
                  if (result.length > 0) {
                    console.log('ddddddddddd  :: needUpdate false');
                    needUpdateHistory = false;
                  }
                }

                if (needUpdateHistory) {
                  // 서버에서 update_history.json 다운로드
                  const updateHistory_ret = RNFS.downloadFile({
                    fromUrl: value.update_history,
                    toFile: updateHistoryPath,
                  });
    
                  console.log('update history ready ', index);
    
                  const result2 = await updateHistory_ret.promise;
                  console.log('update history end ', index);
                  console.log(' result == ', result2);
    
                  const updateHistoryData = JSON.parse(await RNFS.readFile(updateHistoryPath, 'utf8'));
    
                  appList[index].update_history_contents = updateHistoryData;
                  console.log('[react-native-fs] get update history');

                  // AsyncStorage에 데이터 저장
                  await AsyncStorage.setItem(value.package, JSON.stringify(updateHistoryData));
                  // console.log('final update history :: ', JSON.stringify(appList[index].update_history_contents));

                } else {
                  // AsyncStorage에서 가져온 데이터를 사용
                  const latestUpdateHistory = JSON.parse(savedUpdateHistory);
                  appList[index].update_history_contents = latestUpdateHistory;
                  console.log('[asyncstorage] use update history');
                }


              } catch (e) {
                console.log ('for of error : ', e);
              }
            }

            
            // setRefreshProgressBar(100);
            readAppList(appList);
            // setUninstalledAppList(appList);
            setRefreshText('새로고침 성공');

            globalContextDispatch({
              type: 'SET_REFRESH_STATE',
              payload: false
            });

            // 3초 뒤에 해더 제거
            setTimeout(() => {
              setIsAppRefresh(false);
            }, 3000);
          }

        }).catch (e => {
          console.log("ERROR you ::: ", e);
        });
      } catch (e) {
        console.log('error : ', e);
        globalContextDispatch({
          type: 'SET_REFRESH_STATE',
          payload: false
        });

        setIsAppRefresh(false);
      }
    }

    appRefresh();

  }, [isAppRefresh]);






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



  return (
    <SafeAreaView style={styles.body}>
      <StatusBar barStyle='dark-content' nbackgroundColor={'white'} animated={false} />
      <ScrollView
        style={styles.scrollView}
        ref={mainScrollViewRef}
        onScroll={handleScroll}
        onLayout={handleScrollLayout}
      >
        <View style={{height: 12}} />
        {
          // 앱 업데이트 있을 경우 표시
          isAppUpdateAvailable.current && (
            <>
            <View style={styles.title}>
              <Text style={styles.titleText}>새 버전</Text>
              <View style={{marginRight: 5, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',}}>
                {/* 업데이트 버튼 */}
                <Pressable 
                  style={({ pressed }) => [
                    {
                      backgroundColor: pressed
                              ? '#a0a0a0'
                              : '#000000'
                    },
                    styles.appUpdateButton
                  ]}
                  onPress={() => {
                    updateApp(appUpdateUrl.current);
                  }}
                >
                  <Text style={{
                    fontSize: 14,
                    fontWeight: 'bold',
                    color: '#ffffff',
                  }}>
                    업데이트
                  </Text>
                </Pressable>

                {/* 업데이트 내역 확장 버튼 */}
                <Pressable 
                  style={({ pressed }) => [
                    {
                      backgroundColor: pressed
                        ? '#a0a0a0'
                        : 'white'
                    }
                  ]}
                  onPress={() => {
                    console.log('ok');
                    setAppUpdateListEnable(!appUpdateListEnable);
                  }}
                >
                  <MaterialIcons name={appUpdateListEnable ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} color={'#000000'} size={45} />
                </Pressable>
              </View>
            </View>
            {
              appUpdateListEnable && (
                <Text style={{
                  marginHorizontal: 20,
                  fontSize: 14,
                  marginBottom: 10,
                }} >{appUpdateHistory}</Text>
              )
            }

            
            <View style={{marginTop: 5, marginBottom: 10, borderTopColor: '#000000', borderTopWidth: 0.5, }} />
            </>
          )
        }
        {
          installedAppList.length > 0 &&
          (
          <>
          <View style={styles.title}>
            <Text style={styles.titleText}>설치된 앱</Text>
            <View style={{marginRight: 5}}>
              <Pressable 
                style={({ pressed }) => [
                  {
                    backgroundColor: pressed
                      ? '#a0a0a0'
                      : 'white'
                  }
                ]}
                onPress={() => {
                  console.log('ok');
                  setInstalledAppListEnable(!installedAppListEnable);
                }}
              >
                <MaterialIcons name={installedAppListEnable ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} color={'#000000'} size={45} />
              </Pressable>
            </View>
            
          </View>
          {
            installedAppListEnable && (<AppList item={installedAppList}/>)
          }
          
          <View style={{marginTop: 5, marginBottom: 10, borderTopColor: '#000000', borderTopWidth: 0.5, }} />
        </>
        )}

        
        <View style={styles.title}>
          <Text style={styles.titleText}>이 기기에 없음</Text>
          <View style={{marginRight: 5}}>
            <Pressable 
              style={({ pressed }) => [
                {
                  backgroundColor: pressed
                    ? '#a0a0a0'
                    : 'white'
                }
              ]}
              onPress={() => {
                console.log('ok');
                setUninstalledAppListEnable(!uninstalledAppListEnable);
              }}
            >
              <MaterialIcons name={uninstalledAppListEnable ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} color={'#000000'} size={45} />
            </Pressable>
          </View>
        </View>
        { uninstalledAppListEnable && (<AppList item={uninstalledAppList}/>) }
        

      </ScrollView>

      {/* 하단 페이지 이동 바 */}
      <BottomToolbar mainScrollViewRef={mainScrollViewRef} scrollCurrentY={scrollCurrentY} scrollDimensionHeight={scrollDimensionHeight} />
    

      <AppDetailModal />


      {/* header */}
      { (isAppRefresh || !isInternetReachable || isHeaderEnable) &&
        (
          <View style={{width: '100%', height: 30, backgroundColor: '#000000', paddingHorizontal: 10, justifyContent: 'center', position: 'absolute', top: 0,}}>
            <View style={{width: '100%', alignItems: 'center',}}>
              <Text style={{fontSize: 13, fontWeight:'bold', color: '#ffffff'}}>{refreshText}</Text>
            </View>
            {
              refreshProgressBar !== -1 && (
                <>
                  <View style={{height:2}} />
                  <ProgressBar
                    progress={refreshProgressBar}
                    height={3}
                    backgroundColor="#000000"
                    trackColor='#ffffff'
                    animated={false}
                  />
                </>
              )

            }

          </View>
        )
      }


    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    backgroundColor: 'white',
  },
  body: {
    flex: 1,
    backgroundColor: 'white',
  },
  engine: {
    position: 'absolute',
    right: 0,
  },
  title: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 10,
  },
  titleText: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#000000',
  },
  appBlock : {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#000000',
    marginHorizontal: 20,
    marginVertical: 5,
    paddingRight: 10,
    // width: '100%',
    height: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  icon: {
    //marginRight: 16,
    width: 60,
    height: 60,
    backgroundColor: '#a0a0a0',
    margin: 10,
    
  },
  text: {
    fontSize: 14,
    textAlign: 'center',
    //height: '100%',
    //marginHorizontal: 5,
  },
  viewIcon: {
    height: '65%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },
  viewText: {
    height: '35%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 2,
    width: '90%',
  },
  appListItem: {
    flex: 1,
    //padding: 10,
    //borderBottomColor: '#f0f0f0',
    //borderBottomWidth: 1,
    //flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appUpdateButton: {
    width: 70,
    height: 25,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appLabel: {
    fontSize: 20,
  },
  appVersion: {
    fontSize: 15,
  },
  appUpdateDate: {
    fontSize: 13,
  },
  bottomBarButton: {
    width: '60%',
    height: 40,
    backgroundColor: '#a0a0a0',
    justifyContent: 'center',
    alignItems: 'center',
  },


  buttonOpen: {
    backgroundColor: "#F194FF",
  },
  buttonClose: {
    backgroundColor: "#2196F3",
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center"
  },

});

export default App;
