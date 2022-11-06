import React, {useState, useEffect} from 'react';
import {StyleSheet, View, Text, Button, Dimensions, Alert} from 'react-native';
// import DeviceBattery from 'react-native-device-battery';
import ProgressCircle from 'react-native-progress-circle';
import Icon from 'react-native-vector-icons/MaterialIcons';

const Toolbar = () => {

    const [batteryStat, setBatteryStat] = useState({});

    useEffect(() => {
        //getBatteryStat();
        // DeviceBattery.addListener(onBatteryStateChanged);
    }, []);

    // as a listener
    var onBatteryStateChanged = (state) => {
        console.log(state) // {level: 0.95, charging: true}
        setBatteryStat(state);
    };

    const getBatteryStat = () => {
        
        let level;
        let charging;

        // get the battery level
        // DeviceBattery.getBatteryLevel().then(level => {
        //     console.log(level); // between 0 and 1
        // });
        
        // check if the device is charging
        // DeviceBattery.isCharging().then(isCharging => {
        //     console.log(isCharging) // true or false
        // });
        // setBatteryStat({
        //     level: level,
        //     charging: charging,
        // });
    }
    
    function showBatteryIcon () {
      let iconName = 'battery';
      const level = Math.round(batteryStat.level * 100);

      if (batteryStat.charging) {
        iconName = iconName + '-charging';
      }

      if (level > 90) {
        iconName = iconName + '-100';
      } else if (level > 80) {
        iconName = iconName + '-90'; 
      } else if (level > 70) {
        iconName = iconName + '-80'; 
      } else if (level > 60) {
        iconName = iconName + '-70'; 
      } else if (level > 50) {
        iconName = iconName + '-60'; 
      } else if (level > 40) {
        iconName = iconName + '-50'; 
      } else if (level > 30) {
        iconName = iconName + '-40'; 
      } else if (level > 20) {
        iconName = iconName + '-30'; 
      } else if (level > 10) {
        iconName = iconName + '-20'; 
      } else {
        iconName = iconName + '-10';
      }

      return iconName;
    }



    return (
      <View style={styles.block}>
        <View style={styles.iconButtonWrapper}>
          <View
            style={{
              width: '100%',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            {/* <Icon name="battery-100" size={10} color="#000000" /> */}
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Text style={{fontSize: 17}}>1/1</Text>
              <Text style={{fontSize: 17}}>   10:10 AM</Text>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center', }}>

              <View style={{paddingRight: 10}}>
                <Icon name="wifi-off" size={30} color="#000000" />
              </View>

              <View style={{paddingRight: 10}}>
                <Icon name="bluetooth-disabled" size={30} color="#000000" />
              </View>
              
              <View style={{paddingRight: 10}}>
                <ProgressCircle
                  percent={Math.round(batteryStat.level * 100)}
                  radius={14}
                  borderWidth={2}
                  color="#404040"
                  shadowColor="#e0e0e0"
                  bgColor="#ffffff"
                  outerCircleStyle={{ overflow: "hidden" }}
                >
                  <Text style={{ fontSize: 10, textAlign: 'center' }}>{Math.round(batteryStat.level * 100)}</Text>
                </ProgressCircle>
                {batteryStat.charging && <Text style={{fontSize: 9, textAlign: 'center', marginBottom: 1}}>충전 중</Text>}
              </View>

              <View style={{paddingRight: 3}}>
                <Icon name="settings" size={30} color="#000000" />
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  }
  
  const styles = StyleSheet.create({ 
    block: {
      height: 47,
      width: '100%',
      paddingHorizontal: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#FFFFFF',
      borderTopColor: '#000000',
      borderTopWidth: 1,
    },
    iconButtonWrapper: {
        //width: 32,
        height: 32,
        borderRadius: 16,
        //overflow: 'hidden',
        flexDirection: 'row',
    },
    text: {
      paddingLeft: 10,
      //paddingTop: 2,
      fontSize: 20,
      color: '#263238',
      alignItems: 'center',
    },
    text2: {
      paddingLeft: 10,
      marginTop: -3,
      fontSize: 13,
      color: '#808080',
      alignItems: 'center',
    },
    button: {
      // marginTop: 10,
      alignContent: 'center',
      fontSize: 9,
      color: '#adadad',
    },
  });
  
  export default Toolbar;
  