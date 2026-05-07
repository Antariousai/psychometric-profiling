-- Seed reference data (dimensions + demo applicants). Run after 001 + 002.

INSERT INTO public.psychometric_dimensions (id, sort_order, bn, en, color, icon) VALUES
  ('entrepreneurial', 1, 'উদ্যোগী মানসিকতা', 'Entrepreneurial Spirit', '#2EC4B6', '◆'),
  ('risk', 2, 'ঝুঁকি নেওয়ার ক্ষমতা', 'Risk Appetite', '#B5874F', '◈'),
  ('financial', 3, 'আর্থিক শৃঙ্খলা', 'Financial Discipline', '#16A34A', '◉'),
  ('social', 4, 'সামাজিক পুঁজি', 'Social Capital', '#7B2D8B', '◎'),
  ('business', 5, 'ব্যবসায়িক জ্ঞান', 'Business Knowledge', '#0284C7', '◍'),
  ('resilience', 6, 'সহনশীলতা', 'Resilience', '#D97706', '◐'),
  ('motivation', 7, 'অনুপ্রেরণা', 'Motivation', '#E04F4F', '◑')
ON CONFLICT (id) DO UPDATE SET
  sort_order = EXCLUDED.sort_order,
  bn = EXCLUDED.bn,
  en = EXCLUDED.en,
  color = EXCLUDED.color,
  icon = EXCLUDED.icon;

INSERT INTO public.applicants (slug, profile, is_demo) VALUES
  ('nasrin', $json${"id":"nasrin","name":"নাসরিন বেগম","nameEn":"Nasrin Begum","age":34,"gender":"F","village":"কমলগঞ্জ, সিলেট","villageEn":"Kamalganj, Sylhet","occupation":"টেইলারিং (কাপড় সেলাই)","occupationEn":"Tailoring","loanAsk":15000,"loanPurpose":"ব্যবসা সম্প্রসারণ","loanPurposeEn":"Business expansion","savings":2400,"dependents":3,"nid":"1993xxxxxxx412","phone":"+8801712-443219","avatar":"ন","tint":"#C2694F"}$json$, true)
ON CONFLICT (slug) DO UPDATE SET profile = EXCLUDED.profile, is_demo = EXCLUDED.is_demo;

INSERT INTO public.applicants (slug, profile, is_demo) VALUES
  ('rafiq', $json${"id":"rafiq","name":"রফিক উদ্দিন","nameEn":"Rafiq Uddin","age":42,"gender":"M","village":"ভরুয়াখালী, কক্সবাজার","villageEn":"Bharuakhali, Cox's Bazar","occupation":"ছোট কৃষি + দিনমজুর","occupationEn":"Subsistence farm + labour","loanAsk":12000,"loanPurpose":"পশুপালন (ছাগল)","loanPurposeEn":"Livestock (goats)","savings":600,"dependents":5,"nid":"1983xxxxxxx877","phone":"+8801865-117302","avatar":"র","tint":"#5E8C41"}$json$, true)
ON CONFLICT (slug) DO UPDATE SET profile = EXCLUDED.profile, is_demo = EXCLUDED.is_demo;

INSERT INTO public.applicants (slug, profile, is_demo) VALUES
  ('shima', $json${"id":"shima","name":"শিমা আক্তার","nameEn":"Shima Akhter","age":28,"gender":"F","village":"রংপুর সদর","villageEn":"Rangpur Sadar","occupation":"মুদি দোকান","occupationEn":"Grocery shop","loanAsk":25000,"loanPurpose":"নতুন দোকান শুরু","loanPurposeEn":"Start new branch","savings":8000,"dependents":2,"nid":"1999xxxxxxx054","phone":"+8801977-556120","avatar":"শি","tint":"#B5874F"}$json$, true)
ON CONFLICT (slug) DO UPDATE SET profile = EXCLUDED.profile, is_demo = EXCLUDED.is_demo;

