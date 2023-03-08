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
  Linking,
  Dimensions,
  Platform,
  AppState,
  ToastAndroid,
  PermissionsAndroid,
  BackHandler,
  TextInput,
  Keyboard,
} from 'react-native';


import RNFS, { readdir } from 'react-native-fs';
import FastImage from 'react-native-fast-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNetInfo } from '@react-native-community/netinfo';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import DeviceInfo from 'react-native-device-info';
import AlertAsync from "react-native-alert-async";
import ProgressBar from "react-native-animated-progress";
import RNApkInstallerN from 'react-native-apk-installer-n';
import RNExitApp from 'react-native-exit-app';

import BottomToolbar from './Component/BottomToolbar';
import AppDetailModal from './Component/AppDetailModal';
import AppVersionSelectModal, { appVersionSelectContext, initialAppVersionSelectState } from './Component/AppVersionSelectModal';

import { globalContext, useDidMountEffect } from './Component/GlobalContext';

import AppList from './Component/AppList';
import FloatingButton from './Component/FloatingButton';

import {
  Menu,
  MenuProvider,
  MenuOptions,
  MenuOption,
  MenuTrigger,
  renderers,
  withMenuContext,
} from 'react-native-popup-menu';

Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.allowFontScaling = false;

const githubPage = 'https://github.com/nerious2/SEM';

