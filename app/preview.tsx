import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Play, Upload, RotateCcw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { BASE_URL } from '@/src/config';
import axios from 'axios';


export default function PreviewScreen() {
  const { videoUri } = useLocalSearchParams();
  const [selectedVideo, setSelectedVideo] = useState<string | null>(videoUri as string || null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  useEffect(() => {
    if (!videoUri) {
      pickVideo();
    }
  }, [videoUri]);

  // At the top, before your component

  const pickVideo = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'video/*';
      input.onchange = async (event: any) => {
        const file = event.target.files[0];
        if (file && file.size > 100 * 1024 * 1024) {
          Alert.alert('Error', 'Video file is too large. Please select a smaller file.');
          return;
        }
        if (file) {
          const uri = URL.createObjectURL(file);
          setSelectedVideo(uri);
        } else {
          router.back();
        }
      };
      input.click();
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need access to your photos to select a video for analysis.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => {} },
        ]
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 1,
      videoMaxDuration: 30,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedVideo(result.assets[0].uri);
    } else {
      router.back();
    }
  };

  const analyzeVideo = async () => {
    if (!selectedVideo) {
      Alert.alert('Error', 'No video selected.');
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsLoading(true);
    setStatusMessage('Uploading video...');

    try {
      const formData = new FormData();
      let mimeType = 'video/mp4';
      let fileName = 'video.mp4';

      if (Platform.OS === 'web') {
        const response = await fetch(selectedVideo);
        const blob = await response.blob();
        
        if (selectedVideo.endsWith('.mov')) {
          mimeType = 'video/quicktime';
          fileName = 'video.mov';
        } else if (selectedVideo.endsWith('.avi')) {
          mimeType = 'video/x-msvideo';
          fileName = 'video.avi';
        }

        formData.append('video', blob, fileName);
      } else {
        if (selectedVideo.endsWith('.mov')) {
          mimeType = 'video/quicktime';
          fileName = 'video.mov';
        } else if (selectedVideo.endsWith('.avi')) {
          mimeType = 'video/x-msvideo';
          fileName = 'video.avi';
        }

        formData.append('video', {
          uri: Platform.OS === 'android' ? selectedVideo : selectedVideo.replace('file://', ''),
          type: mimeType,
          name: fileName,
        } as any);
      }

      console.log('Uploading video:', { uri: selectedVideo, mimeType, fileName });

      // const BASE_IP = 'http://10.104.0.221:5000';

      const response = await axios.post(`${BASE_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });

      if (response.status === 202) {
        setStatusMessage(response.data.message);
        Alert.alert('Success', response.data.message);
        router.push({
          pathname: '/processing',
          params: { videoUri: selectedVideo, fileId: response.data.file_id, statusUrl: response.data.status_url }
        });
      } else {
        throw new Error('Unexpected response status');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      setStatusMessage('');
      Alert.alert(
        'Upload Failed',
        error.response?.data?.error || error.message || 'There was an error uploading your video.',
        [{ text: 'OK', onPress: () => {} }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const selectDifferentVideo = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setStatusMessage('');
    pickVideo();
  };

  return (
    <LinearGradient
      colors={['#1a365d', '#2d5a87']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.title}>Preview Video</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          {selectedVideo ? (
            <View style={styles.videoContainer}>
              <Video
                source={{ uri: selectedVideo }}
                style={styles.video}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={false}
                isLooping={false}
                useNativeControls
              />
              <View style={styles.videoOverlay}>
                <Play size={48} color="#ffffff" />
              </View>
            </View>
          ) : (
            <View style={styles.placeholderContainer}>
              <Upload size={64} color="#3182ce" />
              <Text style={styles.placeholderText}>No video selected</Text>
            </View>
          )}

          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>Ready for Analysis</Text>
            <Text style={styles.infoText}>
              {statusMessage || 'Our AI will analyze your javelin throw technique and provide detailed feedback on your form, arm position, and leg blocking.'}
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={analyzeVideo}
              disabled={!selectedVideo || isLoading}
            >
              <LinearGradient
                colors={!selectedVideo || isLoading ? ['#94a3b8', '#94a3b8'] : ['#3182ce', '#2563eb']}
                style={styles.buttonGradient}
              >
                <Text style={styles.primaryButtonText}>
                  {isLoading ? 'Uploading...' : 'Upload and Analyze'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={selectDifferentVideo}
            >
              <RotateCcw size={20} color="#3182ce" />
              <Text style={styles.secondaryButtonText}>Select Different Video</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  videoContainer: {
    position: 'relative',
    height: 300,
    backgroundColor: '#000000',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 30,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  placeholderContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#3182ce',
    borderStyle: 'dashed',
    marginBottom: 30,
  },
  placeholderText: {
    fontSize: 18,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
    marginTop: 16,
  },
  infoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
  },
  infoTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#e2e8f0',
    lineHeight: 20,
  },
  buttonContainer: {
    marginTop: 'auto',
    marginBottom: 20,
  },
  primaryButton: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
    marginLeft: 8,
  },
});