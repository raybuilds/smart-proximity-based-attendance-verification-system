import React, { useState } from "react";
import {
  View,
  Text,
  Button,
  ScrollView,
  Alert,
} from "react-native";
import { BleManager } from "react-native-ble-plx";
import { PermissionsAndroid, Platform } from "react-native";

const manager = new BleManager();

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
  console.log("STARTING BLE SCAN");

  await requestPermissions();

  setDevices([]);

  const found = {};

  manager.startDeviceScan(null, null, (error, device) => {
    if (error) {
      console.log("BLE ERROR:", error);
      return;
    }

    if (!device) return;

    console.log(
      "DEVICE:",
      device.name,
      device.localName,
      device.id,
      device.rssi
    );

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
    manager.stopDeviceScan();
    console.log("SCAN STOPPED");
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