const MainScreen = ({navigation, route}) => {
  const [pathApps, setPathApps] = useState([]);
  const [buttonApps, setButtonApps] = useState([]);

  const appState = useRef(AppState.currentState);

  // Global Context
  const globalContextState = useContext(globalContext).state;
  const globalContextDispatch = useContext(globalContext).dispatch;

  // App VersionSelect modal state
  const appVSContextState = useContext(appVersionSelectContext).state;
  const appVSContextDispatch = useContext(appVersionSelectContext).dispatch;

  // App VersionSelect modal state on handleAppStateChange
  const isAppVSModalVisable = useRef(false);


  const installingPackage = useRef({package: '', version: ''});
  const deletingPackage = useRef({package: ''});


  // App Update Available state
  const isAppUpdateAvailable = useRef(false);
  const appUpdateUrl = useRef('');
  const [appUpdateHistory, setAppUpdateHistory] = useState('');

  // App Notice Available state
  const isAppNoticeAvailable = useRef(false);
  const [appNoticeHistory, setAppNoticeHistory] = useState('');

  // AsyncStorage Setting
  const savedAppSetting = useRef({});
  const defaultSetting = {
    updateAlertEnable: true,      // 앱 업데이트 알림 활성화 여부
    version: '',
  };
  
  // main screen sub menu Ref
  const menuRef = useRef();

  // not update list Ref
  const notNotifyUpdateRef = useRef();
  

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
          savedAppSetting.current.version = DeviceInfo.getVersion();

          await AsyncStorage.setItem('@SEM_SETTING', JSON.stringify(defaultSetting));
          
        } else {
          savedAppSetting.current = JSON.parse(asyncSettingData);

          // 저장된 세팅의 버전과 현재 앱의 버전이 다를 경우 -> updateAlertEnable true로 초기화
          if (savedAppSetting.current.version !== DeviceInfo.getVersion()) {
            console.log('====AsyncStorage Setting version is incurrent');
            savedAppSetting.current.updateAlertEnable = true;
            // 해당 앱의 버전 넣기
            savedAppSetting.current.version = DeviceInfo.getVersion();
            await AsyncStorage.setItem('@SEM_SETTING', JSON.stringify(savedAppSetting.current));
          }

        }

        // device info 설정
        const model = DeviceInfo.getModel();
        switch (model) {
        case 'CREMA-0630L':   // CARTA
        case 'CREMA-0610L':   // SHINE
        case 'CREMA-0640L':   // SOUND
        case 'CREMA-0640N':   // SOUND_LINE
        case 'CREMA-0650L':   // CARTA_PLUS
        case 'CREMA-0710C':   // CARTA_GRANDE
        case 'CREMA-1010P':   // EXPERT
        case 'CREMA-0660L':   // SOUND_UP
        case 'CREMA-0670C':   // CARTA_G
          globalContextDispatch({
            type: 'SET_DEVICE_MODEL',
            payload: 'crema_old'
          })
          break;
        case 'CREMA-0680S':   // CREMAS
          globalContextDispatch({
            type: 'SET_DEVICE_MODEL',
            payload: 'crema_s'
          })
          break;
        default:
          globalContextDispatch({
            type: 'SET_DEVICE_MODEL',
            payload: 'etc'
          })
          break;
        }

      } catch (e) {
        console.log('====AsyncStorage Error : ', e);
        ToastAndroid.show(e, ToastAndroid.SHORT);
      }

    }

    async function checkTempFile() {
      try {
        // update apk 파일이 이미 있는 경우 삭제
        const downloadfilePath = `${RNFS.ExternalCachesDirectoryPath}/@sem_temp.apk`;
        
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

      await getNotNotifyUpdatePackage();

      // AsyncStorage에 앱 리스트 가져오기
      const appList = await AsyncStorage.getItem('@APP_LIST');

      if (appList !== null) {
        const updateJsonPath = `file://${RNFS.CachesDirectoryPath}/update.json`;
        let updateData;
        let updateJson;

        try {
          const isUpdateJsonFileExists = await RNFS.exists(updateJsonPath);
          if (isUpdateJsonFileExists) {
            updateData = await RNFS.readFile(updateJsonPath, 'utf8');
            updateJson = JSON.parse(updateData);
          } else {
            console.log ('Exists : update.json is not found.');
            updateJson = {};
          }

        } catch (e) {
          console.log ('Error : update.json is not found. ', e);
          updateJson = {};
        }

        // 관리할 앱 리스트를 ref에 저장
        managedAppList.current = {
          ...updateJson,
          app: JSON.parse(appList),
        };
        // console.log('managedAppList ::: ', managedAppList.current);
        console.log('[makeAppListFirst globalContextState.notNotifyUpdatePackage] ', globalContextState.notNotifyUpdatePackage);
        readAppList(JSON.parse(appList));
      }

    }

    // 앱 처음 실행 시 동작 코드
    console.log('THIS VERSION : ', DeviceInfo.getVersion());
    makeAppListFirst();
    getSavedSetting();
    checkTempFile();

  }, []);

  useEffect(() => {

    console.log('--------------------------useEffect globalContextState installingPackage');
    console.log(JSON.stringify(globalContextState.installingPackage));
    installingPackage.current = globalContextState.installingPackage;

  }, [globalContextState.installingPackage]);

  useEffect(() => {

    console.log('--------------------------useEffect globalContextState deletingPackage');
    console.log(JSON.stringify(globalContextState.deletingPackage));
    deletingPackage.current = globalContextState.deletingPackage;

  }, [globalContextState.deletingPackage]);


  useEffect(() => {
    console.log('--------------------------useEffect appVSContextState modalVisible ', appVSContextState.modalVisible);
    isAppVSModalVisable.current = appVSContextState.modalVisible;
  }, [appVSContextState.modalVisible]);


  const backAction = () => {


    Alert.alert("종료", "모두의이북을 종료하시겠습니까?", [
      {
        text: "취소",
        onPress: () => null,
        style: "cancel"
      },
      { text: "확인", onPress: () => RNExitApp.exitApp() }
    ]);
    return true;
  };

  // back key press event
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
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


  // 검색 텍스트 State
  const [searchText, setSearchText] = useState('');
  const searchTextRef = useRef('');

  // 메인 스크롤 활성화, 비활성화
  const [mainScrollEnable, setMainScrollEnable] = useState(true);
  // const mainScrollEnable = useRef(false);

  // 설치된 앱 리스트 활성화
  const [appUpdateListEnable, setAppUpdateListEnable] = useState(false);
  const [appNoticeListEnable, setAppNoticeListEnable] = useState(false);
  const [installedAppListEnable, setInstalledAppListEnable] = useState(true);
  const [uninstalledAppListEnable, setUninstalledAppListEnable] = useState(true);

  // 앱 리스트
  // const [managedAppList, setManagedAppList] = useState([]);
  const managedAppList = useRef([]);

  // 메인 스크롤뷰 Ref
  const mainScrollViewRef = useRef();

  // 앱 상세정보 Modal
  const [appDetailModal, setAppDetailModal] = useState(true);

  // 앱을 초기화한다
  const resetApp = () => {

    // 앱 새로고침
    if (isAppRefresh) {
      ToastAndroid.show('새로고침이 끝나고 시도하세요.', ToastAndroid.SHORT);
      return;
    }
  
    if (globalContextState.nowDownloadJobId != -1) {
      ToastAndroid.show('앱의 다운로드가 끝나고 시도하세요.', ToastAndroid.SHORT);
      return;
    }


    Alert.alert("앱 초기화", "모두의이북 앱을 초기화하시겠습니까?\n문제가 발생한 경우에만 초기화를 하시기를 권장합니다.", [
      {
        text: "취소",
        onPress: () => null,
        style: "cancel"
      },
      { text: "확인", onPress: async () => {
        // 앱 초기화 실행
        setRefreshText('앱 초기화 진행 중');
        setIsHeaderEnable(true);

        // ExternalCache
        try {
          const extCacheDirs = await readdir(`file://${RNFS.ExternalCachesDirectoryPath}`);
          console.log('Ext Cache Dirs : ', extCacheDirs);

          for (const [index, value] of extCacheDirs.entries()) {
            try {
              console.log('DELETE :: ', value);
              await RNFS.unlink(`file://${RNFS.ExternalCachesDirectoryPath}/${value}`);
            } catch(e) {
              console.log(e.message);
            }
          }
        } catch(e) {
          console.log('Ext cache clear Error : ', e);
          ToastAndroid.show(`Ext cache clear Error : ${e}`, ToastAndroid.SHORT);
        }
        
        // Cache
        try {
          const cacheDirs = await readdir(`file://${RNFS.CachesDirectoryPath}`);
          console.log('Cache Dirs : ', cacheDirs);

          for (const [index, value] of cacheDirs.entries()) {
            try {
              console.log('DELETE :: ', value);
              await RNFS.unlink(`file://${RNFS.CachesDirectoryPath}/${value}`);
            } catch(e) {
              console.log(e.message);
            }
          }
        } catch(e) {
          console.log('Cache clear Error : ', e);
          ToastAndroid.show(`Cache clear Error : ${e}`, ToastAndroid.SHORT);
        }

        // Document
        try {
          const docDirs = await readdir(`file://${RNFS.DocumentDirectoryPath}`);
          console.log('Document Dirs : ', docDirs);

          for (const [index, value] of docDirs.entries()) {
            try {
              console.log('DELETE :: ', value);
              await RNFS.unlink(`file://${RNFS.DocumentDirectoryPath}/${value}`);
            } catch(e) {
              console.log(e.message);
            }
          }
        } catch(e) {
          console.log('Document clear Error : ', e);
          ToastAndroid.show(`Document clear Error : ${e}`, ToastAndroid.SHORT);
        }



        // AsyncStorage 삭제
        try {
          await AsyncStorage.clear();
        } catch(e) {
          console.log('AsyncStorage clear Error : ', e);
          ToastAndroid.show(`AsyncStorage clear Error : ${e}`, ToastAndroid.SHORT);
        }
        
        setRefreshText('앱 초기화 성공');

        Alert.alert("앱 초기화 완료", "모두의이북 앱을 초기화하였습니다.\n앱을 다시 실행하시면 서버에서 모든 정보를 다시 가져옵니다.\n\n앱을 종료합니다.", [
            { text: "확인", onPress: () => {
                // 앱 종료
                RNExitApp.exitApp();
              }
            }
          ], { cancelable: false }
        );
      } },
    ],
      { cancelable: true }
    );
  }

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

    const downloadfilePath = `${RNFS.ExternalCachesDirectoryPath}/@sem_temp.apk`;
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
        setRefreshProgressBar(-1);

        ToastAndroid.show('서버에 연결하는데 실패했습니다.', ToastAndroid.SHORT);
        setRefreshText('앱 업데이트 실패');

        // 3초 뒤에 해더 제거
        setTimeout(() => {
          setIsHeaderEnable(false);
        }, 3000);

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

  // 앱 새로고침
  const refreshButtonFunction = () => {
    // 앱 새로고침
    if (isAppRefresh) {
      ToastAndroid.show('이미 새로고침이 진행 중입니다.', ToastAndroid.SHORT);
      return;
    }
    
    if (!isInternetReachable) {
      ToastAndroid.show('인터넷 연결 상태를 확인해주세요.', ToastAndroid.SHORT);
      return;
    }

    if (globalContextState.nowDownloadJobId != -1) {
      ToastAndroid.show('앱의 다운로드가 끝나고 시도하세요.', ToastAndroid.SHORT);
      return;
    }
    setRefreshText('새로고침 진행 중');
    setIsAppRefresh(true);
  }


  // 미설치 앱, 설치 앱 정렬 함수
  function ascendUninstalledApp(a, b) {
    // SDK 버전에 충족하지 않은 경우 (설치불가) 최하위로 내림
    let a_isUpdatable = (a?.is_past_version === true || Platform.Version >= a.minimum_android_sdk) ? true : false;
    let b_isUpdatable = (b?.is_past_version === true || Platform.Version >= b.minimum_android_sdk) ? true : false;
    
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
    const a_isNotNotify = notNotifyUpdateRef.current !== null ? notNotifyUpdateRef.current.filter((item2) => {
      return item2 == a.package
    }) : [];

    const b_isNotNotify = notNotifyUpdateRef.current !== null ? notNotifyUpdateRef.current.filter((item2) => {
      return item2 == b.package
    }) : [];

    // console.log(`[ascendInstalledApp] ${a.package} a_isNotNotify : ${a_isNotNotify.length}, ${b.package} b_isNotNotify : ${b_isNotNotify.length}`);

    const a_newVersion = a.versionName.toUpperCase().includes('PATCH_V') ? a.patch_info.version : a.version;
    const b_newVersion = b.versionName.toUpperCase().includes('PATCH_V') ? b.patch_info.version : b.version;

    let a_isUpdated = (a_isNotNotify.length === 0 && !a?.is_past_version_installed && a.versionName !== a_newVersion && a.is_update_target && Platform.Version >= a.minimum_android_sdk) ? true : false;
    let b_isUpdated = (b_isNotNotify.length === 0 && !b?.is_past_version_installed && b.versionName !== b_newVersion && b.is_update_target && Platform.Version >= b.minimum_android_sdk) ? true : false;

    // console.log(`[ascendInstalledApp] ${a.package} a_isUpdated : ${a_isUpdated}, ${b.package} b_isUpdated : ${b_isUpdated}`);
    // console.log(`[ascendInstalledApp] ${a.label.toLowerCase() > b.label.toLowerCase()} ${a.label.toLowerCase() < b.label.toLowerCase()}, ${a.label.toLowerCase() == b.label.toLowerCase()}\n`);
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


  // 기기에 설치된 앱 리스트를 가져온다
  const readAppList = async (appList) => {

    const temp = await NativeModules.InstalledApps.getApps();
    console.log(temp);
    
    let tempAllApps = JSON.parse(temp);
    // console.log('Installed App List : ', tempAllApps.length);
    // console.log('appList : ', JSON.stringify(appList));
    // console.log('tempAllApps : ', JSON.stringify(tempAllApps));

    let installedApps = new Array();
    appList.filter((item) => {
      const result = tempAllApps.filter((i) => i.name === item.package);

      let is_past_version_installed = false;

      if (result.length > 0 && item.package === result[0].name) {

        // is_past_version이 true이고 past_version_list에서 현재 설치된 버전과 일치하는 경우 -> is_past_version_installed : true
        if (item?.is_past_version !== undefined && item.is_past_version && item?.past_version_list?.version_list !== undefined) {
          const result2 = item?.past_version_list?.version_list?.filter((item2) => item2?.version === result[0].versionName);

          if (result2.length > 0) {
            console.log(`[${item.package}] past version installed`);
            is_past_version_installed = true;
          }
        }
        
        installedApps.push({...item, versionName: result[0].versionName, versionCode: result[0].versionCode, is_past_version_installed: is_past_version_installed});
      }
    });

    let uninstalledApps = appList.filter((item) => !installedApps.some((i) => i?.package === item.package)).sort(ascendUninstalledApp);

    installedApps.sort(ascendInstalledApp);

    console.log('installedApps : ', installedApps.length);
    console.log('uninstalledApps : ', uninstalledApps.length);

    uninstalledAppListRef.current = uninstalledApps;
    installedAppListRef.current = installedApps;

    searchApp(searchText);
    
  }

  // 앱 별 업데이트 알림 체크, 리스트 정렬 방식 최신화

  async function getNotNotifyUpdatePackage () {
    // global context에 값이 없을 경우 (앱 실행 초기) AsyncStorage에서 데이터 가져옴
    console.log('[globalContextState.notNotifyUpdatePackage] : ', globalContextState.notNotifyUpdatePackage?.length);
    if (globalContextState.notNotifyUpdatePackage == null) {
      console.log('[globalContextState.notNotifyUpdatePackage] initialize');
      try {
        // AsyncStorage에 앱 리스트 가져오기
        let notNotifyList = await AsyncStorage.getItem('@NOT_NOTIFY_UPDATE_LIST');

        console.log('notNotifyList : ', notNotifyList);
        if (notNotifyList == null) {
          notNotifyList = '[]';
        }

        // 업데이트 알리지 않음 기록
        globalContextDispatch({
          type: 'SET_NOT_NOTIFY_UPDATE_PACKAGE',
          payload: JSON.parse(notNotifyList)
        });

        // Ref
        notNotifyUpdateRef.current = JSON.parse(notNotifyList);

      } catch (e) {
        console.log('globalContextState.notNotifyUpdatePackage error : ', e);
      }

    } else {
      // 변경 사항 발생 -> installedAppListRef 정렬 -> searchApp(searchText)
      notNotifyUpdateRef.current = globalContextState.notNotifyUpdatePackage;
      // AsyncStorage 저장
      await AsyncStorage.setItem('@NOT_NOTIFY_UPDATE_LIST', JSON.stringify(globalContextState.notNotifyUpdatePackage));
      console.log('[globalContextState.notNotifyUpdatePackage] asyncStorage save');
    }
    installedAppListRef.current = installedAppListRef.current.sort(ascendInstalledApp);
    console.log('[globalContextState.notNotifyUpdatePackage] installedAppListRef sort');
    searchApp(searchText);
  }
  
  useDidMountEffect(() => {
    console.log('[useDidMountEffect] getNotNotifyUpdatePackage');
    getNotNotifyUpdatePackage();
  }, [globalContextState.notNotifyUpdatePackage]);


  useEffect(() => {
    console.log('isInternet :: ', isInternetReachable);
    if (isInternetReachable && !isAppRefresh) {
      setIsAppRefresh(true);
    } else if (!isInternetReachable) {
      setRefreshText('인터넷이 연결되어 있지 않습니다.');
    }
  }, [isInternetReachable]);


  // 설치된 앱, 미설치 앱 리스트 (화면 리스트 노출용)
  const [uninstalledAppList, setUninstalledAppList] = useState([]);
  const [installedAppList, setInstalledAppList] = useState([]);

  // 설치된 앱, 미설치 앱 리스트
  const uninstalledAppListRef = useRef([]);
  const installedAppListRef = useRef([]);


  // =========================================
  // 앱 검색
  // =========================================
  const searchApp = (text) => {
    // text가 없을 경우 -> 전체 리스트 보여주기
    console.log('searchApp ::: ', text);
    if (text.length === 0) {
      setUninstalledAppList(uninstalledAppListRef.current);
      setInstalledAppList(installedAppListRef.current);
      return;
    }

    const filteredUninstalledAppList = uninstalledAppListRef.current.filter((item) => {
      return item.label.toUpperCase().includes(text.toUpperCase());
    });
    const filteredInstalledAppList = installedAppListRef.current.filter((item) => {
      return item.label.toUpperCase().includes(text.toUpperCase());
    });

    setUninstalledAppList(filteredUninstalledAppList);
    setInstalledAppList(filteredInstalledAppList);

  }

  // useEffect(() => {
  //   searchApp(searchText);
  // }, [searchText]);


  // 앱 새로고침
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

      // AsyncStorage 에 저장된 공지사항 불러오기
      const latestNoticeData = await AsyncStorage.getItem('@NOTICE');
      let latestNotice = null;
      if (latestNoticeData != null) {
        latestNotice = JSON.parse(latestNoticeData);
      }


      // download update.json
      const url = 'http://repo.senia.kr/sem/update.json';
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

        // 2초 뒤에 해더 제거
        setTimeout(() => {
          setIsAppRefresh(false);
        }, 2000);

        // 이전의 공지사항을 메인화면에 띄우기
        if (latestNotice != null) {
          isAppNoticeAvailable.current = true;
          setAppNoticeHistory(latestNotice.context);
          setAppNoticeListEnable(true);
        }


        console.log('====== timeout :');
      }, 20000);
      

      const ret = RNFS.downloadFile({
        fromUrl: url,
        toFile: downloadfilePath,
        connectionTimeout: 20000,
        readTimeout: 20000,
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
            setRefreshText('새로고침 실패, 네트워크 환경을 확인하세요.');

            globalContextDispatch({
              type: 'SET_REFRESH_STATE',
              payload: false
            });
    
            // 2초 뒤에 해더 제거
            setTimeout(() => {
              setIsAppRefresh(false);
            }, 2000);
    
            // 이전의 공지사항을 메인화면에 띄우기
            if (latestNotice != null) {
              isAppNoticeAvailable.current = true;
              setAppNoticeHistory(latestNotice.context);
              setAppNoticeListEnable(true);
            }
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
          // const resultData = await RNFS.readFile(downloadfilePath, 'utf8');
          // console.log('resultData ::: ', resultData);
          const updateData = JSON.parse(await RNFS.readFile(downloadfilePath, 'utf8'));
          
          // console.log('update Data ::: ', JSON.stringify(updateData));

          // 앱 공지사항 유무 확인
          if (updateData?.notice) {
            if (updateData.notice.id === 0 || updateData.notice.context === '') {
              // notice id 0 : 기존 공지 ID 삭제
              isAppNoticeAvailable.current = false;
              setAppNoticeHistory('');

              await AsyncStorage.removeItem('@NOTICE');
            } else {

              isAppNoticeAvailable.current = true;
              setAppNoticeHistory(updateData.notice.context);

              if (latestNotice == null || updateData.notice.id !== latestNotice.id) {
                // 기존 공지 ID가 없을 경우 : Alert으로 공지 띄우기
                try {
                  await AsyncStorage.setItem('@NOTICE', JSON.stringify(updateData.notice));

                  const choice = await AlertAsync(
                    '공지사항',
                    updateData?.notice.context,
                    [
                      {text: '확인', onPress: () => 'yes'},
                    ],
                    {
                      cancelable: true,
                      onDismiss: () => 'yes',
                    },
                  );
    
                  console.log('notice end : ', choice);
    
                } catch (e) {
                  // 앱 종료
                  RNExitApp.exitApp();
                }
              }
            }
            
            
          }

          // 앱 업데이트 유무 확인
          if (updateData.update_version !== DeviceInfo.getVersion()) {
            console.log('need update ', DeviceInfo.getBuildNumber());

            
            // 중요 업데이트인지 확인
            let isEmergencyUpdate = false;
            if (updateData.update_type === 'emergency' || updateData.update_minimum_version_code > Number(DeviceInfo.getBuildNumber())) {
              isEmergencyUpdate = true;
            }

            // 필수 업데이트가 아니고, update_minimum_version_code 보다 높은 숫자의 versionCode를 가지고있으며, 업데이트 알림을 이전에 끈 경우 알림 메시지 스킵
            if (isEmergencyUpdate|| savedAppSetting.current.updateAlertEnable) {

              const emergencyTitle = '중요 업데이트';
              const emergencyContents = '모두의이북 앱의 새로운 버전이 출시되었습니다. 업데이트를 하지 않을 시 앱을 사용하실 수 없습니다.';
              const emergencySelect = [
                {text: '종료', onPress: () => 'exit'},
                {text: '업데이트', onPress: () => 'yes'},
              ];

              const normalTitle = '업데이트';
              const normalContents = '모두의이북 앱의 새로운 버전이 출시되었습니다.';
              const normalSelect = [
                {text: '알림끄기', onPress: () => 'disable'},
                {text: '취소', onPress: () => 'no'},
                {text: '업데이트', onPress: () => 'yes'},
              ];

              setRefreshText(`${isEmergencyUpdate ? emergencyTitle : normalTitle} 발견`);
              try {
                const choice = await AlertAsync(
                  isEmergencyUpdate ? emergencyTitle : normalTitle,
                  `${isEmergencyUpdate ? emergencyContents : normalContents}\n\n${updateData.update_history}`,
                  isEmergencyUpdate ? emergencySelect : normalSelect,
                  {
                    cancelable: isEmergencyUpdate ? false : true,
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
  
                } else if (choice === 'exit') {
                  // 앱 종료
                  RNExitApp.exitApp();
                }
              } catch (e) {
                // 앱 종료
                RNExitApp.exitApp();
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

          // const savedAppList = await AsyncStorage.getItem('@APP_LIST');

          // 2022.11.07 promise.all 로 변경 (검증 필요)
          const appTaskPromise = [];
          // let appTaskIndex = 0;
          setRefreshText(`앱 정보 가져오는 중 [${appListLength}]`);

          for (const [index, value] of appList.entries()) {

            // 헤더 표시 변경
            // setRefreshText(`앱 정보 가져오는 중 (${index+1} / ${appListLength})`);

            // 2022.11.07 promise.all 로 변경
            const promise = new Promise(async function(resolve, reject) {


              try {
                // setRefreshProgressBar((index+1) / appListLength * 100);
                console.log(`${index} : ${value.package}`);
                const iconPath = `file://${RNFS.DocumentDirectoryPath}/${value.package}/ic_launcher.png`;
                const iconExist = await RNFS.exists(iconPath);
                console.log('icon path : ', iconPath);
                console.log('file exists : ', iconExist);
                
                if (!iconExist) {
                  
                  await RNFS.mkdir(`file://${RNFS.DocumentDirectoryPath}/${value.package}/`);
                  console.log ('download icon :: ', value.icon_url);

                  const icon_ret = RNFS.downloadFile({
                    fromUrl: value.icon_url,
                    toFile: iconPath,
                    connectionTimeout: 30000,
                    readTimeout: 30000,
                  });

                  console.log('icon ready ', index);

                  const result = await icon_ret.promise;
                  console.log('icon end ', index);
                  console.log('icon result == ', result);
                  
                  if(result.statusCode == 200) {
                    FastImage.preload([{
                      uri: iconPath,
                    }]);
                  }
                }
              } catch (e) {
                console.log ('for of error : ', e);
                reject(e);
              }

              // update history 처리
              const updateHistoryPath = `file://${RNFS.CachesDirectoryPath}/${value.package}/update_history.json`;
              try {
                const updateHistoryExist = await RNFS.exists(updateHistoryPath);
                console.log('update History exists : ', updateHistoryExist);
                if (updateHistoryExist) {
                  console.log('unlink update History');
                  await RNFS.unlink(updateHistoryPath);
                  console.log('unlink update History OK');
                } else {
                  // cache디렉토리에 경로 생성
                  const mkdirUrl = `file://${RNFS.CachesDirectoryPath}/${value.package}/`;
                  console.log('make directory ::: ', mkdirUrl);
                  await RNFS.mkdir(mkdirUrl);
                }


                // AsyncStorage에 이미 저장되어있는지 확인

                let needUpdateHistory = true;
                let needPastVersionList = false;

                if (value?.is_past_version !== undefined && value.is_past_version) {
                  console.log(`[${value.package}] version check : true`);
                  needPastVersionList = true;
                }

                // 
                // AsyncStorage --> packageName
                // {
                //   update_history.json,
                //   past_version_list: {past_version_list}
                // }
                // 
                const savedPackageData = await AsyncStorage.getItem(value.package);
                let isChangedSavedPackageObj = false;
                let savedPackageObj = {};
                let savedPastVersionList = {};

                if (savedPackageData != null) {
                  savedPackageObj = JSON.parse(savedPackageData);
                  savedPastVersionList = savedPackageObj?.past_version_list;
                  
                  const result = savedPackageObj?.update_log.filter((item) => item?.version === value.version);
                  console.log('ddddddddddd  result length :: ', result)
                  if (result !== undefined && result.length > 0) {
                    console.log('ddddddddddd  :: needUpdate false');
                    needUpdateHistory = false;
                  } 

                  console.log(`[${value.package}] savedPastVersionList?.versionCode : ${savedPastVersionList?.version_code} / value?.past_version_code : ${value?.past_version_code}`);
                  // 버전관리 지원 여부 체크
                  if (needPastVersionList &&
                    savedPastVersionList !== undefined &&
                    savedPastVersionList?.version_code === value?.past_version_code) {
                    console.log(`[${value.package}] version check : false`);
                    needPastVersionList = false;
                  }
                }

                

                if (needUpdateHistory) {
                  // 서버에서 update_history.json 다운로드
                  console.log('download :: ', value.update_history);
                  const updateHistory_ret = RNFS.downloadFile({
                    fromUrl: value.update_history,
                    toFile: updateHistoryPath,
                    connectionTimeout: 30000,
                    readTimeout: 30000,
                  });
    
                  console.log('update history ready ', index);
    
                  const result2 = await updateHistory_ret.promise;
                  console.log('update_history end ', index);
                  console.log('update_history result == ', result2);

                            
                  if(result2.statusCode == 200) {
                    // setRefreshProgressBar(100);
                    console.log("result2 for saving file===", result2);

                    const updateHistoryStr = await RNFS.readFile(updateHistoryPath, 'utf8');
      
                    const updateHistoryData = JSON.parse(updateHistoryStr);
      
                    appList[index].update_history_contents = updateHistoryData;
                    console.log('[react-native-fs] get update history');

                    // AsyncStorage에 데이터 저장
                    // await AsyncStorage.setItem(value.package, JSON.stringify(updateHistoryData));
                    savedPackageObj = {
                      ...updateHistoryData,
                      past_version_list: savedPackageObj?.past_version_list,
                    };
                    isChangedSavedPackageObj = true;
                    // console.log('final update history :: ', JSON.stringify(appList[index].update_history_contents));

                    console.log('unlink update History');
                    await RNFS.unlink(updateHistoryPath);

                  }

                  const updateHistoryExist2 = await RNFS.exists(updateHistoryPath);
                  console.log('update History exists : ', updateHistoryExist2);
                  if (updateHistoryExist2) {
                    console.log('unlink update History');
                    await RNFS.unlink(updateHistoryPath);
                    console.log('unlink update History OK');
                  }

                } else {
                  // AsyncStorage에서 가져온 데이터를 사용
                  let savedPackageObjTemp = savedPackageObj;
                  delete savedPackageObjTemp.past_version_list;
                  appList[index].update_history_contents = savedPackageObjTemp;
                  console.log('[asyncstorage] use update history : ', value.package);
                }



                const pastVersionListPath = `file://${RNFS.CachesDirectoryPath}/${value.package}/past_version_list.json`;
                if (needPastVersionList) {
                  // 서버에서 past_version_list.json 다운로드
                  console.log('download :: ', value.past_version_list);
                  const pastVersionList_ret = RNFS.downloadFile({
                    fromUrl: value.past_version_list,
                    toFile: pastVersionListPath,
                    connectionTimeout: 30000,
                    readTimeout: 30000,
                  });
    
                  console.log('past version list ready ', index);
    
                  const result3 = await pastVersionList_ret.promise;
                  console.log('past version list end ', index);
                  console.log('past version list result == ', result3);

                            
                  if(result3.statusCode == 200) {
                    // setRefreshProgressBar(100);
                    console.log("result3 for saving file===", result3);

                    const pastVersionListStr = await RNFS.readFile(pastVersionListPath, 'utf8');
      
                    const pastVersionListData = JSON.parse(pastVersionListStr);
      
                    appList[index].past_version_list = pastVersionListData;
                    console.log('[react-native-fs] get past version list');

                    // AsyncStorage에 데이터 저장
                    // await AsyncStorage.setItem(value.package, JSON.stringify(updateHistoryData));
                    savedPackageObj.past_version_list = pastVersionListData;
                    isChangedSavedPackageObj = true;
                    // console.log('final update history :: ', JSON.stringify(appList[index].update_history_contents));

                    console.log('unlink past version list');
                    await RNFS.unlink(pastVersionListPath);

                  }

                  const updateHistoryExist2 = await RNFS.exists(pastVersionListPath);
                  console.log('past version list exists : ', updateHistoryExist2);
                  if (updateHistoryExist2) {
                    console.log('unlink past version list');
                    await RNFS.unlink(pastVersionListPath);
                    console.log('unlink past version list OK');
                  }
                } else if (value?.is_past_version !== undefined && value.is_past_version) {
                    console.log(`[${value.package}] version list already exist`);
      
                  // AsyncStorage에서 가져온 데이터를 사용
                  appList[index].past_version_list = savedPastVersionList;
                  console.log('[asyncstorage] use past version list :: ', JSON.stringify(savedPastVersionList));
                }



                // AsyncStorage 변경사항 감지 시 -> 반영
                if (isChangedSavedPackageObj) {
                  console.log('saved AsyncStorage Data :: ', value.package);
                  console.log(JSON.stringify(savedPackageObj));
                  await AsyncStorage.setItem(value.package, JSON.stringify(savedPackageObj));
                }

                // 22.11.07
                // appTaskIndex++;
                // setRefreshText(`앱 정보 가져오는 중 (${appTaskIndex} / ${appListLength})`);
                resolve(true);


              } catch (e) {
                console.log ('for of error : ', e);
                reject(e);
              }
            });
            // 22.11.07
            appTaskPromise.push(promise);
          }

          await Promise.all(appTaskPromise);
          
          // setRefreshProgressBar(100);

          // AsyncStorage에 앱 리스트 저장
          await AsyncStorage.setItem('@APP_LIST', JSON.stringify(appList));

          // 관리할 앱 리스트를 ref에 저장
          managedAppList.current = {
            ...updateData,
            app: appList,
          };

          readAppList(appList);

          // setUninstalledAppList(appList);
          setRefreshText('새로고침 성공');

          globalContextDispatch({
            type: 'SET_REFRESH_STATE',
            payload: false
          });

          // 2초 뒤에 해더 제거
          setTimeout(() => {
            setIsAppRefresh(false);
          }, 2000);
        }

      }).catch (e => {
        console.log("ERROR you ::: ", e);
        throw e;
      });
    } catch (e) {
      console.log('error : ', e);
      globalContextDispatch({
        type: 'SET_REFRESH_STATE',
        payload: false
      });

      // 이전의 공지사항을 메인화면에 띄우기
      if (latestNotice != null) {
        isAppNoticeAvailable.current = true;
        setAppNoticeHistory(latestNotice.context);
        setAppNoticeListEnable(true);
      }

      setIsAppRefresh(false);
    }
  }

  useEffect(() => {
    appRefresh();

  }, [isAppRefresh]);



  // const [scrollDimensionHeight, setScrollDimensionHeight] = useState(0);
  const scrollDimensionHeight = useRef(0);
  const [scrollCurrentY, setScrollCurrentY] = useState(0);

  const handleScroll = (event) => {
    const { contentOffset } = event.nativeEvent;
    setScrollCurrentY(contentOffset.y);
  }

  const handleScrollLayout = (event) => {
    // setScrollDimensionHeight(event.nativeEvent.layout.height);
    scrollDimensionHeight.current = event.nativeEvent.layout.height;
    console.log('event nativeEvent layout');
    console.log(event.nativeEvent.layout);
  }



  // AppState EventListener
  useEffect(() => {
    console.log('============ Dimensions : ', Dimensions.get("window"));
    
    AppState.addEventListener('change', handleAppStateChange);
    return () => {
      AppState.removeEventListener('change', handleAppStateChange);
    };
  }, []);

  const handleAppStateChange = async(nextAppState) => {
    console.log(`-----appState nextAppState ${appState.current} -> ${nextAppState}`);
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      console.log('-----App has come to the foreground!');
      console.log('appVSContextState.modalVisible ::: ', appVSContextState);


      // 앱이 인스톨 상태인지 언인스톨 상태인지 체크
      let checkApp;
      let checkAppState = '';
      if (installingPackage.current.package.length > 0) {
        checkApp = installingPackage.current;
        checkAppState = 'INSTALL';
      } else if (deletingPackage.current.package.length > 0) {
        checkApp = deletingPackage.current;
        checkAppState = 'DELETE';
      } else {
        checkAppState = 'NONE';
      }
      

      if (checkAppState !== 'NONE') {
        console.log(`app ${checkAppState} detected. ${JSON.stringify(checkApp)}`);

        try {
          // update apk 파일이 이미 있는 경우 삭제
          const downloadfilePath = `${RNFS.ExternalCachesDirectoryPath}/@sem_temp.apk`;

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

        try {
          console.log('managedAppList ::: ', managedAppList.current.app);

          const temp = await NativeModules.InstalledApps.getApps();
      
          let tempAllApps = JSON.parse(temp);

          let installedApps = new Array();
          managedAppList.current.app.filter((item) => {
            const result = tempAllApps.filter((i) => i.name === item.package);
            let is_past_version_installed = false;

            if (result.length > 0 && item.package === result[0].name) {

              // is_past_version이 true이고 past_version_list에서 현재 설치된 버전과 일치하는 경우 -> is_past_version_installed : true
              if (item?.is_past_version !== undefined && item.is_past_version && item?.past_version_list?.version_list !== undefined) {
                const result2 = item?.past_version_list?.version_list?.filter((item2) => item2?.version === result[0].versionName);

                if (result2.length > 0) {
                  console.log(`[${item.package}] past version installed`);
                  is_past_version_installed = true;
                }
              }

              installedApps.push({...item, versionName: result[0].versionName, versionCode: result[0].versionCode, is_past_version_installed: is_past_version_installed});

              // 설치되었는지 확인
              if (checkAppState === 'INSTALL' &&
                  item.package == checkApp.package && 
                  result[0].versionName == checkApp.version) {
                console.log ('install success');
                isInstallSuccess = true;
                installAppLabel = item.label;
              }
            }
          });

      
          let uninstalledApps = managedAppList.current.app.filter((item) => !installedApps.some((i) => i?.package === item.package)).sort(ascendUninstalledApp);
      
          installedApps.sort(ascendInstalledApp);
      

          console.log('installedApps : ', installedApps.length);
          console.log('uninstalledApps : ', uninstalledApps.length);
      

          uninstalledAppListRef.current = uninstalledApps;
          installedAppListRef.current = installedApps;

          console.log(searchTextRef.current);
          searchApp(searchTextRef.current);

          if (isInstallSuccess) {
            console.log('app install success.');

            if (checkAppState === 'INSTALL') {
              ToastAndroid.show(`${installAppLabel}\n앱을 설치했습니다.`, ToastAndroid.LONG);

              // AppVersionSelectModal이 켜진 상태 -> 모달 초기화 
              console.log('isAppVSModalVisable.current ::: ', isAppVSModalVisable.current);
              if (isAppVSModalVisable.current) {
                console.log('===== appVS Modal reset!!!');
                appVSContextDispatch({
                  type: 'INIT_APP_VERSION_LIST',
                  payload: initialAppVersionSelectState,
                });
              }

            } else if (checkAppState === 'DELETE') {
              ToastAndroid.show(`${installAppLabel}\n앱이 삭제되지 않았습니다.`, ToastAndroid.LONG);
            }
            

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

            if (checkAppState === 'INSTALL') {
              ToastAndroid.show(`앱이 설치되지 않았습니다.`, ToastAndroid.LONG);
              console.log(checkApp.latestActionButtonText);
              // Action Button text를 이전 내용으로 되돌리기
              checkApp.setActionButtonText(checkApp.latestActionButtonText);
            
            } 

          }

          // 인스톨 패키지 초기화
          globalContextDispatch({
            type: 'SET_INSTALLING_PACKAGE',
            payload: {
              package: '',
              version: '',
              setActionButtonText: null,
              latestActionButtonText: '',
            }
          });


          // 언인스톨 패키지 초기화
          globalContextDispatch({
            type: 'SET_DELETING_PACKAGE',
            payload: {
              package: '',
            }
          });
        
        } catch (e) {
          console.log('ERROR TRYCATCH : ', e);
        }
        
      }
    }
    if (
      appState.current.match(/inactive|active/) &&
      nextAppState === 'background'
    ) {
      console.log('-----App has come to the background!');
      console.log('appVSContextState.modalVisible ::: ', appVSContextState);
    }
    appState.current = nextAppState;
  };



  // 최상단 검색바 오른쪽의 메뉴 버튼 Component
  const MenuButtonComponent = (onPress, onLongPress, styles = {}) => {
    return (
      <Pressable
        style={styles}
        onPress={onPress}
        delayLongPress={500}
        onLongPress={onLongPress}
      >
        <MaterialIcons name={'menu'} color={'#000000'} size={21} />
      </Pressable>
      
    );
  }


  // 메인 스크롤 활성화 / 비활성화 핸들러
  const handleScrollEnabled = (bool) => {
    console.log('handleScrollEnabled : ', bool);
    setMainScrollEnable(bool);
  }


  return (
    <SafeAreaView style={styles.body}>
      <StatusBar barStyle='dark-content' backgroundColor={'white'} animated={false} />
      <ScrollView
        style={styles.scrollView}
        ref={mainScrollViewRef}
        onScroll={handleScroll}
        onLayout={handleScrollLayout}
        scrollEnabled={mainScrollEnable}
      >
        {/* 검색 영역 */}
        <View style={styles.searchView}>
          <View style={{
            borderColor: '#000000', 
            borderWidth: 1.7, 
            borderRadius: 5, 
            width: '100%', 
            height: 45, 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center',
          }}>
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', flex: 1, marginLeft: 4,}}>
              <View style={{height: '100%', borderRightWidth: 0, borderRightColor: '#000000',}}>
                <MaterialIcons name={'search'} color={'#000000'} size={21} />
              </View>
              <View style={{marginLeft: 0, marginRight: 5, flex: 1,}}>
                {/* TextInput Area */}
                <TextInput
                  editable={globalContextState.nowDownloadJobId != -1 ? false : true}
                  placeholder={'앱 검색...'}
                  style={styles.searchInput}
                  // selectTextOnFocus={true}
                  // onChangeText={text=>setSearchText(text)}
                  value={searchText}
                  onChangeText={(text) => {
                    console.log('onChangeText :', text);
                    setSearchText(text);
                    searchTextRef.current = text;
                    searchApp(text);
                  }}
                  numberOfLines={1}
                  onFocus={()=>{console.log('focused');}}
                  keyboardType={'default'}
                  underlineColorAndroid={'transparent'}
                />
              </View>

              {
                searchText.length > 0 && (
                  <Pressable
                    style={{
                      marginLeft: -5,
                      width: 35,
                      height: 45,
                      justifyContent: 'center',
                      alignItems: 'center',
                      // backgroundColor: '#a0a0a0',
                    }}
                    onPress={() => {
                      if (globalContextState.nowDownloadJobId != -1) {
                        ToastAndroid.show('앱의 다운로드가 끝나고 시도하세요.', ToastAndroid.SHORT);
                      } else {
                        Keyboard.dismiss();
                        setSearchText('');
                        searchTextRef.current = '';
                        searchApp('');
                      }

                    }}
                  >
                    <MaterialIcons name={'cancel'} color={'#808080'} size={21} />
                  </Pressable>
                )
              }
            </View>
            <View style={{height: '100%', borderLeftWidth: 1, borderLeftColor: '#000000', justifyContent: 'center',}}>
              {/* <MaterialIcons name={'menu'} color={'#000000'} size={21} /> */}
              <Menu ref={menuRef} renderer={renderers.NotAnimatedContextMenu} >
                <MenuTrigger             
                  customStyles={{
                    // TriggerTouchableComponent: MenuButtonComponent,
                    TriggerTouchableComponent: MaterialIcons.Button,
                    triggerTouchable: { 
                      name: 'menu', 
                      color: '#000000', 
                      backgroundColor: 'rgba(0, 0, 0, 0)', 
                      size: 21, 
                      iconStyle: { marginRight: 0, marginVertical: 4, } ,
                      underlayColor: 'rgba(0, 0, 0, 0)', 
                    },
                  }}
                />
                <MenuOptions customStyles={optionsStyles}>
                  <MenuOption
                    text='종료'
                    disabled={false}
                    onSelect={async() => {
                      await menuRef.current.close();
                      backAction();
                    }}
                  />
                  <MenuOption 
                    text='초기화'
                    disabled={false}
                    onSelect={async() => {
                      await menuRef.current.close();
                      resetApp();
                    }}
                  />
                  <MenuOption 
                    text='Github 사이트 방문'
                    disabled={false}
                    onSelect={async () => {
                      await menuRef.current.close();
                      // github 사이트 열기
                      const result = Linking.canOpenURL(githubPage);
        
                      if (result) {
                        Linking.openURL(githubPage);
                      } else {
                        ToastAndroid.show('웹 페이지를 열 수 없습니다.', ToastAndroid.SHORT);
                      }
                    }}
                  />
                  <View style={{width: '100%', borderTopColor: '#a0a0a0', borderTopWidth: 1,}} />
                  <MenuOption
                    text='오픈소스 라이선스'
                    disabled={false}
                    onSelect={async () => {
                      await menuRef.current.close();
                      navigation.navigate("OSSLicenseStack");
                    }}
                  />
                </MenuOptions>

              </Menu>


            </View>
          </View>

        </View>
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
                    lineHeight: 17,
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
          // 앱 공지사항 있을 경우 표시
          isAppNoticeAvailable.current && (
            <>
            <View style={styles.title}>
              <Text style={styles.titleText}>공지사항</Text>
              <View style={{marginRight: 5, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',}}>
                {/* 공지사항 내역 확장 버튼 */}
                <Pressable 
                  style={({ pressed }) => [
                    {
                      backgroundColor: pressed
                        ? '#a0a0a0'
                        : 'white'
                    }
                  ]}
                  onPress={() => {
                    setAppNoticeListEnable(!appNoticeListEnable);
                  }}
                >
                  <MaterialIcons name={appNoticeListEnable ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} color={'#000000'} size={45} />
                </Pressable>
              </View>
            </View>
            {
              appNoticeListEnable && (
                <Text style={{
                  marginHorizontal: 20,
                  fontSize: 14,
                  marginBottom: 10,
                  lineHeight: 17,
                }} >{appNoticeHistory}</Text>
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
            installedAppListEnable && 
            (
              <>
                <AppList items={installedAppList} scrollEnable={handleScrollEnabled} />
                <View style={{height: 20}} />
              </>
            )
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
        { uninstalledAppListEnable && (<AppList items={uninstalledAppList} scrollEnable={handleScrollEnabled}/>) }

        {/* 새로고침 버튼 */}
        {/* <RefreshButton /> */}

        {/* 모두의이북 정보 */}

        <View style={{alignItems: 'center', justifyContent: 'center', marginBottom: 15, height: 65,}}>
          <Pressable
            style={{alignItems: 'center', paddingVertical: 5, }}
            onPress={async () => {
              // github 사이트 열기
              // const result = Linking.canOpenURL(githubPage);

              // if (result) {
              //   Linking.openURL(githubPage);
              // } else {
              //   ToastAndroid.show('웹 페이지를 열 수 없습니다.', ToastAndroid.SHORT);
              // }
            }}
    
            // 길게 눌러 앱 초기화
            // delayLongPress={1500}
            // onLongPress={() => {
            //   resetApp();
            // }}
          >
            <Text style={{fontSize: 12, lineHeight: 15, color: '#000000', fontWeight: 'bold'}} >모 두 의 이 북  v{DeviceInfo.getVersion()}</Text>
            <Text style={{fontSize: 11, lineHeight: 14, color: '#000000',}}>{githubPage}</Text>
          </Pressable>

          {/* 오픈소스 라이선스 표기 */}
          {/* <Pressable
            style={{alignItems: 'center', paddingVertical: 5, paddingHorizontal: 10, backgroundColor: '#ffffff',}}
            onPress={() => {
              navigation.navigate("OSSLicenseStack");
            }}
    
          >
            <View style={{borderColor: '#000000', borderWidth: 1, borderRadius: 15, paddingVertical: 5, paddingHorizontal: 10,}}>
              <Text style={{fontSize: 10, color: '#000000', fontWeight: 'bold'}} >오픈소스 라이선스</Text>
            </View>
          </Pressable> */}
        </View>

      </ScrollView>

      {/* 하단 페이지 이동 바 */}
      <BottomToolbar mainScrollViewRef={mainScrollViewRef} scrollCurrentY={scrollCurrentY} scrollDimensionHeight={scrollDimensionHeight.current} />
    

      <AppDetailModal />
      <AppVersionSelectModal />


      {/* header */}
      { (isAppRefresh || !isInternetReachable || isHeaderEnable) &&
        (
          <View style={{width: '100%', height: 30, backgroundColor: '#000000', paddingHorizontal: 10, justifyContent: 'center', position: 'absolute', top: 0,}}>
            <View style={{width: '100%', alignItems: 'center',}}>
              <Text style={{fontSize: 13, fontWeight:'bold', color: '#ffffff', width: '100%', lineHeight: 16, textAlign: 'center',}}>{refreshText}</Text>
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

      {/* Floating Button */}
      <FloatingButton 
        onPress={refreshButtonFunction}
        onLongPress={backAction}
        color='#a0a0a0'
        icon='refresh' />

    </SafeAreaView>
  );
};

export default MainScreen;

const styles = StyleSheet.create({
  scrollView: {
    backgroundColor: 'white',
  },
  body: {
    flex: 1,
    backgroundColor: 'white',
  },
  searchView: {
    flexDirection: 'row',
    marginBottom: 5,
    marginHorizontal: 20,
    marginTop: 33,
  },
  searchInput: {
    height: 45,
    // width: '100%',
    // backgroundColor: '#f0f0f0',
    fontSize: 16,
    borderBottomColor: 'transparent',
    borderBottomWidth: 0,
    // justifyContent: 'center',
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
    lineHeight: 30,
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

  refreshButton : {
    height: 50,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#000000',
    marginHorizontal: 20,
    marginTop: 5,
    marginBottom: 10,
    // width: '100%',
    // height: 100,
    // flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

});


const optionsStyles = {
  optionsContainer: {
    backgroundColor: 'white',
  //   padding: 5,
    marginTop: 10,
    marginLeft: 10,
    borderColor: '#000000',
    borderRadius: 5,
    borderWidth: 2,
    // width: 110,

  },
  optionsWrapper: {
    // backgroundColor: '#ffffff',
  },
  optionWrapper: {
      // backgroundColor: '#ffffff',
      // margin: 0.7,
  },
  // optionTouchable: {
  //   underlayColor: 'gold',
  //   activeOpacity: 70,
  // },
  optionText: {
    color: '#000000',
    fontSize: 16,
    margin: 5,
    lineHeight: 19,
  },
};