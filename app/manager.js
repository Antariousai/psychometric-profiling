import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { T } from '../constants/tokens';
import BrandHeader from '../components/BrandHeader';
import { useApp } from '../context/AppContext';
import { isManagerRole, isProttoyBankEnabled } from '../lib/prottoyFlags';
import { fetchProttoySessionsForManager, fetchStaffProfile } from '../services/prottoySupabase';
import { normalizeStaffRole } from '../lib/prottoyFlags';

/**
 * Role-gated manager queue — BRANCH_MANAGER / CREDIT_COMMITTEE / PO_ADMIN.
 * Field officers must not see scores (RLS + this gate).
 */
export default function ManagerScreen() {
  const router = useRouter();
  const { staffRole, setStaffRole } = useApp();
  const [role, setRole] = useState(staffRole);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [denied, setDenied] = useState(false);

  const load = useCallback(async () => {
    if (!isProttoyBankEnabled()) {
      setDenied(true);
      setLoading(false);
      return;
    }
    const profile = await fetchStaffProfile();
    const r = normalizeStaffRole(profile?.role || staffRole);
    setRole(r);
    if (typeof setStaffRole === 'function' && profile?.role) setStaffRole(r);
    if (!isManagerRole(r)) {
      setDenied(true);
      setRows([]);
      setLoading(false);
      return;
    }
    setDenied(false);
    const data = await fetchProttoySessionsForManager(40);
    setRows(data);
    setLoading(false);
  }, [staffRole, setStaffRole]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: T.cream, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={T.teal} />
      </View>
    );
  }

  if (denied) {
    return (
      <View style={{ flex: 1, backgroundColor: T.cream }}>
        <StatusBar style="dark" />
        <BrandHeader
          title={{ bn: 'ম্যানেজার', en: 'Manager' }}
          onBack={() => router.back()}
        />
        <View style={{ padding: 24 }}>
          <Text style={{ fontFamily: T.fBnBold, fontSize: 16, color: T.navy, marginBottom: 8 }}>
            স্কোর দেখার অনুমতি নেই
          </Text>
          <Text style={{ fontFamily: T.fBn, fontSize: 13, color: T.ink2, lineHeight: 22 }}>
            শুধু BRANCH_MANAGER / CREDIT_COMMITTEE / PO_ADMIN স্কোর দেখতে পারেন।
            মাঠকর্মী (FIELD_OFFICER) স্কোর দেখেন না।
          </Text>
          <Text style={{ fontFamily: T.fMono, fontSize: 10, color: T.ink4, marginTop: 12 }}>
            ROLE · {role || 'unknown'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: T.cream }}>
      <StatusBar style="dark" />
      <BrandHeader
        title={{ bn: 'ম্যানেজার সিদ্ধান্ত', en: 'Manager decisions' }}
        subtitle="PS · WI · SRI · VI"
        onBack={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {rows.length === 0 ? (
          <Text style={{ fontFamily: T.fBn, color: T.ink3, textAlign: 'center', marginTop: 40 }}>
            এখনো কোনো Prottoy সেশন নেই (বা স্কোর এখনো তৈরি হয়নি)।
          </Text>
        ) : null}
        {rows.map((row) => {
          const score = Array.isArray(row.prottoy_scores)
            ? row.prottoy_scores[0]
            : row.prottoy_scores;
          const name = row.applicants?.profile?.name || row.applicant_id || '—';
          return (
            <Pressable
              key={row.id}
              onPress={() => router.push({ pathname: '/manager-session', params: { id: row.id } })}
              style={{
                backgroundColor: '#fff',
                borderWidth: 1.5, borderColor: T.border, borderRadius: 14,
                padding: 14, marginBottom: 10,
              }}
            >
              <Text style={{ fontFamily: T.fBnBold, fontSize: 15, color: T.navy }}>{name}</Text>
              <Text style={{ fontFamily: T.fMono, fontSize: 9, color: T.ink4, marginTop: 4 }}>
                {row.prottoy_category} · {row.prottoy_status || '—'} · {String(row.created_at || '').slice(0, 10)}
              </Text>
              {score ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  <Text style={{ fontFamily: T.fMonoBold, fontSize: 11, color: T.teal }}>PS {score.ps}</Text>
                  <Text style={{ fontFamily: T.fMono, fontSize: 11, color: T.ink2 }}>WI {score.wi1000}</Text>
                  <Text style={{ fontFamily: T.fMono, fontSize: 11, color: T.ink2 }}>SRI {score.sri1000}</Text>
                  <Text style={{ fontFamily: T.fMono, fontSize: 11, color: T.ink2 }}>
                    VI {score.vi != null ? Number(score.vi).toFixed(2) : '—'} ({score.vi_band || '—'})
                  </Text>
                  <Text style={{ fontFamily: T.fMonoBold, fontSize: 11, color: T.navy }}>Band {score.band || '—'}</Text>
                </View>
              ) : (
                <Text style={{ fontFamily: T.fBn, fontSize: 12, color: T.amber, marginTop: 8 }}>
                  স্কোর অপেক্ষমাণ (engine pack / finalize)
                </Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
