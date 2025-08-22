import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { Settings, User, Bell, Shield, Info, HelpCircle } from 'lucide-react-native';

export default function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [highQualityEnabled, setHighQualityEnabled] = useState(false);

  const SettingItem = ({ 
    icon, 
    title, 
    subtitle, 
    hasSwitch = false, 
    switchValue, 
    onSwitchChange, 
    onPress 
  }: {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    hasSwitch?: boolean;
    switchValue?: boolean;
    onSwitchChange?: (value: boolean) => void;
    onPress?: () => void;
  }) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      disabled={hasSwitch}
    >
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>{icon}</View>
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {hasSwitch && (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: '#d1d5db', true: '#3182ce' }}
          thumbColor={switchValue ? '#ffffff' : '#f3f4f6'}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={['#1a365d', '#2d5a87']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Customize your experience</Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile</Text>
            <SettingItem
              icon={<User size={24} color="#3182ce" />}
              title="Account"
              subtitle="Manage your profile and preferences"
              onPress={() => {}}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Analysis</Text>
            <SettingItem
              icon={<Bell size={24} color="#3182ce" />}
              title="Notifications"
              subtitle="Get notified about analysis results"
              hasSwitch={true}
              switchValue={notificationsEnabled}
              onSwitchChange={setNotificationsEnabled}
            />
            <SettingItem
              icon={<Settings size={24} color="#3182ce" />}
              title="Auto-save Videos"
              subtitle="Automatically save analyzed videos"
              hasSwitch={true}
              switchValue={autoSaveEnabled}
              onSwitchChange={setAutoSaveEnabled}
            />
            <SettingItem
              icon={<Shield size={24} color="#3182ce" />}
              title="High Quality Analysis"
              subtitle="Use more processing power for better results"
              hasSwitch={true}
              switchValue={highQualityEnabled}
              onSwitchChange={setHighQualityEnabled}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Support</Text>
            <SettingItem
              icon={<HelpCircle size={24} color="#3182ce" />}
              title="Help & Support"
              subtitle="Get help with using the app"
              onPress={() => {}}
            />
            <SettingItem
              icon={<Info size={24} color="#3182ce" />}
              title="About"
              subtitle="App version and information"
              onPress={() => {}}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Javelin Pro v1.0.0</Text>
            <Text style={styles.footerSubtext}>AI-Powered Technique Analysis</Text>
          </View>
        </ScrollView>
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
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#e2e8f0',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 12,
  },
  settingItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1a202c',
  },
  settingSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#e2e8f0',
  },
  footerSubtext: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#a0aec0',
    marginTop: 4,
  },
});