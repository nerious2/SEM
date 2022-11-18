import React, {useState, useEffect} from 'react';
import {StyleSheet, View, Pressable, Button, Dimensions, Alert} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

export default function BottomToolbar ({mainScrollViewRef ,scrollCurrentY, scrollDimensionHeight}) {

    const windowWidth = Dimensions.get("window").width;

    return (
        <View style={{height: windowWidth <= 500 ? 40 : 55, flexDirection: 'row', borderTopWidth: 1.5, borderTopColor: '#000000',}}>
        {/* <Button
        onPress={() => {
            console.log(`current Y : ${scrollCurrentY} height : ${scrollDimensionHeight}`);
            mainScrollViewRef.current?.scrollTo({ y: scrollCurrentY + scrollDimensionHeight, animated: false });
            // NativeModules.InstalledApps.inputKey();
            console.log('key');
        }}
        title="Learn More"
        /> */}
            <View style={{flex: 1, justifyContent: 'center', alignItems: 'center',}}>
                <Pressable style={styles.bottomBarButton}
                    onPressIn={() => {
                        mainScrollViewRef.current?.scrollTo({ y: 0, animated: false });
                    }}
                >
                    {/* <View style={{position: 'absolute', top: windowWidth <= 500 ? 7 : 10,}}>
                        <View style={{backgroundColor: '#000000', height: 5, width: windowWidth <= 500 ? 26 : 35, marginLeft: 0,}} />
                    </View> */}
                    <View style={{transform: [{ rotate: '90deg'}]}}>
                        <MaterialIcons name={'first-page'} color={'#000000'} size={windowWidth <= 500 ? 45 : 55} />
                    </View>
                </Pressable>
            
            </View>
            <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                <Pressable style={styles.bottomBarButton}
                    onPressIn={() => {
                        mainScrollViewRef.current?.scrollTo({ y: scrollCurrentY - scrollDimensionHeight * 0.6, animated: false });
                    }}
                >
                    <View>
                        <MaterialIcons name={'keyboard-arrow-up'} color={'#000000'} size={windowWidth <= 500 ? 45 : 55} />
                    </View>
                </Pressable>
            </View>

            <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                <Pressable style={styles.bottomBarButton}
                    onPressIn={() => {
                        mainScrollViewRef.current?.scrollTo({ y: scrollCurrentY + scrollDimensionHeight * 0.6, animated: false });
                    }}
                >
                    <View>
                        <MaterialIcons name={'keyboard-arrow-down'} color={'#000000'} size={windowWidth <= 500 ? 45 : 55} />
                    </View>
                </Pressable>
            </View>
            <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                <Pressable style={styles.bottomBarButton}
                    onPressIn={() => {
                        mainScrollViewRef.current?.scrollToEnd({ animated: false });
                    }}
                >
                    <View style={{transform: [{ rotate: '90deg'}]}}>
                        <MaterialIcons name={'last-page'} color={'#000000'} size={windowWidth <= 500 ? 45 : 55} />
                    </View>
                    {/* <View style={{position: 'absolute', top: windowWidth <= 500 ? 27 : 35, }}>
                        <View style={{backgroundColor: '#000000', height: 5, width: windowWidth <= 500 ? 27 : 35, marginLeft: 0}} />
                    </View> */}
                </Pressable>
            </View>
            
        </View>
    )
}

const styles = StyleSheet.create({
    bottomBarButton: {
        width: '60%',
        height: '100%',
        // backgroundColor: '#a0a0a0',
        justifyContent: 'center',
        alignItems: 'center',
      },

});