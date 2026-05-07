import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, Pressable, Modal, ScrollView, Animated, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { T } from '../constants/tokens';
import FreyaOrb from './FreyaOrb';

const CHAT_DATA = {
  dashboard: {
    tip: {
      bn: 'নতুন আবেদনকারী যোগ করতে নীচের + বোতামে চাপুন। লাল চিহ্নিত ব্যক্তিদের পুনরায় পর্যবেক্ষণ করুন।',
      en: 'Tap + to add a new applicant. Review red-flagged profiles first.',
    },
    quickReplies: [
      {
        q: 'কীভাবে নতুন আবেদন শুরু করব?',
        a: 'নীচের + বোতাম চাপুন, তারপর আবেদনকারীর সব তথ্য পূরণ করুন। মূল্যায়ন শুরু করতে ৪১টি প্রশ্নের উত্তর দিন। সাধারণত ২০-৩০ মিনিট লাগতে পারে।',
      },
      {
        q: 'লাল চিহ্ন মানে কী?',
        a: 'লাল চিহ্ন মানে সেই আবেদনকারীর মিথ্যা বলার সম্ভাবনা বেশি অথবা স্কোর D রেটিং-এ পড়েছে। পুনরায় সাক্ষাৎকার নিন বা প্রশাখা ব্যবস্থাপককে জানান।',
      },
      {
        q: 'স্কোর কীভাবে গণনা হয়?',
        a: 'পূর্ণ PMP প্রশ্নমালার উত্তর থেকে ৭টি মাত্রায় স্কোর হিসাব হয়। উত্তরের গতি, সামাজিক কাম্যতা এবং সামঞ্জস্য-পরীক্ষা দিয়ে অসঙ্গতি নির্ধারণ হয়। চূড়ান্ত স্কোর ০–১০০০।',
      },
      {
        q: 'আজকের পরিসংখ্যান কী বলছে?',
        a: 'এই মাসে ১৪৭টি মূল্যায়নের মধ্যে ৭১% অনুমোদিত হয়েছে। গড় স্কোর ৬৮৪। ১৯টি অসঙ্গতির মধ্যে ৭টি পুনর্বিবেচনার প্রয়োজন।',
      },
    ],
  },
  intake: {
    tip: {
      bn: 'NID নম্বর ভালো করে মিলিয়ে নিন। ছবি তোলার সময় ভালো আলো দেখুন।',
      en: 'Double-check NID digits. Ensure good lighting when capturing photo.',
    },
    quickReplies: [
      {
        q: 'NID যাচাই কীভাবে করব?',
        a: 'আবেদনকারীর NID কার্ডের ১৩ বা ১৭ সংখ্যার নম্বর সঠিকভাবে ইনপুট করুন। Digital KYC চালু থাকলে আমরা স্বয়ংক্রিয়ভাবে NIDS ডাটাবেজে যাচাই করব।',
      },
      {
        q: 'কোন তথ্যগুলো সবচেয়ে গুরুত্বপূর্ণ?',
        a: 'বয়স, পেশা, মাসিক আয় এবং নির্ভরশীল সদস্য সংখ্যা সবচেয়ে গুরুত্বপূর্ণ। এগুলো ঋণ সীমা নির্ধারণে সরাসরি প্রভাব ফেলে।',
      },
      {
        q: 'পেশা যাচাই করব কীভাবে?',
        a: 'আবেদনকারীর পেশার প্রমাণ (ব্যবসার নথি, কাজের স্থান ছবি) তুলুন। Field Visit মডিউল থেকে জিপিএস দিয়ে অবস্থান নিশ্চিত করুন।',
      },
    ],
  },
  result: {
    tip: {
      bn: 'স্কোর ভালো হলেও অসঙ্গতি দেখলে আমাকে জিজ্ঞাসা করুন কেন।',
      en: 'Even with a good score, ask me why if you see discrepancies.',
    },
    quickReplies: [
      {
        q: 'অসঙ্গতি থাকলে কী করব?',
        a: 'অসঙ্গতি থাকলে প্রথমে অসঙ্গতি ট্যাবে বিস্তারিত দেখুন। সামাজিক কাম্যতা অসঙ্গতি থাকলে সাক্ষাৎকারে অন্যভাবে প্রশ্ন করুন। রেটিং C/D হলে প্রশাখা ব্যবস্থাপককে অবহিত করুন।',
      },
      {
        q: 'ঋণ সীমা কীভাবে নির্ধারণ হয়?',
        a: 'মনস্তাত্ত্বিক স্কোর, মাসিক আয়, সঞ্চয় এবং পারিবারিক অবস্থার উপর ভিত্তি করে সর্বোচ্চ ঋণ সীমা নির্ধারণ করা হয়। A রেটিং সাধারণত পূর্ণ ঋণ পায়।',
      },
      {
        q: 'রিপোর্ট কীভাবে শেয়ার করব?',
        a: 'ফলাফল পেজ থেকে Share বোতাম চাপুন। PDF তৈরি হবে যা WhatsApp, ইমেইল বা PKSF IMIS-এ পাঠানো যাবে।',
      },
      {
        q: 'পুনরায় মূল্যায়ন করা যাবে?',
        a: 'হ্যাঁ, তবে একই আবেদনকারীর দুটি মূল্যায়নের মধ্যে কমপক্ষে ৭ দিনের ব্যবধান রাখুন। বারবার মূল্যায়নও পতাকা হিসেবে রেকর্ড হয়।',
      },
    ],
  },
  history: {
    tip: {
      bn: 'আগের আবেদন থেকে নতুন আবেদনকারীদের তুলনা দেখুন।',
      en: 'Compare new applicants to similar past ones.',
    },
    quickReplies: [
      {
        q: 'অনুমোদিত আবেদন ফিল্টার করব কীভাবে?',
        a: 'উপরের ফিল্টার চিপ থেকে "অনুমোদিত" বেছে নিন। সব অনুমোদিত আবেদন তারিখ অনুযায়ী দেখতে পাবেন।',
      },
      {
        q: 'পুরানো রেকর্ড কতদিন থাকে?',
        a: 'সব রেকর্ড ডিভাইসে সংরক্ষিত থাকে। PKSF IMIS-এর সাথে সিঙ্ক চালু থাকলে ক্লাউডেও ব্যাকআপ হয়।',
      },
      {
        q: 'একই ব্যক্তির আগের রেকর্ড দেখব কীভাবে?',
        a: 'রেকর্ডে চাপ দিলে সেই আবেদনকারীর বিস্তারিত ফলাফল দেখতে পাবেন। নাম দিয়ে সার্চ করার সুবিধা শীঘ্রই আসছে।',
      },
    ],
  },
  analytics: {
    tip: {
      bn: 'আপনার শাখার ঝুঁকির প্রবণতা প্রতি সপ্তাহে একবার দেখুন।',
      en: 'Review branch risk trends weekly.',
    },
    quickReplies: [
      {
        q: 'সাপ্তাহিক ট্রেন্ড কী বলছে?',
        a: 'এই সপ্তাহে মূল্যায়ন সংখ্যা ৯১টি — গত সপ্তাহের তুলনায় ৩৪% বেশি। ব্যবসায়িক জ্ঞান মাত্রায় গড় সবচেয়ে কম (৫১%), এই বিষয়ে প্রশিক্ষণ দরকার।',
      },
      {
        q: 'অসঙ্গতি কমাব কীভাবে?',
        a: 'প্রশ্ন করার কৌশল পরিবর্তন করুন — সরাসরি না জিজ্ঞেস করে পরিস্থিতিমূলক প্রশ্ন করুন। আমার প্রশিক্ষণ মডিউল দেখুন।',
      },
      {
        q: 'অনুমোদন হার বাড়াব কীভাবে?',
        a: 'আবেদনকারী বাছাইয়ের সময় Intake পর্যায়ে বেশি সময় দিন। শিক্ষামূলক প্রশ্নগুলোতে আবেদনকারীকে প্রস্তুতি নেওয়ার সুযোগ দিন।',
      },
      {
        q: 'এই তথ্য কি PKSF-এ যাবে?',
        a: 'হ্যাঁ, Analytics ডেটা প্রতিদিন রাত ১২টায় PKSF IMIS-এ স্বয়ংক্রিয়ভাবে সিঙ্ক হয়। অফলাইনে থাকলে সংযোগ পুনরুদ্ধার হলে সিঙ্ক হবে।',
      },
    ],
  },
  assessment: {
    tip: {
      bn: 'প্রতিটি প্রশ্ন মনোযোগ দিয়ে পড়ুন। আবেদনকারীকে নিজেই উত্তর দিতে দিন।',
      en: 'Read each question carefully. Let the applicant answer independently.',
    },
    quickReplies: [
      {
        q: 'আবেদনকারী যদি প্রশ্ন না বোঝেন?',
        a: 'প্রশ্নটি বাংলায় পুনরায় পড়ুন। উদাহরণ দিয়ে বোঝানো যাবে কিন্তু উত্তর বলে দেওয়া যাবে না। আবেদনকারীকে নিজের মতো করে ভাবতে দিন।',
      },
      {
        q: 'সময় কি গুরুত্বপূর্ণ?',
        a: 'হ্যাঁ, প্রতিটি প্রশ্নের আদর্শ উত্তর সময় নির্ধারিত আছে। খুব দ্রুত উত্তর দিলে "অতি-দ্রুত" পতাকা লাগতে পারে।',
      },
      {
        q: 'কোন ধরনের প্রশ্নগুলো সবচেয়ে গুরুত্বপূর্ণ?',
        a: 'সামঞ্জস্য-পরীক্ষা প্রশ্নগুলো (যা জোড়ায় আসে) মিথ্যা ধরতে সবচেয়ে কার্যকর। সামাজিক কাম্যতা প্রশ্নেও মনোযোগ দিন।',
      },
    ],
  },
};

