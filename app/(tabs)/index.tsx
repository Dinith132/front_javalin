import { View, Text, StyleSheet, TouchableOpacity, Platform, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Camera, Upload, Activity, Brain, Volume2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function HomeScreen() {
  const handlePress = (action: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (action === 'record') {
      router.push('/camera');
    } else if (action === 'upload') {
      router.push('/preview');
    }
  };

  return (
    <LinearGradient
      colors={['#0f172a', '#1e3a8a']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* HEADER SECTION */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>Javelin Pro</Text>
          <Text style={styles.tagline}>Your AI-powered javelin coach</Text>
          <Text style={styles.introText}>
            Javelin Pro analyzes your throw in real time using computer vision and deep learning.
            Get instant visual and audio feedback to improve your technique—no sensors, no costly
            equipment, just your mobile phone and a tripod.
          </Text>
        </View>

        {/* HERO IMAGE */}
        <View style={styles.heroContainer}>
          <Image
            source={require('../../assets/images/throw3.png')} // add your silhouette image here
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>

        {/* BUTTONS SECTION */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => handlePress('record')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#2563eb', '#1d4ed8']}
              style={styles.buttonGradient}
            >
              <Camera size={26} color="#fff" />
              <Text style={styles.primaryButtonText}>Record Throw</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => handlePress('upload')}
            activeOpacity={0.85}
          >
            <Upload size={24} color="#2563eb" />
            <Text style={styles.secondaryButtonText}>Upload Video</Text>
          </TouchableOpacity>
        </View>

        {/* HOW IT WORKS SECTION */}
        <View style={styles.howContainer}>
          <Text style={styles.howTitle}>How It Works</Text>

          <View style={styles.howCardsContainer}>
            <View style={styles.howCard}>
              <Activity size={28} color="#60a5fa" />
              <Text style={styles.howCardTitle}>Detects</Text>
              <Text style={styles.howCardText}>Identifies your body keypoints using AI pose detection.</Text>
            </View>

            <View style={styles.howCard}>
              <Brain size={28} color="#34d399" />
              <Text style={styles.howCardTitle}>Analyzes</Text>
              <Text style={styles.howCardText}>Evaluates motion accuracy using CNN–BiGRU–Attention model.</Text>
            </View>

            <View style={styles.howCard}>
              <Volume2 size={28} color="#f59e0b" />
              <Text style={styles.howCardTitle}>Provides</Text>
              <Text style={styles.howCardText}>Gives instant visual & audio feedback to improve form.</Text>
            </View>
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
    paddingHorizontal: 24,
    paddingTop: 30,
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#cbd5e1',
    marginBottom: 12,
  },
  introText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#e2e8f0',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
    opacity: 0.9,
  },
  heroContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  heroImage: {
    width: 200,
    height: 200,
    opacity: 0.95,
    shadowColor: '#60a5fa',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  actionContainer: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  primaryButton: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  buttonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 18,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 10,
  },
  secondaryButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 18,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  secondaryButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  howContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 20,
    marginHorizontal: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  howTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 18,
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  howCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  howCard: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
    paddingVertical: 6,
  },
  howCardTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#e0f2fe',
    marginTop: 8,
  },
  howCardText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 4,
    opacity: 0.9,
  },
});
