import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    Pressable,
} from 'react-native';

import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const TransparentCircleButton = ( {name, color, text='', hasMarginRight=false, iconSize=24, onPress, borderColor} ) => {
    return (
        <View
            style={[styles.iconButtonWrapper,
                hasMarginRight && styles.rightMargin,
                borderColor && {borderColor: borderColor, borderWidth: 0.5,}
            ]}>
            <Pressable
                style={({pressed}) => [
                    styles.iconButton,
                ]}
                onPress={onPress}>
                
                <MaterialIcons name={name} size={iconSize} color={color} />
                {
                    text != '' &&
                    <Text style={styles.buttonText} maxFontSizeMultiplier={1}
                        numberOfLines={1}
                        ellipsizeMode="tail">
                        {text}
                    </Text>
                }

            </Pressable>
        </View>
    );
}

export default TransparentCircleButton;

const styles = StyleSheet.create({
    iconButtonWrapper: {
        width: 38,
        height: 32,
        borderRadius: 2,
        overflow: 'hidden',
    },
    iconButton: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    rightMargin: {
        marginRight: 8,
    },
    buttonText: {
        fontSize: 9,
        color: '#FFFFFF',
        fontWeight: 'bold',
        alignItems: 'flex-start',
    },
});