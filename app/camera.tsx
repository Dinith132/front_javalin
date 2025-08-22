import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { CameraView, CameraType, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { RotateCcw, Square, StopCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function CameraScreen() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);
  const recordingPromiseRef = useRef<Promise<{ uri: string } | undefined> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (cameraRef.current) {
      console.log('Camera ref initialized successfully');
    } else {
      console.log('Camera ref is null');
    }
  }, []);

  if (!cameraPermission || !microphonePermission) {
    return <View style={styles.container} />;
  }

  if (!cameraPermission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionMessage}>
            We need access to your camera to record javelin throws for analysis.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestCameraPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!microphonePermission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Microphone Permission Required</Text>
          <Text style={styles.permissionMessage}>
            We need access to your microphone to record audio during video capture.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestMicrophonePermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const toggleCameraFacing = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const startRecording = async () => {
    if (!cameraRef.current || isRecording) return;
    setIsRecording(true);
    startTimeRef.current = Date.now();
    recordingPromiseRef.current = cameraRef.current.recordAsync({ maxDuration: 30 });
  };

  const stopRecording = async () => {
    if (!cameraRef.current || !isRecording || !recordingPromiseRef.current) return;

    const elapsed = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
    if (elapsed < 1000) {
      Alert.alert("Error", "Please record for at least 1 second.");
      return;
    }

    try {
      await cameraRef.current.stopRecording();
      const video = await recordingPromiseRef.current;
      setIsRecording(false);
      recordingPromiseRef.current = null;

      if (video?.uri) {
        console.log("Video recorded:", video.uri);
        router.push({ pathname: "/preview", params: { videoUri: video.uri } });
      } else {
        Alert.alert("Error", "No video was recorded");
      }
    } catch (err) {
      console.error("Stop recording error:", err);
      Alert.alert("Error", "Failed to record video. Make sure you record at least 1 second.");
      setIsRecording(false);
      recordingPromiseRef.current = null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef} ratio="16:9">
        <View style={styles.overlay}>
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Record Throw</Text>
            <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
              <RotateCcw size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={styles.centerOverlay}>
            <View style={styles.targetFrame}>
              <Text style={styles.targetText}>Position athlete in frame</Text>
            </View>
          </View>

          <View style={styles.bottomBar}>
            <View style={styles.recordingControls}>
              {!isRecording ? (
                <TouchableOpacity style={styles.recordButton} onPress={startRecording}>
                  <Square size={32} color="#ffffff" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
                  <StopCircle size={32} color="#ffffff" />
                </TouchableOpacity>
              )}
            </View>
            {isRecording && (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>REC</Text>
              </View>
            )}
          </View>
        </View>
      </CameraView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'transparent' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: { color: '#fff', fontSize: 20 },
  title: { fontSize: 18, color: '#fff', textAlign: 'center' },
  flipButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  targetFrame: {
    width: 300,
    height: 400,
    borderWidth: 2,
    borderColor: '#3182ce',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(49,130,206,0.1)',
  },
  targetText: { color: '#fff', fontSize: 16, textAlign: 'center' },
  bottomBar: { paddingHorizontal: 20, paddingBottom: 40, alignItems: 'center' },
  recordingControls: { alignItems: 'center', marginBottom: 20 },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingIndicator: { flexDirection: 'row', alignItems: 'center' },
  recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#dc2626', marginRight: 8 },
  recordingText: { color: '#fff', fontSize: 14 },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  permissionTitle: { fontSize: 24, color: '#1a202c', marginTop: 20, marginBottom: 12 },
  permissionMessage: { fontSize: 16, color: '#64748b', textAlign: 'center', marginBottom: 30, lineHeight: 24 },
  permissionButton: { backgroundColor: '#3182ce', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  permissionButtonText: { color: '#fff', fontSize: 16 },
});