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
import { androidAPItoVersion } from './GlobalContext';

/* Peer List Context */
const appDetailContext = createContext();


// #################### DB list Reducer #####################

//initial state
const initialAppDetailState = {
    modalVisible: false,
    package: '',
    label: '',
    iconPath: '',
    description: '',
    patch_description: '',
    version: '',
    date: '',
    update_log: [],
};
  
  // create reducer
  const reducerAppDetail = (state = initialAppDetailState, action) => {
    let savedData = new Array();
    switch (action.type) {
    case 'INIT_APP_DETAIL':
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

const AppDetailModalProvider = ({children}) => {
    const [state, dispatch] = useReducer(reducerAppDetail, initialAppDetailState);
    const value = {state, dispatch};
    return (
        <appDetailContext.Provider value={value}>{children}</appDetailContext.Provider>
    );
};

export {AppDetailModalProvider, appDetailContext};




export default function AppDetailModal () {

    const appDetailContextState = useContext(appDetailContext).state;
    const appDetailContextDispatch = useContext(appDetailContext).dispatch;

    const [appLatestUpdateLog, setAppLatestUpdateLog] = useState('');
    const [appUpdateLog, setAppUpdateLog] = useState([]);

    // 스크롤뷰 Ref
    const scrollViewRef = useRef();

    useEffect(() => {
        // 내림차순 정렬
        function descend(a, b) {
            return a.index > b.index ? -1 : a.index < b.index ? 1 : 0;
        }


        if (!appDetailContextState.update_log) return;
        const result = appDetailContextState.update_log.filter((item) => item?.version === appDetailContextState.version);
        console.log('ssssssssssssssss  result length :: ', result.length)
        if (result.length > 0) {
            setAppLatestUpdateLog(result[0].contents === '' ? '업데이트 정보가 없습니다.' : result[0].contents);
            console.log('ssssssssssssssss  :: ', result[0].contents)
        } else {
            console.log('ssssssssssssssss  :: failed');
            setAppLatestUpdateLog('업데이트 정보가 없습니다.');
        }

        // 이전 버전 기록 리스트 생성
        const result2 = appDetailContextState.update_log.filter((item) => item?.version !== appDetailContextState.version).sort(descend);
        console.log('ssssssssssssssss  result2 length :: ', result2.length)
        console.log(JSON.stringify(result2));

        setAppUpdateLog(result2);


    }, [appDetailContextState]);

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
        <Modal
            animationType="none"
            transparent={true}
            visible={appDetailContextState.modalVisible}
            onRequestClose={() => {
                appDetailContextDispatch({
                    type: 'SET_MODAL_VISIBLE',
                    payload: false,
                });
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
                                <FastImage style={{width: 40, height: 40}} resizeMode={FastImage.resizeMode.contain} source={{uri: appDetailContextState.iconPath}} />
                                {/* 패치 마크 */}
                                {
                                    appDetailContextState?.isPatched && (
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
                            <Text numberOfLines={1} style={{fontWeight: 'bold', fontSize: 15, lineHeight: 18,}}>{appDetailContextState.label}</Text>
                            <Text numberOfLines={1} style={{fontSize: 12, lineHeight: 15}}>세부정보</Text>
                            </View>
                        </View>


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
                            onPress={() => 
                                appDetailContextDispatch({
                                    type: 'SET_MODAL_VISIBLE',
                                    payload: false,
                                })
                            }
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
                        {/* 새로운 기능 */}
                        
                        <View style={{marginHorizontal: 10, marginBottom: 15,}}>
                            <Text style={{fontWeight: 'bold', fontSize: 16, marginVertical: 15, lineHeight: 19,}}>새로운 기능</Text>
                            <Text style={{fontSize: 12, lineHeight: 15,}}>{`[버전 : ${appDetailContextState.version} / 업데이트 날짜 : ${appDetailContextState.date}]`}</Text>
                            
                            
                            {/* 필요 안드로이드 버전 */}
                            <View style={{flexDirection: 'row', marginVertical: 3,}}>
                                <View style={{backgroundColor: '#000000', height: 20, borderRadius: 5, paddingHorizontal: 5, justifyContent: 'center',}} >
                                    <Text style={{fontWeight: 'bold', fontSize: 10, color: '#ffffff', lineHeight: 13,}}>Android {androidAPItoVersion(appDetailContextState.minimumAndroidSdk)}</Text>
                                </View>
                                <View style={{flex: 1}}/>
                            </View>
                            
                            <Text style={{fontSize: 14, color: '#000000', lineHeight: 17,}}>{appLatestUpdateLog}</Text>
                        </View>

                        <View style={styles.separator} />

                        {/* 패치 정보 (있을 경우에만 표시) */}
                        {
                            appDetailContextState?.patch_description?.length > 0 &&
                            (
                                <>
                                    <View style={{marginHorizontal: 10, marginBottom: 15,}}>
                                        <Text style={{fontWeight: 'bold', fontSize: 16, marginVertical: 15, lineHeight: 19,}}>패치 정보</Text>
                                        <Text style={{fontSize: 14, color: '#000000', lineHeight: 17,}}>{appDetailContextState.patch_description}</Text>
                                    </View>

                                    <View style={styles.separator} />
                                </>
                            )
                        }


                        {/* 앱 정보 */}
                        <View style={{marginHorizontal: 10, marginBottom: 15,}}>
                            <Text style={{fontWeight: 'bold', fontSize: 16, marginVertical: 15, lineHeight: 19,}}>앱 정보</Text>
                            <Text style={{fontSize: 14, color: '#000000', lineHeight: 17,}}>{appDetailContextState.description}</Text>
                        </View>


                        {/* 이전 버전 내역 (있을 경우에만) */}

                        {
                            appUpdateLog?.length > 0 && 
                            (
                                <>
                                    <View style={styles.separator} />
                                    
                                    <View style={{marginBottom: 10,}}>
                                        <Text style={{fontWeight: 'bold', fontSize: 16, marginHorizontal: 10, marginVertical: 15, lineHeight: 19,}}>이전 버전 내역</Text>
                                        {
                                            appUpdateLog.map((log, index, logArr) => {
                                                return (
                                                    <>
                                                        <Text style={{marginHorizontal: 10, marginBottom: 12, fontSize: 12, color: '#000000', lineHeight: 15,}}>{`[버전 : ${log.version} / 업데이트 날짜 : ${log.date}]`}</Text>
                                                        <Text style={{marginHorizontal: 10, marginBottom: 14, fontSize: 14, color: '#000000', lineHeight: 17,}}>{log.contents.length != 0 ? log.contents : "업데이트 내용 없음"}</Text>
                                                        {
                                                            logArr.length !== index + 1 && (<View style={styles.updateLogSeparator} />)
                                                        }
                                                    </>
                                                );
                                            })
                                        }
                                    </View>
                                </>
                            )
                        }

   
                        
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
    updateLogSeparator: {
        borderBottomWidth: 1,
        borderBottomColor: '#000000',
        width: '100%',
        marginBottom: 10, 
    },
});