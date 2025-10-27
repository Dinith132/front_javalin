import { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, BackHandler } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import * as Speech from 'expo-speech';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { 
  ArrowLeft, Play, Pause, Volume2, Download, Share2, 
  RotateCcw, CircleCheck as CheckCircle, 
  TriangleAlert as AlertTriangle, Circle as XCircle, 
  Maximize2, Minimize2 
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface AnalysisResults {
  prediction: string;
  confidence: number;
  probabilities: { [key: string]: number };
}

export default function FeedbackScreen() {
  const { videoUri, results } = useLocalSearchParams();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioPlayed, setAudioPlayed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cachedVideoUri, setCachedVideoUri] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const videoRef = useRef<Video>(null);

  const videoUriString = useMemo(
    () => Array.isArray(videoUri) ? videoUri[0] : videoUri,
    [videoUri]
  );

  const analysisResults: AnalysisResults | null = useMemo(
    () => results ? JSON.parse(results as string) : null,
    [results]
  );

  // 🔹 Cache video safely
  useEffect(() => {
    const cacheVideo = async () => {
      try {
        if (!videoUriString) return;

        const fileName = videoUriString.split('/').pop()?.split('?')[0] || 'video.mp4';
        const localUri = `${FileSystem.cacheDirectory}${fileName}`;

        const fileInfo = await FileSystem.getInfoAsync(localUri);

        if (fileInfo.exists) {
          setCachedVideoUri(localUri);
          setIsVideoLoading(false);
        } else {
          setIsDownloading(true);
          const downloadResumable = FileSystem.createDownloadResumable(
            videoUriString,
            localUri,
            {},
            (downloadProgress) => {
              const progress = downloadProgress.totalBytesExpectedToWrite > 0
                ? downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite
                : 0;
              setDownloadProgress(progress);
            }
          );

          // ✅ Safe download with TypeScript check
          const result = await downloadResumable.downloadAsync();
          setCachedVideoUri(result?.uri ?? videoUriString); // fallback if undefined

          setIsDownloading(false);
          setIsVideoLoading(false);
        }
      } catch (error) {
        console.error("Video caching error:", error);
        setCachedVideoUri(videoUriString); // fallback
        setIsDownloading(false);
        setIsVideoLoading(false);
      }
    };

    cacheVideo();
    return () => {
      // Clean up cached video file
      if (cachedVideoUri) {
        FileSystem.deleteAsync(cachedVideoUri, { idempotent: true })
          .then(() => console.log('Cached video deleted:', cachedVideoUri))
          .catch(error => console.error('Error deleting cached video:', error));
      }
    };
  }, [videoUriString, cachedVideoUri]);

  // 🔹 Play audio feedback once
  useEffect(() => {
    if (analysisResults && !audioPlayed) {
      setTimeout(() => {
        playAudioFeedback();
        setAudioPlayed(true);
      }, 1000);
    }
  }, [analysisResults]);

  // 🔹 Hardware back button
  useEffect(() => {
    const backAction = () => {
      router.push('/');
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  const getResultColor = (prediction: string) => {
    switch (prediction) {
      case 'Good Technique': return '#10b981';
      case 'Low Arm': return '#f59e0b';
      case 'Poor Left Leg Block': return '#ef4444';
      case 'Both Errors': return '#dc2626';
      default: return '#64748b';
    }
  };

  const getResultIcon = (prediction: string) => {
    switch (prediction) {
      case 'Good Technique': return CheckCircle;
      case 'Low Arm': 
      case 'Poor Left Leg Block': return AlertTriangle;
      case 'Both Errors': return XCircle;
      default: return AlertTriangle;
    }
  };

  const generateFeedbackText = (prediction: string) => {
    switch (prediction) {
      case 'Good Technique':
        return 'Excellent throw! Your technique is spot on. Continue practicing to maintain this form.';
      case 'Low Arm':
        return 'Your arm position needs improvement. Focus on keeping your throwing arm higher during the release phase.';
      case 'Poor Left Leg Block':
        return 'Work on your left leg blocking technique. A strong block will help transfer more power to your throw.';
      case 'Both Errors':
        return 'Multiple technique issues detected. Focus on both your arm position and left leg blocking for better results.';
      default:
        return 'Analysis complete. Review the feedback for improvement suggestions.';
    }
  };

  const playAudioFeedback = async () => {
    if (!analysisResults) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const feedbackText = generateFeedbackText(analysisResults.prediction);
    setIsSpeaking(true);
    try {
      await Speech.speak(feedbackText, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.8,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    } catch (error) {
      setIsSpeaking(false);
      console.error('Speech synthesis error:', error);
    }
  };

  const stopAudioFeedback = () => {
    Speech.stop();
    setIsSpeaking(false);
  };

  const toggleVideo = async () => {
    if (!videoRef.current) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      if (isPlaying) await videoRef.current.pauseAsync();
      else await videoRef.current.playAsync();
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('Video toggle error:', error);
      Alert.alert('Error', 'Failed to toggle video playback.');
    }
  };

  const toggleFullscreen = async () => {
    if (!videoRef.current) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      if (isFullscreen) await videoRef.current.dismissFullscreenPlayer();
      else await videoRef.current.presentFullscreenPlayer();
      setIsFullscreen(!isFullscreen);
    } catch (error) {
      console.error('Fullscreen toggle error:', error);
      Alert.alert('Error', 'Failed to toggle fullscreen mode.');
    }
  };

  const shareResults = async () => {
    if (!analysisResults) {
      Alert.alert('Error', 'No analysis results available to share.');
      return;
    }
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert('Sharing not supported', 'Sharing is not available on web.');
      return;
    }
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      await Sharing.shareAsync(cachedVideoUri || videoUriString, {
        dialogTitle: 'Share Javelin Analysis',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share analysis results.');
      console.error(error);
    }
  };

  const downloadVideo = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Alert.alert('Download', 'Video with analysis overlay saved to your device.');
  };

  const retryAnalysis = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('../index');
  };

  if (!analysisResults || !videoUriString) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No analysis results or video available</Text>
      </View>
    );
  }

  const ResultIcon = getResultIcon(analysisResults.prediction);
  const resultColor = getResultColor(analysisResults.prediction);


  return (
    <LinearGradient colors={['#1a365d', '#2d5a87']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.push('/')}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Analysis Results</Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={[styles.videoContainer, isFullscreen && { height: '100%' }]}>
            {isDownloading || isVideoLoading ? (
              <View style={styles.loadingOverlay}>
                <Text style={styles.loadingText}>{isDownloading ? 'Downloading Video...' : 'Loading Video...'}</Text>
                {isDownloading && (
                  <View style={styles.progressBarBackground}>
                    <View style={[styles.progressBarFill, { width: `${downloadProgress * 100}%` }]} />
                  </View>
                )}
                {isDownloading && <Text style={styles.loadingText}>{Math.round(downloadProgress * 100)}%</Text>}
              </View>
            ) : (
              <>
                <Video
                  ref={videoRef}
                  source={{ uri: cachedVideoUri ? cachedVideoUri : videoUriString }}
                  style={styles.video}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay={isPlaying}
                  isLooping
                  onLoad={() => setIsVideoLoading(false)}
                  onError={(err) => { console.error('Video error:', err); setIsVideoLoading(false); }}
                  onPlaybackStatusUpdate={(status) => {
                    if ('isPlaying' in status) setIsPlaying(status.isPlaying || false);
                  }}
                />
                <View style={styles.videoOverlay}>
                  <View style={styles.controlsContainer}>
                    <TouchableOpacity style={styles.controlButton} onPress={toggleVideo}>
                      {isPlaying ? <Pause size={24} color="#fff" /> : <Play size={24} color="#fff" />}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.controlButton} onPress={toggleFullscreen}>
                      {isFullscreen ? <Minimize2 size={24} color="#fff" /> : <Maximize2 size={24} color="#fff" />}
                    </TouchableOpacity>
                  </View>
                  <View style={styles.overlayInfo}>
                    <Text style={styles.overlayText}>Video with pose overlay</Text>
                  </View>
                </View>
              </>
            )}
          </View>

          <View style={styles.resultContainer}>
            <View style={[styles.resultHeader, { backgroundColor: resultColor }]}>
              <ResultIcon size={32} color="#fff" />
              <View style={styles.resultContent}>
                <Text style={styles.resultTitle}>{analysisResults.prediction}</Text>
                <Text style={styles.confidenceText}>{Math.round(analysisResults.confidence * 100)}% confidence</Text>
              </View>
            </View>

            <View style={styles.feedbackSection}>
              <Text style={styles.feedbackTitle}>AI Feedback</Text>
              <Text style={styles.feedbackText}>{generateFeedbackText(analysisResults.prediction)}</Text>
              <TouchableOpacity style={styles.audioButton} onPress={isSpeaking ? stopAudioFeedback : playAudioFeedback}>
                <Volume2 size={20} color="#3182ce" />
                <Text style={styles.audioButtonText}>{isSpeaking ? 'Stop Speaking' : 'Play Audio Feedback'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.probabilitiesSection}>
              <Text style={styles.probabilitiesTitle}>Detailed Analysis</Text>
              {Object.entries(analysisResults.probabilities).map(([technique, probability]) => (
                <View key={technique} style={styles.probabilityItem}>
                  <Text style={styles.techniqueLabel}>{technique}</Text>
                  <View style={styles.probabilityBar}>
                    <View style={[styles.probabilityFill, { width: `${probability * 100}%`, backgroundColor: technique === analysisResults.prediction ? resultColor : '#64748b' }]} />
                  </View>
                  <Text style={styles.probabilityText}>{Math.round(probability * 100)}%</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.secondaryButton} onPress={shareResults}>
            <Share2 size={20} color="#3182ce" />
            <Text style={styles.secondaryButtonText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={downloadVideo}>
            <Download size={20} color="#3182ce" />
            <Text style={styles.secondaryButtonText}>Download</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={retryAnalysis}>
            <RotateCcw size={20} color="#3182ce" />
            <Text style={styles.secondaryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}


// Styles
const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 16 
  },
  backButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  title: { 
    fontSize: 20, 
    fontFamily: 'Inter-SemiBold', 
    color: '#ffffff' 
  },
  placeholder: { width: 40 },
  scrollView: { 
    flex: 1, 
    paddingHorizontal: 20 
  },
  videoContainer: { 
    position: 'relative', 
    height: 250, 
    backgroundColor: '#000', 
    borderRadius: 16, 
    overflow: 'hidden', 
    marginBottom: 20 
  },
  video: { 
    width: '100%', 
    height: '100%' 
  },
  videoOverlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0,
    justifyContent: 'flex-end',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 10,
    marginRight: 10,
  },
  controlButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 20,
  },
  overlayInfo: { 
    position: 'absolute', 
    top: 10, 
    left: 10, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 4 
  },
  overlayText: { 
    fontSize: 12, 
    fontFamily: 'Inter-Medium', 
    color: '#fff' 
  },
  resultContainer: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    marginBottom: 20, 
    overflow: 'hidden', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 8, 
    elevation: 4 
  },
  resultHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20 
  },
  resultContent: { 
    marginLeft: 16, 
    flex: 1 
  },
  resultTitle: { 
    fontSize: 22, 
    fontFamily: 'Inter-Bold', 
    color: '#fff' 
  },
  confidenceText: { 
    fontSize: 14, 
    fontFamily: 'Inter-Medium', 
    color: 'rgba(255,255,255,0.9)', 
    marginTop: 2 
  },
  feedbackSection: { 
    padding: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#e2e8f0' 
  },
  feedbackTitle: { 
    fontSize: 18, 
    fontFamily: 'Inter-SemiBold', 
    color: '#1a202c', 
    marginBottom: 12 
  },
  feedbackText: { 
    fontSize: 16, 
    fontFamily: 'Inter-Regular', 
    color: '#4a5568', 
    lineHeight: 24, 
    marginBottom: 16 
  },
  audioButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f7fafc', 
    borderRadius: 8, 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    borderWidth: 1, 
    borderColor: '#e2e8f0' 
  },
  audioButtonText: { 
    fontSize: 14, 
    fontFamily: 'Inter-Medium', 
    color: '#3182ce', 
    marginLeft: 8 
  },
  probabilitiesSection: { 
    padding: 20 
  },
  probabilitiesTitle: { 
    fontSize: 18, 
    fontFamily: 'Inter-SemiBold', 
    color: '#1a202c', 
    marginBottom: 16 
  },
  probabilityItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  techniqueLabel: { 
    fontSize: 14, 
    fontFamily: 'Inter-Medium', 
    color: '#4a5568', 
    width: 120 
  },
  probabilityBar: { 
    flex: 1, 
    height: 8, 
    backgroundColor: '#e2e8f0', 
    borderRadius: 4, 
    marginHorizontal: 12 
  },
  probabilityFill: { 
    height: '100%', 
    borderRadius: 4 
  },
  probabilityText: { 
    fontSize: 14, 
    fontFamily: 'Inter-SemiBold', 
    color: '#1a202c', 
    width: 40, 
    textAlign: 'right' 
  },
  actionButtons: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    paddingHorizontal: 20, 
    paddingVertical: 20, 
    borderTopWidth: 1, 
    borderTopColor: 'rgba(255,255,255,0.1)' 
  },
  secondaryButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    borderRadius: 12, 
    paddingVertical: 12, 
    paddingHorizontal: 16 
  },
  secondaryButtonText: { 
    fontSize: 14, 
    fontFamily: 'Inter-Medium', 
    color: '#fff', 
    marginLeft: 6 
  },
  errorContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#1a365d' 
  },
  errorText: { 
    fontSize: 18, 
    fontFamily: 'Inter-Medium', 
    color: '#fff' 
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#fff',
    marginBottom: 10,
  },
  progressBarBackground: {
    width: '80%',
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3182ce',
    borderRadius: 5,
  },
});