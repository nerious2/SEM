import React, { useContext } from "react";
import { StyleSheet, View, Text, Alert } from "react-native"
import { useNavigation } from "@react-navigation/native";
import TransparentCircleButton from "./TransparentCircleButton";


const CommonHeader = ( {title, isGoBack=false} ) => {
    const navigation = useNavigation();

    const onGoBack = () => {
      navigation.pop();
    };

    return (
        <View style={[styles.block]}>
            <View style={styles.iconButtonWrapper}>
            {isGoBack ? (
                <View style={styles.buttonBack}>
                    <TransparentCircleButton
                        onPress={onGoBack}
                        name="arrow-back"
                        color="#000000"
                    />
                </View>
            ) : (
                <View />
            )}
                <View style={{justifyContent: 'center',}}>
                    <Text
                        style={styles.text}
                        maxFontSizeMultiplier={1}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {title}
                    </Text>
                </View>
            </View>
        </View>
    );
}
  
const styles = StyleSheet.create({
    iconButtonWrapper: {
        //width: 32,
        flex: 1,
        height: 32,
        borderRadius: 16,
        //overflow: 'hidden',
        flexDirection: 'row',
        alignItems: 'center',
    },
    block: {
        height: 60,
        width: '100%',
        paddingHorizontal: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        borderBottomColor: '#000000',
        borderBottomWidth: 1,
    },
    sectionAutoLogoutButton: {
        paddingRight: 0,
        paddingTop: 0,
        width: 50,
        height: 40,
    },
    text: {
        //paddingTop: 2,
        fontSize: 20,
        color: '#000000',
        alignItems: 'flex-start',
    },
    text2: {
        paddingLeft: 10,
        marginTop: -3,
        fontSize: 13,
        color: '#000000',
        alignItems: 'center',
    },
    button: {
        // marginTop: 10,
        alignContent: 'center',
        fontSize: 9,
        marginRight: 5,
    },
    buttonLast: {
        // marginTop: 10,
        alignContent: 'center',
        fontSize: 9,
    },
    buttonBack: {
        // marginTop: 10,
        alignContent: 'center',
        fontSize: 9,
        // marginRight: 10,
    },
});

export default CommonHeader;
  