import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { CameraView, CameraType, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { RotateCcw, Square, StopCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';

export default function CameraScreen() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);
  const recordingPromiseRef = useRef<Promise<{ uri: string } | undefined> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const handleCameraReady = useCallback(() => {
    console.log('Camera is ready');
    setCameraReady(true);
  }, []);

  useEffect(() => {
    console.log('Camera component mounted');
    return () => {
      console.log('Camera component unmounting');
    };
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
    // Reset camera ready state when switching facing
    setCameraReady(false);
  };

  const startRecording = async () => {
    console.log('Start recording called');
    console.log('Camera ready:', cameraReady);
    console.log('Camera ref current:', cameraRef.current);
    console.log('Is recording:', isRecording);

    if (!cameraReady || !cameraRef.current || isRecording) {
      console.log('Cannot start recording: camera not ready, ref null, or already recording');
      return;
    }

    try {
      setIsRecording(true);
      startTimeRef.current = Date.now();
      console.log('Calling recordAsync with maxDuration: 30');
      recordingPromiseRef.current = cameraRef.current.recordAsync({ maxDuration: 30 });
      console.log('Recording promise created:', recordingPromiseRef.current);
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    console.log('Stop recording called');
    console.log('Camera ready:', cameraReady);
    console.log('Camera ref current:', cameraRef.current);
    console.log('Is recording:', isRecording);
    console.log('Recording promise:', recordingPromiseRef.current);

    if (!cameraReady || !cameraRef.current || !isRecording || !recordingPromiseRef.current) {
      console.log('Cannot stop recording: missing prerequisites');
      return;
    }

    const elapsed = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
    console.log('Elapsed time:', elapsed);
    if (elapsed < 1000) {
      console.log('Recording too short, stopping and showing alert');
      try {
        await cameraRef.current.stopRecording();
        await recordingPromiseRef.current; // Await to ensure cleanup, but discard result
      } catch (err) {
        console.error('Error stopping short recording:', err);
      }
      setIsRecording(false);
      recordingPromiseRef.current = null;
      Alert.alert("Error", "Please record for at least 1 second.");
      return;
    }

    try {
      console.log('Calling stopRecording on camera');
      await cameraRef.current.stopRecording();
      console.log('Stop recording completed, awaiting video promise');
      const video = await recordingPromiseRef.current;
      console.log('Video result:', video);
      setIsRecording(false);
      recordingPromiseRef.current = null;

      if (video?.uri) {
        console.log("Video recorded successfully:", video.uri);

        try {
          // Check file size and handle large files differently
          const fileInfo = await FileSystem.getInfoAsync(video.uri);
          console.log('Original file info:', fileInfo);

          if (fileInfo.exists && 'size' in fileInfo && fileInfo.size && fileInfo.size > 50 * 1024 * 1024) { // If file > 50MB
            console.log('Large file detected, using original URI to avoid memory issues');
            // For very large files, just use the original URI to avoid memory issues
            let finalUri = video.uri;
            if (Platform.OS === 'android' && !finalUri.startsWith('file://')) {
              finalUri = `file://${finalUri}`;
            }
            console.log('Using original URI for large file:', finalUri);
            router.push({ pathname: "/preview", params: { videoUri: finalUri } });
          } else {
            // Copy video to permanent storage for smaller files
            const fileName = `javelin_throw_${Date.now()}.mp4`;
            const permanentUri = `${FileSystem.documentDirectory}${fileName}`;

            console.log('Copying video to permanent storage:', permanentUri);
            await FileSystem.copyAsync({
              from: video.uri,
              to: permanentUri
            });

            console.log('Video copied successfully to:', permanentUri);
            router.push({ pathname: "/preview", params: { videoUri: permanentUri } });
          }
        } catch (copyError) {
          console.error('Error copying video to permanent storage:', copyError);
          // Fallback to original URI if copy fails
          let finalUri = video.uri;
          if (Platform.OS === 'android' && !finalUri.startsWith('file://')) {
            finalUri = `file://${finalUri}`;
          }
          console.log('Using fallback URI:', finalUri);
          router.push({ pathname: "/preview", params: { videoUri: finalUri } });
        }
      } else {
        console.log('No video URI in result');
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
      <CameraView
        style={styles.camera}
        facing={facing}
        mode="video"
        ref={(ref) => {
          console.log('CameraView ref callback called with:', ref);
          cameraRef.current = ref;
        }}
        onCameraReady={handleCameraReady}
        ratio="16:9"
        videoQuality="480p"
        videoBitrate={1000000}
      >
        <View style={styles.overlay}>
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Record Throw</Text>
            <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing} disabled={!cameraReady}>
              <RotateCcw size={24} color={cameraReady ? "#ffffff" : "#666666"} />
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
                <TouchableOpacity
                  style={[styles.recordButton, !cameraReady && styles.disabledButton]}
                  onPress={startRecording}
                  disabled={!cameraReady}
                >
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
  disabledButton: {
    opacity: 0.5,
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
