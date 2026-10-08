import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { User } from '../api/types';
import { readCustomerProfile, saveCustomerProfile } from '../profile/localProfile';
import { pickProfilePhotoFile } from '../profile/photoFiles';
import { PROFILE_PHOTO_MAX_BYTES, validateProfileNickname } from '../profile/profileModel';
import type { CustomerProfilePreference } from '../profile/profileModel';
import { customerColors as c, customerMetrics as m, customerType as t } from '../theme/customerTokens';
import { px } from '../theme/tokens';
import { AppIcon } from './AppIcon';
import { CustomerButton } from './CustomerControls';

function ProfilePhoto({ uri }: { uri: string | null }) {
  return <View style={styles.avatar}>{uri
    ? <Image accessibilityLabel="내 프로필 사진" source={{ uri }} style={styles.photo} resizeMode="cover" />
    : <AppIcon name="person" size={60} color={c.white} />}</View>;
}

function ProfileEditor({ user, initial, pickImmediately, onClose, onSaved }: {
  user: User; initial: CustomerProfilePreference; pickImmediately: boolean;
  onClose: () => void; onSaved: (profile: CustomerProfilePreference) => void;
}) {
  const [nickname, setNickname] = useState(initial.nickname);
  const [photoUri, setPhotoUri] = useState(initial.photoUri);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const operation = useRef(false);
  const active = useRef(true);
  const pickedInitially = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const pickPhoto = async (source: 'album' | 'file' = 'album') => {
    if (operation.current) return;
    operation.current = true; setBusy(true); setError('');
    try {
      if (source === 'file') {
        const uri = await pickProfilePhotoFile();
        if (active.current && uri !== null) setPhotoUri(uri);
        return;
      }
      // The system photo picker grants access only to the selected image. No
      // blanket media-library, camera, microphone or location permission needed.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8,
      });
      if (!active.current || result.canceled) return;
      const photo = result.assets[0];
      if (!photo?.uri) throw new Error('사진을 선택하지 못했어요. 다시 시도해 주세요.');
      if (photo.fileSize && photo.fileSize > PROFILE_PHOTO_MAX_BYTES) throw new Error('사진은 10MB 이하로 선택해 주세요.');
      setPhotoUri(photo.uri);
    } catch (failure) {
      if (active.current) setError(failure instanceof Error && (source === 'file' || /10MB/.test(failure.message))
        ? failure.message : '사진을 불러오지 못했어요. 앱 업데이트와 사진 접근 설정을 확인해 주세요.');
    } finally { operation.current = false; if (active.current) setBusy(false); }
  };
  const save = async () => {
    if (operation.current) return;
    const validation = validateProfileNickname(nickname);
    if (validation) { setError(validation); return; }
    operation.current = true; setBusy(true); setError('');
    try {
      const saved = await saveCustomerProfile(user, { nickname, photoUri });
      if (active.current) onSaved(saved);
    } catch (failure) {
      if (active.current) setError(failure instanceof Error && /사진|닉네임/.test(failure.message)
        ? failure.message : '프로필을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally { operation.current = false; if (active.current) setBusy(false); }
  };
  return <Modal animationType="slide" presentationStyle="pageSheet" visible onRequestClose={() => { if (!operation.current) onClose(); }}
    onShow={() => { if (pickImmediately && !pickedInitially.current) { pickedInitially.current = true; void pickPhoto(); } }}>
    <KeyboardAvoidingView style={styles.editor} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.editorHeader}>
        <Text style={t.heading}>프로필 수정</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="프로필 수정 취소" disabled={busy} onPress={onClose} style={styles.textButton}><Text style={t.body}>취소</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.editorContent} keyboardShouldPersistTaps="handled">
        <View style={styles.photoControls}>
          <Pressable accessibilityRole="button" accessibilityLabel="프로필 사진 선택" disabled={busy} onPress={() => void pickPhoto()}><ProfilePhoto uri={photoUri} /></Pressable>
          <View style={styles.photoSources}>
            <Pressable accessibilityRole="button" accessibilityLabel="앨범에서 프로필 사진 선택" disabled={busy} onPress={() => void pickPhoto('album')} style={styles.textButton}><Text style={[t.body, styles.link]}>앨범에서 선택</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="파일에서 프로필 사진 선택" testID="customer-profile-pick-file" disabled={busy} onPress={() => void pickPhoto('file')} style={styles.textButton}><Text style={[t.body, styles.link]}>파일에서 선택</Text></Pressable>
          </View>
          {photoUri && <Pressable accessibilityRole="button" disabled={busy} onPress={() => setPhotoUri(null)} style={styles.textButton}><Text style={[t.small, styles.muted]}>기본 사진으로 변경</Text></Pressable>}
        </View>
        <View style={styles.fieldGroup}>
          <Text style={t.body}>닉네임</Text>
          <TextInput accessibilityLabel="프로필 닉네임" testID="customer-profile-nickname" value={nickname} onChangeText={setNickname}
            maxLength={30} editable={!busy} placeholder="닉네임 2~30자" autoCorrect={false} returnKeyType="done" onSubmitEditing={() => void save()}
            style={styles.input} />
        </View>
        <View style={styles.fieldGroup}><Text style={t.body}>로그인 이메일</Text><Text selectable style={[t.body, styles.muted]}>{user.email}</Text></View>
        <View style={styles.notice}><Text style={[t.small, styles.muted]}>닉네임과 사진을 저장합니다. 로그인 이메일은 바뀌지 않아요.</Text></View>
        {!!error && <Text accessibilityRole="alert" style={[t.small, styles.error]}>{error}</Text>}
        <CustomerButton onPress={() => void save()} disabled={busy}>{busy ? '처리 중…' : '저장'}</CustomerButton>
      </ScrollView>
    </KeyboardAvoidingView>
  </Modal>;
}

