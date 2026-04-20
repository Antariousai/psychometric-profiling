import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { T } from '../constants/tokens';
import { rgba } from './Chip';
import FreyaOrb from './FreyaOrb';

const HINTS = {
  scenario: 'এটি একটি বাস্তব পরিস্থিতির প্রশ্ন। আবেদনকারীকে প্রশ্ন পড়ে শোনান, ভাবার সময় দিন।',
  scale: 'আবেদনকারীকে বলুন: "১ মানে একমত নই, ৫ মানে সম্পূর্ণ একমত।" জোর করবেন না।',
  math: 'ধীরে ধীরে পড়ুন। প্রয়োজনে কাগজ-কলম দিতে পারেন — কিন্তু সাহায্য করবেন না।',
  forced: 'দুটি বিকল্পের মধ্যে একটি বেছে নিতে হবে। "দুটোই" এর উত্তর দেওয়া যাবে না।',
};

export default function FreyaHint({ q, onClose }) {
  if (!q) return null;
  return (
    <View pointerEvents="box-none" style={{
      position: 'absolute', bottom: 140, left: 16, right: 16, zIndex: 10,
    }}>
      <View style={{
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: T.border,
        padding: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 8,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <FreyaOrb size={34} pulse={false} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ fontFamily: T.fMonoBold, fontSize: 8.5, color: T.teal2, letterSpacing: 1.5 }}>
                FREYA · সহায়ক
              </Text>
              <Pressable onPress={onClose} hitSlop={10}>
                <Text style={{ fontSize: 20, color: T.ink3 }}>×</Text>
              </Pressable>
            </View>
            <Text style={{ fontFamily: T.fBn, fontSize: 12, color: T.ink2, lineHeight: 20 }}>
              {HINTS[q.type] || 'কোথাও আটকে গেলে আমাকে ডাকুন, সাহায্য করি।'}
            </Text>
            {(q.socialDesirability || q.consistencyPair) ? (
              <View style={{
                marginTop: 8,
                paddingVertical: 8, paddingHorizontal: 10,
                backgroundColor: rgba(T.violet, 0.08),
                borderRadius: 8,
              }}>
                <Text style={{ fontFamily: T.fBn, fontSize: 11, color: T.violet, lineHeight: 17 }}>
                  ⚑ এই প্রশ্নটা যাচাইয়ের জন্য রাখা — মুখের ভাব, হাত-নাড়া খেয়াল রাখুন।
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}
