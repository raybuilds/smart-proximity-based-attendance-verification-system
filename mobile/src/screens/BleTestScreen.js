import React, { useState } from "react";
import {
  View,
  Text,
  Button,
  ScrollView,
  Alert,
} from "react-native";
import { PermissionsAndroid, Platform } from "react-native";
import { getBleManager } from "../services/ble";

let manager = null; // will be set in startScan if BLE supported

export default function BleTestScreen() {
  const [devices, setDevices] = useState([]);

  async function requestPermissions() {
    if (Platform.OS === "android") {
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN
      );

      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
      );

      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
    }
  }

  async function startScan() {
    if (__DEV__) console.log("STARTING BLE SCAN");

    await requestPermissions();

    // Use BLE manager from service if available
    manager = getBleManager();
    if (!manager) {
      if (__DEV__) console.log('BLE not supported in this environment');
      return;
    }

    setDevices([]);

    const found = {};

    manager.startDeviceScan(null, null, (error, device) => {
    if (error) {
      if (__DEV__) console.log("BLE ERROR:", error);
      return;
    }

    if (!device) return;

    if (__DEV__) {
      console.log(
        "DEVICE:",
        device.name,
        device.localName,
        device.id,
        device.rssi
      );
    }

    found[device.id] = {
      id: device.id,
      name:
        device.name ||
        device.localName ||
        "Unknown Device",
      rssi: device.rssi,
    };

    setDevices(Object.values(found));
  });

    setTimeout(() => {
      if (manager) manager.stopDeviceScan();
      if (__DEV__) console.log("SCAN STOPPED");
    }, 10000);
}

  return (
    <View style={{ flex: 1, padding: 20 }}>
    <Button
  title="Scan BLE Devices"
  onPress={startScan}
/>
      <ScrollView>
        {devices.map((d) => (
          <View key={d.id}>
           <Text>Name: {d.name}</Text>
           <Text>ID: {d.id}</Text>
            <Text>RSSI: {d.rssi}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
