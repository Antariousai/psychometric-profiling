import AsyncStorage from '@react-native-async-storage/async-storage';

export const K = {
  applicant: 'ant.applicant',
  answers: 'ant.answers',
  tweaks: 'ant.tweaks',
  screen: 'ant.screen',
  profilePhoto: 'ant.profilePhoto',
  decisions: 'ant.decisions',
};

export async function load(key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export async function save(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export async function clearAll() {
  try {
    await AsyncStorage.multiRemove(Object.values(K));
  } catch {}
}
