import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { T } from '../constants/tokens';
import FreyaOrb from './FreyaOrb';

const TIPS = {
  dashboard: {
    bn: 'নতুন আবেদনকারী যোগ করতে নীচের + বোতামে চাপুন। লাল চিহ্নিত ব্যক্তিদের পুনরায় পর্যবেক্ষণ করুন।',
    en: 'Tap + to add an applicant. Review red-flagged profiles first.',
  },
  intake: {
    bn: 'NID নম্বর ভালো করে মিলিয়ে নিন। ছবি তোলার সময় ভালো আলো দেখুন।',
    en: 'Double-check NID digits. Ensure good lighting when taking photo.',
  },
  result: {
    bn: 'স্কোর ভালো হলেও লাল সতর্কতা দেখলে আমাকে জিজ্ঞাসা করুন কেন।',
    en: 'If you see red flags even with good scores, ask me why.',
  },
  history: {
    bn: 'আগের আবেদন থেকে নতুন আবেদনকারীদের তুলনা দেখুন।',
    en: 'Compare new applicants to similar past ones.',
  },
  analytics: {
    bn: 'আপনার শাখার ঝুঁকির প্রবণতা প্রতি সপ্তাহে একবার দেখুন।',
    en: 'Review branch risk trends weekly.',
  },
};

export default function FreyaGenericHint({ screen, visible, onClose }) {
  const tip = TIPS[screen] || {
    bn: 'যেকোনো প্রশ্ন থাকলে আমাকে জিজ্ঞাসা করুন।',
    en: 'Ask me anything.',
  };
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1, backgroundColor: 'rgba(15,24,41,0.45)',
          justifyContent: 'flex-end', alignItems: 'center',
        }}>
        <Pressable
          onPress={(e) => e.stopPropagation?.()}
          style={{
            width: '92%', backgroundColor: T.navy, borderRadius: 18,
            padding: 18, marginBottom: 28,
            borderWidth: 1, borderColor: 'rgba(46,196,182,0.25)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.35,
            shadowRadius: 30,
            elevation: 12,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <FreyaOrb size={40} pulse={false} />
            <View style={{ flex: 1 }}>
              <Text style={{
                fontFamily: T.fMonoBold, fontSize: 8.5, color: T.teal,
                letterSpacing: 1.5, marginBottom: 4,
              }}>FREYA · পরামর্শ</Text>
              <Text style={{ fontFamily: T.fBnBold, fontSize: 13.5, color: '#fff', lineHeight: 21 }}>
                {tip.bn}
              </Text>
              <Text style={{
                fontFamily: T.fBody, fontSize: 10.5, color: 'rgba(255,255,255,0.5)',
                fontStyle: 'italic', marginTop: 6, lineHeight: 15,
              }}>{tip.en}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 22 }}>×</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
