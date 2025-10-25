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
  // recordingPromiseRef holds the promise returned by recordAsync so we can await it when stopping
  const recordingPromiseRef = useRef<Promise<{ uri: string } | undefined> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  

  const handleCameraReady = useCallback(() => {
    console.log('Camera is ready');
    setCameraReady(true);
  }, []);

  // Mount -> unmount cleanup (run once). Release camera resources here.
  useEffect(() => {
    console.log('Camera component mounted');
    return () => {
      console.log('Camera component unmounting (cleanup)');
      (async () => {
        try {
          if (cameraRef.current) {
            // Stop recording if somehow still recording
            try {
              await cameraRef.current.stopRecording?.();
            } catch (e) {
              // stopRecording may throw if not recording; ignore
            }
            // Pause preview and release ref so textures can be freed
            try {
              await cameraRef.current.pausePreview?.();
            } catch (e) {
              // ignore if not implemented
            }
            cameraRef.current = null;
            console.log('Camera resources released on unmount');
          }
        } catch (err) {
          console.warn('Error during camera cleanup:', err);
        }
      })();
    };
  }, []); // run only on mount/unmount

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

  /**
   * Utility to safely teardown camera preview and clear ref.
   * Await this before navigation or heavy memory work (like video playback).
   */
  const safeReleaseCamera = async () => {
    try {
      if (!cameraRef.current) return;
      console.log('Pausing preview to release camera resources...');
      await cameraRef.current.pausePreview?.();
    } catch (err) {
      console.warn('Error pausing preview (ignored):', err);
    } finally {
      cameraRef.current = null;
      setCameraReady(false);
      console.log('Camera ref cleared');
    }
  };

  const toggleCameraFacing = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // If recording currently, stop and finalize recording before switching
    if (isRecording && cameraRef.current) {
      try {
        console.log('Stopping recording before switching camera...');
        await cameraRef.current.stopRecording?.();
        // Wait for the recordAsync promise to resolve so buffers get cleaned
        if (recordingPromiseRef.current) {
          try {
            await recordingPromiseRef.current;
          } catch (e) {
            /* swallow errors from aborted recording */
          }
        }
      } catch (err) {
        console.warn('Error stopping recording before switch:', err);
      } finally {
        setIsRecording(false);
        recordingPromiseRef.current = null;
        startTimeRef.current = null;
      }
    }

    // release camera previews so switching doesn't keep both textures alive
    await safeReleaseCamera();

    setFacing((current) => (current === 'back' ? 'front' : 'back'));
    setCameraReady(false);
  };

  const startRecording = async () => {
    console.log('Start recording called');
    console.log('Camera ready:', cameraReady);
    if (!cameraReady || !cameraRef.current || isRecording) {
      console.log('Cannot start recording: camera not ready, ref null, or already recording');
      return;
    }

    try {
      setIsRecording(true);
      startTimeRef.current = Date.now();
      // create the recording promise and store it for later awaiting
      console.log('Calling recordAsync with maxDuration: 30');
      // note: options may vary by expo-camera version; keep minimal
      recordingPromiseRef.current = cameraRef.current.recordAsync({ maxDuration: 30 });
      console.log('Recording promise stored');
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
      recordingPromiseRef.current = null;
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    console.log('Stop recording called');
    if (!cameraRef.current || !isRecording) {
      console.log('Cannot stop recording: no camera or not recording');
      return;
    }

    const elapsed = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
    console.log('Elapsed ms:', elapsed);

    // If too short, still stop but don't proceed to preview
    if (elapsed < 1000) {
      console.log('Recording too short; stopping and informing user');
      try {
        await cameraRef.current.stopRecording?.();
        if (recordingPromiseRef.current) {
          try {
            await recordingPromiseRef.current;
          } catch (e) {
            // ignore
          }
        }
      } catch (err) {
        console.error('Error stopping short recording:', err);
      } finally {
        setIsRecording(false);
        recordingPromiseRef.current = null;
        startTimeRef.current = null;
      }
      Alert.alert('Error', 'Please record for at least 1 second.');
      return;
    }

    try {
      // Stop the camera recording and wait for the final video uri
      console.log('Stopping recording and awaiting final video');
      await cameraRef.current.stopRecording?.();

      let video = null;
      if (recordingPromiseRef.current) {
        // await the record promise (it returns { uri })
        video = await recordingPromiseRef.current;
      }

      // Clear recording state
      setIsRecording(false);
      recordingPromiseRef.current = null;
      startTimeRef.current = null;

      if (!video?.uri) {
        console.log('No video URI returned from recording');
        Alert.alert('Error', 'No video was recorded');
        return;
      }

      console.log('Video recorded:', video.uri);

      // Run file size check and copy logic within try/catch
      try {
        const fileInfo = await FileSystem.getInfoAsync(video.uri);
        console.log('Original file info:', fileInfo);

        // Release camera resources BEFORE navigating to preview or loading video
        await safeReleaseCamera();

        // If large file, avoid copying to reduce memory pressure; pass original uri
        if (fileInfo.exists && 'size' in fileInfo && fileInfo.size && fileInfo.size > 50 * 1024 * 1024) {
          console.log('Large file (>50MB) detected, using original URI');
          let finalUri = video.uri;
          if (Platform.OS === 'android' && !finalUri.startsWith('file://')) {
            finalUri = `file://${finalUri}`;
          }
          router.push({ pathname: '/preview', params: { videoUri: finalUri } });
          return;
        }

        // For small files, copy to app document directory
        const fileName = `javelin_throw_${Date.now()}.mp4`;
        const permanentUri = `${FileSystem.documentDirectory}${fileName}`;

        console.log('Copying video to permanent storage:', permanentUri);
        await FileSystem.copyAsync({
          from: video.uri,
          to: permanentUri,
        });

        console.log('Copy successful, navigating to preview with:', permanentUri);
        router.push({ pathname: '/preview', params: { videoUri: permanentUri } });
      } catch (copyError) {
        console.error('Error copying video or preparing preview:', copyError);
        // On copy error, attempt to still navigate with the original URI (safe-guard)
        let finalUri = video.uri;
        if (Platform.OS === 'android' && !finalUri.startsWith('file://')) {
          finalUri = `file://${finalUri}`;
        }
        // ensure camera is released before navigation
        await safeReleaseCamera();
        router.push({ pathname: '/preview', params: { videoUri: finalUri } });
      }
    } catch (err) {
      console.error('Stop recording error:', err);
      Alert.alert('Error', 'Failed to record video. Make sure you record at least 1 second.');
      setIsRecording(false);
      recordingPromiseRef.current = null;
      startTimeRef.current = null;
    }
  };

  try {
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
          // Lowered default quality to 480p for better memory headroom.
          videoQuality="480p"
          // keep bitrate moderate; feel free to tune
          videoBitrate={600000}
        >
          <View style={styles.overlay}>
            <View style={styles.topBar}>
              <TouchableOpacity style={styles.closeButton} onPress={async () => {
                // ensure camera paused when leaving screen
                await safeReleaseCamera();
                router.back();
              }}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.title}>Record Throw</Text>
              <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing} disabled={!cameraReady}>
                <RotateCcw size={24} color={cameraReady ? '#ffffff' : '#666666'} />
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
  } catch (e) {
    console.error('CameraView render error:', e);
    return (
      <SafeAreaView style={styles.container}>
        <View style={{flex:1,justifyContent:'center',alignItems:'center'}}>
          <Text style={{color:'#fff'}}>Camera failed to initialize.</Text>
        </View>
      </SafeAreaView>
    );
  }
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
  disabledButton: { opacity: 0.5 },
  recordingIndicator: { flexDirection: 'row', alignItems: 'center' },
  recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#dc2626', marginRight: 8 },
  recordingText: { color: '#fff', fontSize: 14 },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  permissionTitle: { fontSize: 24, color: '#1a202c', marginTop: 20, marginBottom: 12 },
  permissionMessage: { fontSize: 16, color: '#64748b', textAlign: 'center', marginBottom: 30, lineHeight: 24 },
  permissionButton: { backgroundColor: '#3182ce', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  permissionButtonText: { color: '#fff', fontSize: 16 },
});
