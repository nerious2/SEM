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

import FastImage from 'react-native-fast-image';
import RNFS from 'react-native-fs';
import { useNetInfo } from '@react-native-community/netinfo';
import { appDetailContext } from './AppDetailModal';
import { globalContext } from './GlobalContext';

export default function AppVersionSelectList({item, packageName, packageLabel, onPressAppButton}) {

  return (
    <FlatList
      data={item}
      style={styles.block}
      renderItem={({item, index}) =>
        <AppVersionSelectListItem
            item={item}
            index={index}
            packageName={packageName}
            label={packageLabel}
            onPressAppButton={onPressAppButton}
        />
      }
      keyExtractor={(item, index) => index.toString()}
      ItemSeparatorComponent={() => <View style={{borderBottomWidth: 0.5, borderBottomColor: '#ffffff',}}/>}
      ListFooterComponent={() => <View />}
    //   ListFooterComponentStyle={{height: 20,}}
    />
  );
}



// ==================== AppVersionSelectListItem ====================
// item : [
//     {
//         "index": 0,
//         "version": "20.1.2",
//         "version_show": "20.1.2 E-Ink noTTS",
//         "apk_url": "https://repo2.senia.kr/sem/app/com.initialcoms.ridi/RIDI-20.1.2-E-Ink-noTTS.apk",
//         "minimum_android_sdk": 16,
//         "contents": "안드로이드 4.1 이상 지원 마지막 버전"
//     },,...
// ]

function AppVersionSelectListItem({item, index, packageName, label, onPressAppButton}) {

    const appState = useRef(AppState.currentState);

    const isInternetReachable = useNetInfo().isInternetReachable;
    const [progressBar, setProgressBar] = useState(-1);
    const [nowDownloadJobId, setNowDownloadJobId] = useState(-1);
    // 다운로드 버튼 텍스트
    const [actionButtonText, setActionButtonText] = useState('');


    // app detail modal context
    const appDetailContextState = useContext(appDetailContext).state;
    const appDetailContextDispatch = useContext(appDetailContext).dispatch;

    // Global Context
    const globalContextState = useContext(globalContext).state;
    const globalContextDispatch = useContext(globalContext).dispatch;

    // icon path
    const iconPath = `file://${RNFS.DocumentDirectoryPath}/${item.package}/ic_launcher.png`;

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


    useEffect(() => {
        let str = '';
        if (Platform.Version < item.minimum_android_sdk) {
        // if (16 < item.minimum_android_sdk) {
            str = '설치불가';
        } else {
            str = '다운로드';
        }
        setActionButtonText(str);
    }, [item]);


    return (
        <View style={styles.appBlock}>
            <View style={{flexDirection: 'row', flex: 1,}}>
                <View style={{justifyContent: 'space-between', flex: 1, marginTop: 10, marginBottom: 11, marginRight: 10,}}>
                    <View>
                        <Text style={styles.appLabel} numberOfLines={1}>{item.version_show}</Text>
                        <View style={{flexDirection: 'row'}}>
                            <Text style={[
                                {
                                    fontWeight: 'normal',
                                    textDecorationLine: 'none',
                                },
                                styles.appVersion
                            ]}
                            numberOfLines={1}>
                                {item.contents}
                            </Text>
                        </View>
                        
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
                        if (actionButtonText == '설치불가') {
                            // const version = NativeModules.InstalledApps.getAndroidRelease();
                            ToastAndroid.show(`해당 기기의 안드로이드 버전과 호환되지 않습니다.\n현재 기기의 API ${Platform.Version} -> 필요 API ${item.minimum_android_sdk}`, ToastAndroid.LONG);
                        } else {
                            onPressAppButton(packageName, item.version, item.apk_url, [actionButtonText, setActionButtonText], [progressBar, setProgressBar], [nowDownloadJobId, setNowDownloadJobId]);
                        }
                    }}
                >
                    <Text style={{
                        color : actionButtonText == '설치불가'
                        ? '#ffffff'
                        : '#000000',
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
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    block: {backgroundColor: '#ffffff'},
    appBlock : {
        marginHorizontal: 10,
        marginVertical: 5,
        // paddingRight: 10,
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
        fontSize: 17,
        marginBottom: -2,
    },
    appVersion: {
        fontSize: 15,
    },
    appUpdateDate: {
        fontSize: 13,
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