function CustomerProfileContent({ user }: { user: User }) {
  const [profile, setProfile] = useState<CustomerProfilePreference>({ nickname: user.nickname, photoUri: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [editor, setEditor] = useState<'photo' | 'profile' | null>(null);
  const [savedMessage, setSavedMessage] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    void readCustomerProfile(user).then(value => { if (active) setProfile(value); })
      .catch(() => { if (active) setError('저장한 프로필을 불러오지 못했어요. 다시 시도해 주세요.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user.id, user.email, user.nickname, loadAttempt]);
  return <View style={styles.card}>
    <View style={styles.profileRow}>
      <Pressable accessibilityRole="button" accessibilityLabel="프로필 사진 변경" accessibilityState={{ disabled: loading || !!error }} disabled={loading || !!error}
        onPress={() => { setSavedMessage(''); setEditor('photo'); }}><ProfilePhoto uri={profile.photoUri} /></Pressable>
      <View style={styles.identity}><Text style={t.heading}>{profile.nickname}</Text><Text style={[t.small, styles.muted]}>손님</Text><Text style={[t.small, styles.muted]}>{user.email}</Text></View>
    </View>
    {loading ? <ActivityIndicator accessibilityLabel="프로필 불러오는 중" /> : error
      ? <View style={styles.fieldGroup}><Text accessibilityRole="alert" style={[t.small, styles.error]}>{error}</Text><CustomerButton onPress={() => setLoadAttempt(attempt => attempt + 1)}>다시 불러오기</CustomerButton></View>
      : <Pressable accessibilityRole="button" testID="customer-profile-edit" onPress={() => { setSavedMessage(''); setEditor('profile'); }} style={styles.editButton}><Text style={t.small}>프로필 수정</Text></Pressable>}
    {!!savedMessage && <Text accessibilityLiveRegion="polite" style={[t.small, styles.muted]}>{savedMessage}</Text>}
    {editor && <ProfileEditor user={user} initial={profile} pickImmediately={editor === 'photo'} onClose={() => setEditor(null)}
      onSaved={saved => { setProfile(saved); setEditor(null); setSavedMessage('프로필을 저장했어요.'); }} />}
  </View>;
}

export function CustomerProfile({ user }: { user: User }) {
  // A user switch remounts all draft and modal state, preventing cross-account previews.
  return <CustomerProfileContent key={`${user.id}:${user.email}`} user={user} />;
}

const styles = StyleSheet.create({
  card: { gap: px(16) },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: px(20) },
  identity: { flex: 1, gap: px(4) },
  avatar: { width: px(100), height: px(100), borderRadius: px(50), backgroundColor: c.neutralButton, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  editButton: { minHeight: px(44), borderRadius: px(12), backgroundColor: c.neutralButton, alignItems: 'center', justifyContent: 'center', padding: px(8) },
  editor: { flex: 1, backgroundColor: c.white },
  editorHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: m.gutter, paddingTop: px(24), paddingBottom: px(12) },
  editorContent: { padding: m.gutter, paddingBottom: px(40), gap: px(22) },
  photoControls: { alignItems: 'center', gap: px(4) },
  photoSources: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: px(8) },
  fieldGroup: { gap: px(8) },
  input: { ...t.body, color: c.black, backgroundColor: c.field, borderRadius: px(12), paddingHorizontal: px(16), paddingVertical: px(12), minHeight: px(56) },
  notice: { backgroundColor: c.panel, borderRadius: px(12), padding: px(14) },
  textButton: { minHeight: px(44), justifyContent: 'center', paddingHorizontal: px(8) },
  link: { color: c.primary },
  muted: { color: c.muted },
  error: { color: c.danger },
});