const DEFAULT_DATA = {
  tip: { bn: 'যেকোনো প্রশ্ন থাকলে আমাকে জিজ্ঞাসা করুন।', en: 'Ask me anything.' },
  quickReplies: [],
};

export default function FreyaChat({ screen = 'dashboard', visible, onClose }) {
  const data = CHAT_DATA[screen] || DEFAULT_DATA;
  const [messages, setMessages] = useState([
    { role: 'ai', text: data.tip.bn, sub: data.tip.en, id: 0 },
  ]);
  const [usedReplies, setUsedReplies] = useState([]);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMessages([{ role: 'ai', text: data.tip.bn, sub: data.tip.en, id: 0 }]);
      setUsedReplies([]);
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible, screen]);

  const scrollToEnd = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  };

  const sendReply = (qr, idx) => {
    const userMsg = { role: 'user', text: qr.q, id: Date.now() };
    const aiMsg = { role: 'ai', text: qr.a, id: Date.now() + 1 };
    setMessages(prev => [...prev, userMsg, aiMsg]);
    setUsedReplies(prev => [...prev, idx]);
    scrollToEnd();
  };

  const sendCustom = () => {
    const t = inputText.trim();
    if (!t) return;
    const userMsg = { role: 'user', text: t, id: Date.now() };
    const aiMsg = {
      role: 'ai',
      text: 'ধন্যবাদ আপনার প্রশ্নের জন্য। এই বিষয়ে আরও বিস্তারিত জানতে আপনার প্রশাখা ব্যবস্থাপকের সাথে যোগাযোগ করুন অথবা PKSF হেল্পলাইন ০২-৯৫৬৫৩৪৫-এ কল করুন।',
      id: Date.now() + 1,
    };
    setMessages(prev => [...prev, userMsg, aiMsg]);
    setInputText('');
    scrollToEnd();
  };

  const availableReplies = data.quickReplies.filter((_, i) => !usedReplies.includes(i));

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(15,24,41,0.55)' }}
            onPress={onClose}
          />
          <View style={{
            backgroundColor: T.navy,
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            maxHeight: '82%',
            borderTopWidth: 1, borderColor: 'rgba(46,196,182,0.25)',
          }}>
            {/* Header */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 10,
              paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12,
              borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
            }}>
              <FreyaOrb size={36} pulse={false} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: T.fMonoBold, fontSize: 9, color: T.teal, letterSpacing: 1.5 }}>
                  FREYA · AI পরামর্শদাতা
                </Text>
                <Text style={{ fontFamily: T.fBnBold, fontSize: 13, color: '#fff' }}>
                  আপনার সহকারী
                </Text>
              </View>
              <Pressable onPress={onClose} hitSlop={12}>
                <View style={{
                  width: 28, height: 28, borderRadius: 14,
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ color: '#fff', fontSize: 16, lineHeight: 20 }}>×</Text>
                </View>
              </Pressable>
            </View>

            {/* Messages */}
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={{ padding: 14, gap: 10 }}
              showsVerticalScrollIndicator={false}
              style={{ flexGrow: 0, maxHeight: 320 }}>
              {messages.map((msg) => (
                <View
                  key={msg.id}
                  style={{
                    alignSelf: msg.role === 'ai' ? 'flex-start' : 'flex-end',
                    maxWidth: '82%',
                  }}>
                  {msg.role === 'ai' && (
                    <Text style={{
                      fontFamily: T.fMonoBold, fontSize: 8, color: T.teal,
                      letterSpacing: 1, marginBottom: 3, marginLeft: 2,
                    }}>FREYA</Text>
                  )}
                  <View style={{
                    backgroundColor: msg.role === 'ai'
                      ? 'rgba(46,196,182,0.15)'
                      : 'rgba(255,255,255,0.12)',
                    borderRadius: msg.role === 'ai' ? 4 : 4,
                    borderTopLeftRadius: msg.role === 'ai' ? 2 : 14,
                    borderTopRightRadius: msg.role === 'ai' ? 14 : 2,
                    borderBottomLeftRadius: 14,
                    borderBottomRightRadius: 14,
                    paddingHorizontal: 13, paddingVertical: 10,
                    borderWidth: msg.role === 'ai' ? 1 : 0,
                    borderColor: 'rgba(46,196,182,0.25)',
                  }}>
                    <Text style={{
                      fontFamily: T.fBn, fontSize: 12.5,
                      color: msg.role === 'ai' ? '#fff' : 'rgba(255,255,255,0.9)',
                      lineHeight: 20,
                    }}>{msg.text}</Text>
                    {msg.sub ? (
                      <Text style={{
                        fontFamily: T.fBody, fontSize: 10, color: 'rgba(255,255,255,0.4)',
                        fontStyle: 'italic', marginTop: 4,
                      }}>{msg.sub}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Quick replies */}
            {availableReplies.length > 0 && (
              <View style={{
                paddingHorizontal: 14, paddingTop: 10,
                borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
              }}>
                <Text style={{
                  fontFamily: T.fMono, fontSize: 8.5, color: 'rgba(255,255,255,0.4)',
                  letterSpacing: 0.5, marginBottom: 8,
                }}>প্রশ্ন করুন →</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', gap: 7 }}>
                    {availableReplies.slice(0, 3).map((qr, i) => {
                      const origIdx = data.quickReplies.indexOf(qr);
                      return (
                        <Pressable
                          key={i}
                          onPress={() => sendReply(qr, origIdx)}
                          style={({ pressed }) => ({
                            backgroundColor: pressed ? 'rgba(46,196,182,0.25)' : 'rgba(46,196,182,0.12)',
                            borderWidth: 1, borderColor: 'rgba(46,196,182,0.35)',
                            borderRadius: 20, paddingVertical: 8, paddingHorizontal: 12,
                          })}>
                          <Text style={{ fontFamily: T.fBn, fontSize: 11, color: T.teal }}>
                            {qr.q}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Text input */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 8,
              paddingHorizontal: 14, paddingTop: 8, paddingBottom: 20,
              borderTopWidth: availableReplies.length > 0 ? 0 : 1,
              borderTopColor: 'rgba(255,255,255,0.08)',
            }}>
              <TextInput
                style={{
                  flex: 1, backgroundColor: 'rgba(255,255,255,0.09)',
                  borderRadius: 22, paddingHorizontal: 14, paddingVertical: 9,
                  fontFamily: T.fBn, fontSize: 12, color: '#fff',
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
                }}
                placeholder="নিজের প্রশ্ন লিখুন..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={sendCustom}
                returnKeyType="send"
              />
              <Pressable
                onPress={sendCustom}
                style={({ pressed }) => ({
                  width: 38, height: 38, borderRadius: 19,
                  backgroundColor: pressed ? T.teal2 : T.teal,
                  alignItems: 'center', justifyContent: 'center',
                })}>
                <Text style={{ color: '#fff', fontSize: 16 }}>↑</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}
