import React, { useRef, useState } from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
    FlatList,
    Pressable,
} from 'react-native';

import { OSSLicense } from './OSSLicense';
import { useNavigation } from "@react-navigation/native";
import CommonHeader from './CommonHeader';
import BottomToolbar from './BottomToolbar';


// OSS Flatlist
const OSSList = () => {
    const navigation = useNavigation();

    const renderItem = ({item}) => {
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
                    // stack navigate
                    // navigation.navigate('OSSLicenseContentStack', {title: item.libraryName, content: item});
                }}
            >
                <View style={{flex: 1,}}>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                        <Text style={styles.ossNameText} numberOfLines={1}>{item.libraryName}</Text>
                        <Text style={styles.ossVersionText}>{item.version}</Text>
                    </View>
                    <Text style={styles.ossDescriptionText}>{item._description}</Text>
                    <View style={{flexDirection: 'row', marginTop: 5,}}>
                        <View style={{backgroundColor: '#000000', height: 20, borderRadius: 10, paddingHorizontal: 7, justifyContent: 'center',}} >
                            <Text style={{fontWeight: 'bold', fontSize: 10, color: '#ffffff', lineHeight: 13, width: '100%', textAlign: 'center', marginRight: 3,}}>{item._license}</Text>
                        </View>
                    </View>
                    <Text style={styles.ossContentText}>{item._licenseContent}</Text>
                </View>
            </Pressable>
        );
    };

    return (
      <FlatList
        data={OSSLicense}
        style={styles.body}
        renderItem={renderItem}
        keyExtractor={(item) => item.libraryName}
        ItemSeparatorComponent={() => <View style={{borderBottomColor: '#606060', borderBottomWidth: 0.7,}}/>}
        ListFooterComponent={() => <View />}
      //   ListFooterComponentStyle={{height: 20,}}
      />
    );

}

const OSSLicenseStack = ({navigation, route}) => {
    // 메인 스크롤뷰 Ref
    const mainScrollViewRef = useRef();
    const [scrollDimensionHeight, setScrollDimensionHeight] = useState(0);
    const [scrollCurrentY, setScrollCurrentY] = useState(0);
  
    const handleScroll = (event) => {
      setScrollCurrentY(event.nativeEvent.contentOffset.y);
    }
  
    const handleScrollLayout = (event) => {
      setScrollDimensionHeight(event.nativeEvent.layout.height);
    }

    return (
        <SafeAreaView style={styles.body}>
            <CommonHeader title={route.params.title} isGoBack={true} />
            <ScrollView 
                style={styles.scrollBody}
                ref={mainScrollViewRef}
                onScroll={handleScroll}
                onLayout={handleScrollLayout}
            >
                <OSSList />
            </ScrollView>
            {/* 하단 페이지 이동 바 */}
            <BottomToolbar mainScrollViewRef={mainScrollViewRef} scrollCurrentY={scrollCurrentY} scrollDimensionHeight={scrollDimensionHeight} />
        </SafeAreaView>
    );
};

export default OSSLicenseStack;

const styles = StyleSheet.create({
    body: {
        flex: 1,
        backgroundColor: 'white',
    },
    appBlock : {
        marginHorizontal: 15,
        marginVertical: 15,
    },
    scrollBody: {
        flex: 1,
    },
    ossNameText: {
        flex: 1,
        fontSize: 12,
        color: '#000000',
        fontWeight: 'bold',
        lineHeight: 15,
    },
    ossVersionText: {
        fontSize: 12,
        color: '#000000',
        lineHeight: 15,
    },
    ossLicenseText: {
        fontSize: 12,
        color: '#000000',
        lineHeight: 15,
    },
    ossDescriptionText: {
        marginTop: 4,
        fontSize: 12,
        color: '#000000',
        lineHeight: 15,
    },
    ossContentText: {
        marginTop: 7,
        fontSize: 12,
        color: '#000000',
        lineHeight: 15,
    }
});