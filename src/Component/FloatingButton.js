import React from 'react';
import {Pressable, StyleSheet, Dimensions, Text} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

function FloatingButton({onPress, onLongPress, color, icon, text=''}) {
    
    const windowWidth = Dimensions.get("window").width;

    return (
        <Pressable
            style={({pressed}) => [
                styles.wrapper,
                {
                    backgroundColor: pressed ? color : '#ffffff',
                    bottom: windowWidth <= 500 ? 55 : 70,
                },
            ]}
            onPress={onPress}
            delayLongPress={1000}
            onLongPress={onLongPress}>
            <MaterialIcons name={icon} size={36} style={styles.icon} />
            {
                text != '' &&
                <Text style={styles.buttonText} maxFontSizeMultiplier={1}
                    numberOfLines={1}
                    ellipsizeMode="tail">
                    {text}
                </Text>
            }
        </Pressable>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        // bottom: 55,
        // bottom: 65,
        left: 22,
        width: 60,
        height: 60,
        borderRadius: 60,
        // // iOS 전용 그림자
        // shadowColor: '#4d4d4d',
        // shadowOffset: {width: 0, height: 4},
        // shadowOpacity: 0.3,
        // shadowRadius: 4,
        // // 안드로이드 전용 그림자
        // elevation: 5,
        // // 안드로이드에서 물결 효과가 영역 밖으로 나가지 않도록 설정
        // // iOS에서는 overflow가 hidden일 경우 그림자가 보이지 않는다
        // overflow: Platform.select({android: 'hidden'}),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#000000',
    },
    button: {
        width: 56,
        height: 56,
        borderRadius: 28,
        //backgroundColor: '#555555',
        justifyContent: 'center',
        alignItems: 'center',
    },
    icon: {
        color: '#000000',
    },
    buttonText: {
        fontSize: 10,
        color: '#000000',
        fontWeight: 'bold',
        alignItems: 'flex-start',
    },
});

export default FloatingButton;
