import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import * as Speech from 'expo-speech';
import * as Sharing from 'expo-sharing';
import { ArrowLeft, Play, Pause, Volume2, Download, Share2, RotateCcw, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, Circle as XCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function FeedbackScreen() {
  const { videoUri, results } = useLocalSearchParams();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const videoRef = useRef<Video>(null);
  
  const analysisResults = results ? JSON.parse(results as string) : null;

  useEffect(() => {
    // Auto-play feedback when screen loads
    if (analysisResults) {
      setTimeout(() => {
        playAudioFeedback();
      }, 1000);
    }
  }, [analysisResults]);

  const getResultColor = (prediction: string) => {
    switch (prediction) {
      case 'Good Technique':
        return '#10b981';
      case 'Low Arm':
        return '#f59e0b';
      case 'Poor Left Leg Block':
        return '#ef4444';
      case 'Both Errors':
        return '#dc2626';
      default:
        return '#64748b';
    }
  };

  const getResultIcon = (prediction: string) => {
    switch (prediction) {
      case 'Good Technique':
        return CheckCircle;
      case 'Low Arm':
      case 'Poor Left Leg Block':
        return AlertTriangle;
      case 'Both Errors':
        return XCircle;
      default:
        return AlertTriangle;
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

  const toggleVideo = async () => {
    if (!videoRef.current) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
    setIsPlaying(!isPlaying);
  };

  const shareResults = async () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      
      const shareText = `Javelin Analysis Result: ${analysisResults.prediction} (${Math.round(analysisResults.confidence * 100)}% confidence)\n\n${generateFeedbackText(analysisResults.prediction)}`;
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(videoUri as string, {
          dialogTitle: 'Share Javelin Analysis',
          mimeType: 'video/mp4',
        });
      } else {
        Alert.alert('Sharing not available', 'Sharing is not available on this device.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to share analysis results.');
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
    router.back();
  };

  if (!analysisResults) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No analysis results available</Text>
      </View>
    );
  }

  const ResultIcon = getResultIcon(analysisResults.prediction);
  const resultColor = getResultColor(analysisResults.prediction);

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
          <Text style={styles.title}>Analysis Results</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.videoContainer}>
            {videoUri && (
              <Video
                ref={videoRef}
                source={{ uri: videoUri as string }}
                style={styles.video}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={false}
                isLooping={true}
                onPlaybackStatusUpdate={(status) => {
                  if ('isPlaying' in status) {
                    setIsPlaying(status.isPlaying || false);
                  }
                }}
              />
            )}
            <View style={styles.videoOverlay}>
              <TouchableOpacity style={styles.playButton} onPress={toggleVideo}>
                {isPlaying ? (
                  <Pause size={32} color="#ffffff" />
                ) : (
                  <Play size={32} color="#ffffff" />
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.overlayInfo}>
              <Text style={styles.overlayText}>Video with pose overlay</Text>
            </View>
          </View>

          <View style={styles.resultContainer}>
            <View style={[styles.resultHeader, { backgroundColor: resultColor }]}>
              <ResultIcon size={32} color="#ffffff" />
              <View style={styles.resultContent}>
                <Text style={styles.resultTitle}>{analysisResults.prediction}</Text>
                <Text style={styles.confidenceText}>
                  {Math.round(analysisResults.confidence * 100)}% confidence
                </Text>
              </View>
            </View>

            <View style={styles.feedbackSection}>
              <Text style={styles.feedbackTitle}>AI Feedback</Text>
              <Text style={styles.feedbackText}>
                {generateFeedbackText(analysisResults.prediction)}
              </Text>
              
              <TouchableOpacity 
                style={styles.audioButton}
                onPress={playAudioFeedback}
                disabled={isSpeaking}
              >
                <Volume2 size={20} color="#3182ce" />
                <Text style={styles.audioButtonText}>
                  {isSpeaking ? 'Speaking...' : 'Play Audio Feedback'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.probabilitiesSection}>
              <Text style={styles.probabilitiesTitle}>Detailed Analysis</Text>
              {Object.entries(analysisResults.probabilities).map(([technique, probability]) => (
                <View key={technique} style={styles.probabilityItem}>
                  <Text style={styles.techniqueLabel}>{technique}</Text>
                  <View style={styles.probabilityBar}>
                    <View 
                      style={[
                        styles.probabilityFill,
                        { 
                          width: `${probability * 100}%`,
                          backgroundColor: technique === analysisResults.prediction ? resultColor : '#64748b'
                        }
                      ]}
                    />
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
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  videoContainer: {
    position: 'relative',
    height: 250,
    backgroundColor: '#000000',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
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
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayInfo: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  overlayText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
  },
  resultContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  resultContent: {
    marginLeft: 16,
    flex: 1,
  },
  resultTitle: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  confidenceText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  feedbackSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  feedbackTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1a202c',
    marginBottom: 12,
  },
  feedbackText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#4a5568',
    lineHeight: 24,
    marginBottom: 16,
  },
  audioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7fafc',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  audioButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#3182ce',
    marginLeft: 8,
  },
  probabilitiesSection: {
    padding: 20,
  },
  probabilitiesTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1a202c',
    marginBottom: 16,
  },
  probabilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  techniqueLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#4a5568',
    width: 120,
  },
  probabilityBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    marginHorizontal: 12,
  },
  probabilityFill: {
    height: '100%',
    borderRadius: 4,
  },
  probabilityText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1a202c',
    width: 40,
    textAlign: 'right',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
    marginLeft: 6,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a365d',
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
  },
});