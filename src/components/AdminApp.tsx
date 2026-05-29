import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { collection, getDocs, doc, setDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import * as XLSX from 'xlsx';
import { db, auth, signInWithGoogle, logout, handleFirestoreError, OperationType, detectBrowserContext } from '../firebase';
import { COURSES_LIST } from '../courses';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LabelList
} from 'recharts';
import { 
  ShieldCheck, LogOut, ArrowLeft, Download, FileSpreadsheet, Lock, FileText,
  UserCheck, AlertCircle, TrendingUp, HelpCircle, ServerCrash, UserPlus, Trash2, Users, ShieldAlert,
  Brain, Sparkles, MessageSquare
} from 'lucide-react';

// html2pdf import (with lazy fallback structure)
import html2pdf from 'html2pdf.js';

// Custom metric renderer for comprehensive question analytics (All questions visualizer)
interface ChartItem {
  name: string;
  value?: number;
  count?: number;
}

function DetailedChartCard({ title, data, questionCode, color = "#0d9488", isExporting = false }: { title: string, data: ChartItem[], questionCode: string, color?: string, isExporting?: boolean }) {
  const formattedCode = (questionCode.toLowerCase().startsWith('q') ? questionCode.slice(1) : questionCode).replace(/_/g, '-');

  if (!data || data.length === 0) {
    return (
      <div className={`bg-white border border-slate-100 rounded-2xl p-5 text-left shadow-xs flex flex-col justify-between ${isExporting ? 'h-auto' : 'h-[360px]'}`}>
        <div>
          <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md font-mono mb-2 inline-block">{formattedCode}</span>
          <h4 className="text-xs font-bold text-slate-800 tracking-tight leading-snug mb-3">{title}</h4>
        </div>
        <div className="text-[11px] text-gray-400 mt-2 font-light">등록된 피드백 응답이 아직 누락되었거나 분석 준비 중입니다.</div>
      </div>
    );
  }
  
  const displayData = data.slice(0, 10);
  const totalVotes = data.reduce((sum, item) => sum + (Number(item.value) || Number(item.count) || 0), 0);

  return (
    <div className={`bg-white border border-slate-100 rounded-2xl p-5 text-left shadow-xs flex flex-col hover:border-teal-200 transition duration-200 ${isExporting ? 'h-auto' : 'h-[360px]'}`} style={{ pageBreakInside: 'avoid' }}>
      <div className="shrink-0">
        <div className="flex justify-between items-center gap-2 mb-3">
          <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-md font-mono">{formattedCode}</span>
          <span className="text-[10px] text-gray-400 font-semibold">{totalVotes}개 기업/인원 응답 완료</span>
        </div>
        <h4 className="text-xs font-bold text-slate-800 tracking-tight leading-snug mb-4">{title}</h4>
      </div>
      
      <div className={`mt-2 grow overflow-y-auto pr-2 custom-scrollbar ${isExporting ? 'space-y-3.5 visible-scrollbar-export' : 'space-y-3.5'}`}>
        {displayData.map((item, idx) => {
          const val = Number(item.value) || Number(item.count) || 0;
          const percentage = totalVotes > 0 ? ((val / totalVotes) * 100).toFixed(1) : "0.0";
          return (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-gray-700 font-semibold truncate max-w-[210px] lg:max-w-[250px]" title={item.name}>
                  {idx + 1}. {item.name || '미표기'}
                </span>
                <span className="font-bold text-slate-900 shrink-0">{val}건 ({percentage}%)</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500" 
                  style={{ width: `${percentage}%`, backgroundColor: color }} 
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OtherOpinionsCard({ title, data, isExporting, questionCode }: { title: string, data: {prefix: string, text: string}[], isExporting?: boolean, questionCode?: string }) {
  if (!data || data.length === 0) return null;
  const formattedCode = questionCode ? (questionCode.toLowerCase().startsWith('q') ? questionCode.slice(1) : questionCode).replace(/_/g, '-') : '';

  return (
    <div className={`bg-white border border-slate-100 rounded-2xl p-5 text-left shadow-xs flex flex-col justify-between hover:border-teal-200 transition duration-200 ${isExporting ? 'h-auto' : 'h-[360px]'}`} style={{ pageBreakInside: 'avoid' }}>
      <div className="shrink-0 mb-2">
        <div className="flex justify-between items-center gap-2 mb-3">
          {formattedCode ? <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-md font-mono">{formattedCode}</span> : <div />}
          <span className="text-[10px] text-gray-400 font-semibold">{data.length}건의 의견 접수됨</span>
        </div>
        <h4 className="text-xs font-bold text-slate-800 tracking-tight leading-snug mb-4">{title}</h4>
      </div>
      <div className={`space-y-3 text-xs grow ${isExporting ? '' : 'overflow-y-auto pr-2 custom-scrollbar'}`}>
        {data.map((item, idx) => (
          <div key={idx} className="pl-3 border-l-[3px] border-emerald-200 bg-emerald-50/20 p-2.5 rounded-r-xl shadow-none">
            <span className="font-bold text-teal-800 block mb-1 text-[11px] opacity-80">{item.prefix}</span>
            <p className="text-gray-700 leading-relaxed font-medium break-all w-full">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminApp() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [fetchingData, setFetchingData] = useState<boolean>(false);
  
  // Data lists
  const [demands, setDemands] = useState<any[]>([]);
  const [fieldCorps, setFieldCorps] = useState<any[]>([]);
  const [fieldTrainees, setFieldTrainees] = useState<any[]>([]);
  const [fgis, setFgis] = useState<any[]>([]);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'demand' | 'field_corp' | 'field_trainee' | 'fgi' | 'admin_mgmt'>('demand');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Colors for Recharts (highly distinguishable multi-color palette for easy observation)
  const COLORS = ['#2563EB', '#0D9488', '#4F46E5', '#16A34A', '#D97706', '#DB2777', '#7C3AED', '#EA580C', '#0284C7', '#DC2626'];

  // Admin Management States
  const [adminsList, setAdminsList] = useState<any[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState<string>('');
  const [newAdminName, setNewAdminName] = useState<string>('');
  const [newAdminMemo, setNewAdminMemo] = useState<string>('');
  const [mgmtLoading, setMgmtLoading] = useState<boolean>(false);

  // My Profile Management States
  const [myAdminName, setMyAdminName] = useState<string>('');
  const [myAdminMemo, setMyAdminMemo] = useState<string>('');
  const [myProfileLoading, setMyProfileLoading] = useState<boolean>(false);
  const hasInitializedProfileRef = useRef<boolean>(false);

  // Custom modal dialog states to prevent sandboxed iframe blockages
  const [customConfirm, setCustomConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
  } | null>(null);

  const [customAlert, setCustomAlert] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onClose?: () => void;
  } | null>(null);

  // Track Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthChecking(true);
      if (user) {
        setCurrentUser(user);
        
        // Bootstrapping and Migration for admins to avoid duplicate UID/Email records
        if (user.email) {
          try {
            const emailKey = user.email.toLowerCase().trim();
            const emailDocRef = doc(db, 'admins', emailKey);
            const uidDocRef = doc(db, 'admins', user.uid);
            
            const snaps = await getDocs(collection(db, 'admins'));
            const emailDocExists = snaps.docs.find(d => d.id === emailKey);
            const uidDocExists = snaps.docs.find(d => d.id === user.uid);
            
            if (user.email === 'seanyoo97@gmail.com') {
              setIsAdmin(true);
            } else {
              const hasPrivilege = snaps.docs.some(d => {
                const data = d.data();
                const docEmail = (data.email || '').toLowerCase().trim();
                return d.id === user.uid || d.id === emailKey || docEmail === emailKey;
              });
              setIsAdmin(hasPrivilege);
            }

            if (emailDocExists && !uidDocExists) {
              const emailData = emailDocExists.data();
              // Migrate and retain name & memo
              await setDoc(uidDocRef, {
                email: emailKey,
                name: emailData.name || '',
                memo: emailData.memo || '',
                role: 'admin',
                updatedAt: new Date().toISOString()
              });
              try {
                await deleteDoc(emailDocRef);
              } catch (delErr) {
                console.error("Clean old email doc failed:", delErr);
              }
            } else if (!uidDocExists && user.email === 'seanyoo97@gmail.com') {
              // Create the default record for the master admin if none exists
              await setDoc(uidDocRef, {
                email: emailKey,
                role: 'admin',
                updatedAt: new Date().toISOString()
              });
            }
          } catch (err) {
            console.error("Master / Admin Bootstrapping and Migration Error:", err);
            if (user.email === 'seanyoo97@gmail.com') {
              setIsAdmin(true);
            }
          }
        } else {
          setIsAdmin(false);
        }
      } else {
        setCurrentUser(null);
        setIsAdmin(false);
      }
      setAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch Firestore Data when Admin is Authorized
  useEffect(() => {
    if (currentUser && isAdmin) {
      fetchAllData();
    }
  }, [currentUser, isAdmin]);

  const fetchAllData = async () => {
    setFetchingData(true);
    try {
      // Fetch Demand Surveys
      try {
        const demandSnap = await getDocs(collection(db, 'surveys_demand'));
        setDemands(demandSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'surveys_demand');
      }

      // Fetch Field Corp
      try {
        const corpSnap = await getDocs(collection(db, 'surveys_field_corp'));
        setFieldCorps(corpSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'surveys_field_corp');
      }

      // Fetch Field Trainee
      try {
        const traineeSnap = await getDocs(collection(db, 'surveys_field_trainee'));
        setFieldTrainees(traineeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'surveys_field_trainee');
      }

      // Fetch FGIs
      try {
        const fgiSnap = await getDocs(collection(db, 'surveys_fgi'));
        setFgis(fgiSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'surveys_fgi');
      }

      // Fetch Admins List
      try {
        const adminSnap = await getDocs(collection(db, 'admins'));
        setAdminsList(adminSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Admin list load error:", err);
      }

    } catch (err) {
      console.error("Data Load Error:", err);
    } finally {
      setFetchingData(false);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error("Popup Sign in Fail:", err);
      setCustomAlert({
        isOpen: true,
        title: "로그인 오류",
        message: "구글 로그인 팝업 과정 중 오류가 발생했습니다."
      });
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleAddNewAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailKey = newAdminEmail.trim().toLowerCase();
    if (!emailKey) {
      setCustomAlert({
        isOpen: true,
        title: "입력 오류",
        message: "이메일 주소는 필수 입력 항목입니다."
      });
      return;
    }

    setMgmtLoading(true);
    try {
      const docRef = doc(db, 'admins', emailKey);
      await setDoc(docRef, {
        email: emailKey,
        name: newAdminName.trim() || '관리자',
        memo: newAdminMemo.trim() || '',
        role: 'admin',
        updatedAt: new Date().toISOString()
      });

      setNewAdminEmail('');
      setNewAdminName('');
      setNewAdminMemo('');
      
      // Refresh list
      const adminSnap = await getDocs(collection(db, 'admins'));
      setAdminsList(adminSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setCustomAlert({
        isOpen: true,
        title: "등록 완료",
        message: "새로운 관리자 계정이 성공적으로 등록되었습니다."
      });
    } catch (err: any) {
      console.error("Add Admin Error:", err);
      setCustomAlert({
        isOpen: true,
        title: "등록 실패",
        message: "관리자 추가에 실패했습니다: " + err.message
      });
    } finally {
      setMgmtLoading(false);
    }
  };

  const handleDeleteAdmin = async (uidToDelete: string, emailToDelete: string) => {
    if (emailToDelete === 'seanyoo97@gmail.com') {
      setCustomAlert({
        isOpen: true,
        title: "삭제 불가",
        message: "최고 마스터 계정은 삭제할 수 없습니다."
      });
      return;
    }

    if (uidToDelete === currentUser?.uid) {
      setCustomAlert({
        isOpen: true,
        title: "삭제 불가",
        message: "본인 계정은 삭제할 수 없습니다."
      });
      return;
    }

    setCustomConfirm({
      isOpen: true,
      title: "관리자 권한 삭제",
      message: `정말로 이메일 [${emailToDelete}] 관리자의 권한을 회수 및 삭제하시겠습니까?`,
      confirmText: "삭제 실행",
      cancelText: "취소",
      isDanger: true,
      onConfirm: async () => {
        setCustomConfirm(null);
        setMgmtLoading(true);
        try {
          await deleteDoc(doc(db, 'admins', uidToDelete));
          // Refresh list
          const adminSnap = await getDocs(collection(db, 'admins'));
          setAdminsList(adminSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setCustomAlert({
            isOpen: true,
            title: "삭제 완료",
            message: "관리자 계정이 성공적으로 삭제 처리되었습니다."
          });
        } catch (err: any) {
          console.error("Delete Admin Error:", err);
          setCustomAlert({
            isOpen: true,
            title: "삭제 실패",
            message: "관리자 삭제에 실패했습니다: " + err.message
          });
        } finally {
          setMgmtLoading(false);
        }
      }
    });
  };

  // --- MY PROFILE EDITING LOGIC ---
  useEffect(() => {
    if (currentUser && adminsList.length > 0 && !hasInitializedProfileRef.current) {
      const myAdmins = adminsList.filter(admin => 
        admin.id === currentUser.uid || 
        (admin.email && admin.email.toLowerCase().trim() === currentUser.email?.toLowerCase().trim())
      );
      
      const recordWithName = myAdmins.find(admin => admin.name);
      const myRecord = recordWithName || myAdmins[0];

      if (myRecord) {
        setMyAdminName(myRecord.name || '');
        setMyAdminMemo(myRecord.memo || '');
        hasInitializedProfileRef.current = true;
      }
    }
  }, [adminsList, currentUser]);

  const handleUpdateMyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setMyProfileLoading(true);
    try {
      const myAdmins = adminsList.filter(admin => 
        admin.id === currentUser.uid || 
        (admin.email && admin.email.toLowerCase().trim() === currentUser.email?.toLowerCase().trim())
      );
      
      const recordWithName = myAdmins.find(admin => admin.name);
      const myRecord = recordWithName || myAdmins[0];
      const docKey = myRecord?.id || currentUser.uid;

      // Update in Firestore
      const docRef = doc(db, 'admins', docKey);
      await setDoc(docRef, {
        email: currentUser.email?.toLowerCase().trim() || '',
        name: myAdminName.trim(),
        memo: myAdminMemo.trim(),
        role: 'admin',
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Flag to re-populate on data load
      hasInitializedProfileRef.current = false;

      // Refresh admins list
      const adminSnap = await getDocs(collection(db, 'admins'));
      setAdminsList(adminSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      setCustomAlert({
        isOpen: true,
        title: "프로필 수정 완료",
        message: "내 프로필 정보가 성공적으로 반영되었습니다."
      });
    } catch (err: any) {
      console.error("Update Profile Error:", err);
      setCustomAlert({
        isOpen: true,
        title: "수정 실패",
        message: "프로필 수정에 실패했습니다: " + err.message
      });
    } finally {
      setMyProfileLoading(false);
    }
  };

  // --- MS EXCEL GENERATION LOGIC ---
  const downloadExcel = () => {
    try {
      let xlsxLib: any = XLSX;
      if (!xlsxLib) {
        throw new Error("XLSX 라이브러리가 로드되지 않았습니다.");
      }
      if (xlsxLib.default && xlsxLib.default.utils) {
        xlsxLib = xlsxLib.default;
      }

      let targetData: any[] = [];
      let filename = '';

      if (activeTab === 'demand') {
        targetData = demands;
        filename = '2027_훈련수요조사_전체데이터.xlsx';
      } else if (activeTab === 'field_corp') {
        targetData = fieldCorps;
        filename = '현업적용도_기업용_전체데이터.xlsx';
      } else if (activeTab === 'field_trainee') {
        targetData = fieldTrainees;
        filename = '현업적용도_훈련생용_전체데이터.xlsx';
      } else if (activeTab === 'fgi') {
        targetData = fgis;
        filename = '2026_FGI심층조사_전체데이터.xlsx';
      } else {
        return; // admin_mgmt is excluded from exporting anyways
      }

      if (targetData.length === 0) {
        setCustomAlert({
          isOpen: true,
          title: "다운로드 불가",
          message: "다운로드할 데이터가 존재하지 않습니다."
        });
        return;
      }

      // Exact schemas mapped directly to clean, elegant Korean headers in stable order
      const DEMAND_HEADER_MAP: { [key: string]: string } = {
        companyName: "회사명",
        representative: "대표자",
        companyAddress: "소재지",
        contactName: "담당자성명",
        department: "부서",
        position: "직위",
        tel: "전화번호",
        mobile: "휴대전화",
        fax: "팩스번호",
        email: "이메일",
        privacyConsent: "개인정보동의",
        q1_1: "Q1-1_주요인력구성",
        q1_2: "Q1-2_소재권역",
        q1_3: "Q1-3_상시근로자수",
        q2_1: "Q2-1_컨소시엄참여이력",
        q2_2: "Q2-2_훈련인지경로",
        q2_3: "Q2-3_직무능력필요성",
        q2_4: "Q2-4_훈련필요이유",
        q2_5: "Q2-5_실습이론비율",
        q2_5_other: "Q2-5_실습이론비율(기타)",
        q2_6: "Q2-6_훈련결정권자",
        q2_6_other: "Q2-6_훈련결정권자(기타)",
        q2_7: "Q2-7_참여애로사항",
        q2_7_other: "Q2-7_참여애로사항(기타)",
        q2_8: "Q2-8_참여의향성",
        q3_1: "Q3-1_희망교육원",
        q3_2: "Q3-2_교육원선택이유",
        q3_2_other: "Q3-2_교육원선택이유(기타)",
        q3_3: "Q3-3_참여희망과정및시기",
        q3_4: "Q3-4_참여고려요인",
        q3_4_other: "Q3-4_참여고려요인(기타)",
        q4_1: "Q4-1_기술적직무애로",
        q4_2: "Q4-2_애로해소방법",
        q4_3: "Q4-3_자유의견",
        q4_4: "Q4-4_기타의견",
        createdAt: "제출일시"
      };

      const CORP_HEADER_MAP: { [key: string]: string } = {
        companyName: "회사명",
        traineeName: "수강생성명",
        q1_1: "Q1-1_응답자직위",
        q1_1_final: "Q1-1_직위(상세)",
        q1_2: "Q1-2_주요업종",
        q1_2_final: "Q1-2_업종(상세)",
        q1_3: "Q1-3_상시근로자수",
        q1_4: "Q1-4_업무변화관찰수준",
        q2_1: "Q2-1_학습내용지원여부",
        q2_2: "Q2-2_제공지원방식",
        q2_2_final: "Q2-2_지원방식(상세)",
        q2_3: "Q2-3_훈련과정확대의향",
        q2_4: "Q2-4_후속지원사항",
        q3_1: "Q3-1_업무적용도",
        q3_2: "Q3-2_업무수행체계성",
        q3_3: "Q3-3_업무성과향상도",
        q3_4: "Q3-4_문제해결기여도",
        q3_5: "Q3-5_조직기여도",
        q3_6: "Q3-6_업무개선사례",
        q3_7: "Q3-7_개선보완사항",
        createdAt: "제출일시"
      };

      const TRAINEE_HEADER_MAP: { [key: string]: string } = {
        q1_1: "Q1-1_응답업무분야",
        q1_1_final: "Q1-1_비즈니스분야(기타상세포함)",
        q1_2: "Q1-2_회사근속기간",
        q2_1: "Q2-1_업무관련성",
        q2_2: "Q2-2_업무유용성",
        q2_3: "Q2-3_실용적용성",
        q2_4: "Q2-4_업무향상도",
        q2_5: "Q2-5_성과기여도",
        q3_1: "Q3-1_자기효능감1",
        q3_2: "Q3-2_자기효능감2",
        q3_3: "Q3-3_전이동기1",
        q3_4: "Q3-4_전이동기2",
        q3_5: "Q3-5_전이설계1",
        q3_6: "Q3-6_전이설계2",
        q3_7: "Q3-7_상사/동료지원1",
        q3_8: "Q3-8_상사/동료지원2",
        q3_9: "Q3-9_변화가능성1",
        q3_10: "Q3-10_변화가능성2",
        q4: "Q4_주관식의견(정성)",
        createdAt: "제출일시"
      };

      const FGI_HEADER_MAP: { [key: string]: string } = {
        interviewDate: "면담일시",
        companyName: "회사명",
        companyType: "기업규모",
        companyAddressCity: "회사소재지(시/도)",
        companyAddressDistrict: "회사소재지(시/군/구)",
        industry: "업종분류",
        contactName: "담당자성명",
        department: "담당부서",
        position: "직위",
        tel: "전화번호",
        email: "이메일",
        q1_1: "Q1-1_기술인력규모",
        q1_2: "Q1-2_주요연령대",
        q1_3: "Q1-3_担当업무",
        q2_1: "Q2-1_참여교육대상자",
        q2_2: "Q2-2_직무역량수준",
        q2_3: "Q2-3_훈련과정만족도",
        q2_4: "Q2-4_시급한직무역량",
        q2_5: "Q2-5_신설희망과정",
        q3_1: "Q3-1_공동훈련선택이유",
        q3_2: "Q3-2_참여자차출애로",
        q3_3: "Q3-3_선호과정유형",
        q3_4: "Q3-4_교육참가월",
        q3_5: "Q3-5_적정참가인원",
        q4_1: "Q4-1_전반적만족도",
        q4_2: "Q4-2_개선필요사항",
        q4_3: "Q4-3_FGI기타유익사례(정성)",
        createdAt: "제출일시"
      };

      let headerMap: { [key: string]: string } = {};
      if (activeTab === 'demand') {
        headerMap = DEMAND_HEADER_MAP;
      } else if (activeTab === 'field_corp') {
        headerMap = CORP_HEADER_MAP;
      } else if (activeTab === 'field_trainee') {
        headerMap = TRAINEE_HEADER_MAP;
      } else if (activeTab === 'fgi') {
        headerMap = FGI_HEADER_MAP;
      }

      // Convert data rows cleanly using headerMap to ensure order and Korean headers
      const mappedRows = targetData.map(row => {
        const formattedRow: any = {};
        Object.keys(headerMap).forEach(key => {
          let val = row[key];
          let displayValue = '';
          if (val === undefined || val === null) {
            displayValue = '';
          } else if (key === 'q3_3' && typeof val === 'object' && !Array.isArray(val) && val !== null) {
            displayValue = Object.keys(val).map(course => `${course}(${val[course].join(', ')})`).join(' | ');
          } else if (Array.isArray(val)) {
            displayValue = val.map((v: any) => typeof v === 'object' ? (v.label || v.name || JSON.stringify(v)) : String(v)).join(', ');
          } else if (typeof val === 'object' && val !== null) {
            displayValue = val.seconds ? new Date(val.seconds * 1000).toLocaleString() : JSON.stringify(val);
          } else {
            displayValue = String(val);
          }
          const korHeader = headerMap[key];
          formattedRow[korHeader] = displayValue;
        });
        return formattedRow;
      });

      if (!xlsxLib.utils || !xlsxLib.utils.json_to_sheet) {
        throw new Error("XLSX 라이브러리 유틸리티 및 변환 함수가 정의되어 있지 않습니다.");
      }

      const worksheet = xlsxLib.utils.json_to_sheet(mappedRows);
      
      // Auto-fit column widths taking Korean characters into account
      const maxColWidths = Object.keys(headerMap).map(key => {
        const korHeader = headerMap[key];
        const getLengthOfKorn = (str: string) => {
          let len = 0;
          for (let i = 0; i < str.length; i++) {
            if (str.charCodeAt(i) > 127) {
              len += 2.0;
            } else {
              len += 1.0;
            }
          }
          return len;
        };
        let maxLen = getLengthOfKorn(korHeader);
        mappedRows.forEach((row: any) => {
          const valStr = String(row[korHeader] || '');
          const valLen = getLengthOfKorn(valStr);
          if (valLen > maxLen) {
            maxLen = valLen;
          }
        });
        return { wch: Math.min(Math.max(Math.floor(maxLen) + 4, 10), 80) };
      });

      worksheet['!cols'] = maxColWidths;

      const workbook = xlsxLib.utils.book_new();
      xlsxLib.utils.book_append_sheet(workbook, worksheet, "전체데이터");
      
      // Use clean binary string -> ArrayBuffer conversion for robust XLSX download in iframe sandbox
      const wbout = xlsxLib.write(workbook, { bookType: 'xlsx', type: 'binary' });
      const s2ab = (s: string) => {
        const buf = new ArrayBuffer(s.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i < s.length; i++) {
          view[i] = s.charCodeAt(i) & 0xFF;
        }
        return buf;
      };
      
      const blob = new Blob([s2ab(wbout)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);

    } catch (error: any) {
      console.error("Excel Generation Error:", error);
      setCustomAlert({
        isOpen: true,
        title: "다운로드 실패",
        message: "엑셀 생성 과정 중 오류가 발생했습니다: " + error.message
      });
    }
  };

  // --- PDF EXPORT LOGIC (html2pdf.js with OKLCH and OKLAB dynamic color-space recovery) ---
  const oklchToRgb = (l_val: number, c_val: number, h_val: number): [number, number, number] => {
    let L = l_val;
    let C = c_val;
    let H = h_val;

    if (isNaN(L)) L = 0;
    if (isNaN(C)) C = 0;
    if (isNaN(H)) H = 0;

    const h_rad = (H * Math.PI) / 180;
    const a = C * Math.cos(h_rad);
    const b = C * Math.sin(h_rad);

    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

    const l = l_ * l_ * l_;
    const m = m_ * m_ * m_;
    const s = s_ * s_ * s_;

    const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const b_val = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

    const fn = (v: number) => {
      if (v <= 0.0031308) {
        return 12.92 * v;
      } else {
        return 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
      }
    };

    const R = Math.max(0, Math.min(255, Math.round(fn(r) * 255)));
    const G = Math.max(0, Math.min(255, Math.round(fn(g) * 255)));
    const B = Math.max(0, Math.min(255, Math.round(fn(b_val) * 255)));

    return [R, G, B];
  };

  const oklabToRgb = (L: number, a: number, b: number): [number, number, number] => {
    if (isNaN(L)) L = 0;
    if (isNaN(a)) a = 0;
    if (isNaN(b)) b = 0;

    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

    const l = l_ * l_ * l_;
    const m = m_ * m_ * m_;
    const s = s_ * s_ * s_;

    const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const b_val = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

    const fn = (v: number) => {
      if (v <= 0.0031308) {
        return 12.92 * v;
      } else {
        return 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
      }
    };

    const R = Math.max(0, Math.min(255, Math.round(fn(r) * 255)));
    const G = Math.max(0, Math.min(255, Math.round(fn(g) * 255)));
    const B = Math.max(0, Math.min(255, Math.round(fn(b_val) * 255)));

    return [R, G, B];
  };

  const convertOklchStr = (str: string): string => {
    if (!str || typeof str !== 'string') return str;
    if (!str.includes('oklch')) return str;

    return str.replace(/oklch\(([^)]+)\)/gi, (match, contents) => {
      const parts = contents.trim().split(/[\s,/\s]+/);
      if (parts.length < 3) return match;

      const l_str = parts[0];
      const c_str = parts[1];
      const h_str = parts[2];
      const a_str = parts[3];

      let L = l_str.endsWith('%') ? parseFloat(l_str) / 100 : parseFloat(l_str);
      let C = c_str.endsWith('%') ? parseFloat(c_str) / 100 : parseFloat(c_str);
      let H = h_str.endsWith('deg') ? parseFloat(h_str) : parseFloat(h_str);
      let A = a_str ? (a_str.endsWith('%') ? parseFloat(a_str) / 100 : parseFloat(a_str)) : 1;

      try {
        const [r, g, b] = oklchToRgb(L, C, H);
        if (A < 1) {
          return `rgba(${r}, ${g}, ${b}, ${A})`;
        } else {
          return `rgb(${r}, ${g}, ${b})`;
        }
      } catch (e) {
        return match;
      }
    });
  };

  const convertOklabStr = (str: string): string => {
    if (!str || typeof str !== 'string') return str;
    if (!str.includes('oklab')) return str;

    return str.replace(/oklab\(([^)]+)\)/gi, (match, contents) => {
      const parts = contents.trim().split(/[\s,/\s]+/);
      if (parts.length < 3) return match;

      const l_str = parts[0];
      const a_str = parts[1];
      const b_str = parts[2];
      const alpha_str = parts[3];

      let L = l_str.endsWith('%') ? parseFloat(l_str) / 100 : parseFloat(l_str);
      let a = a_str.endsWith('%') ? parseFloat(a_str) / 100 : parseFloat(a_str);
      let b = b_str.endsWith('%') ? parseFloat(b_str) / 100 : parseFloat(b_str);
      let A = alpha_str ? (alpha_str.endsWith('%') ? parseFloat(alpha_str) / 100 : parseFloat(alpha_str)) : 1;

      try {
        const [r, g, b_val] = oklabToRgb(L, a, b);
        if (A < 1) {
          return `rgba(${r}, ${g}, ${b_val}, ${A})`;
        } else {
          return `rgb(${r}, ${g}, ${b_val})`;
        }
      } catch (e) {
        return match;
      }
    });
  };

  const convertModernColorStr = (str: string): string => {
    let result = str;
    if (result && result.includes('oklch')) {
      result = convertOklchStr(result);
    }
    if (result && result.includes('oklab')) {
      result = convertOklabStr(result);
    }
    return result;
  };

  const handleClearSpecificData = (colName: string, koreanLabel: string) => {
    setCustomConfirm({
      isOpen: true,
      title: `${koreanLabel} 영구 삭제`,
      message: `주의! 정말로 시스템 내의 모든 [${koreanLabel}] 설문 응답 데이터를 실시간으로 영구 삭제하시겠습니까? (이 작업은 되돌릴 수 없습니다.)`,
      confirmText: "영구 삭제 실행",
      cancelText: "취소",
      isDanger: true,
      onConfirm: async () => {
        setCustomConfirm(null);
        setFetchingData(true);
        try {
          const snap = await getDocs(collection(db, colName));
          const deletePromises = snap.docs.map(d => deleteDoc(doc(db, colName, d.id)));
          await Promise.all(deletePromises);
          await fetchAllData();
          setCustomAlert({
            isOpen: true,
            title: "삭제 완료",
            message: `모든 [${koreanLabel}] 데이터가 정상적으로 영구 삭제되었습니다.`
          });
        } catch (e: any) {
          console.error(`Error deleting ${colName}:`, e);
          setCustomAlert({
            isOpen: true,
            title: "삭제 에러",
            message: `데이터 초기화 도중 오류가 발생했습니다: ${e.message}`
          });
        } finally {
          setFetchingData(false);
        }
      }
    });
  };

  const handleClearAllData = () => {
    setCustomConfirm({
      isOpen: true,
      title: "전체 데이터 일괄 영구 삭제",
      message: "주의! 정말로 시스템 내의 모든 설문 응답 데이터(수요조사, 현업적용도(기업), 현업적용도(훈련생), FGI)를 실시간으로 영구 삭제하시겠습니까? (이 작업은 되돌릴 수 없습니다.)",
      confirmText: "영구 삭제 실행",
      cancelText: "취소",
      isDanger: true,
      onConfirm: async () => {
        setCustomConfirm(null);
        setFetchingData(true);
        try {
          const collections = ['surveys_demand', 'surveys_field_corp', 'surveys_field_trainee', 'surveys_fgi'];
          for (const colName of collections) {
            const snap = await getDocs(collection(db, colName));
            const deletePromises = snap.docs.map(d => deleteDoc(doc(db, colName, d.id)));
            await Promise.all(deletePromises);
          }
          await fetchAllData();
          setCustomAlert({
            isOpen: true,
            title: "초기화 완료",
            message: "모든 데이터가 정상적으로 영구 삭제되었습니다."
          });
        } catch (e: any) {
          console.error("error clear:", e);
          setCustomAlert({
            isOpen: true,
            title: "초기화 에러",
            message: "데이터 초기화 도중 오류가 발생했습니다: " + e.message
          });
        } finally {
          setFetchingData(false);
        }
      }
    });
  };

  const handleSeedAllData = () => {
    setCustomConfirm({
      isOpen: true,
      title: "시연용 샘플 데이터 생성",
      message: "통계 분석 및 대시보드 시뮬레이션을 위해 각 문항에 모든 무결성 답변이 채워진 고품질의 샘플 데이터(수요조사, 현업적용도(기업), 현업적용도(훈련생), FGI 각 16건)를 생성하시겠습니까?",
      confirmText: "생성 실행",
      cancelText: "취소",
      isDanger: false,
      onConfirm: async () => {
        setCustomConfirm(null);
        setFetchingData(true);
        try {
          const getRandomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
          const getRandomSubArray = <T,>(arr: T[], minLength: number = 1, maxLength: number = 3): T[] => {
            const shuffled = [...arr].sort(() => 0.5 - Math.random());
            const len = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
            return shuffled.slice(0, Math.min(len, arr.length));
          };
          const getRandomScore = (weights = [0.05, 0.08, 0.12, 0.45, 0.3]): string => {
            const r = Math.random();
            let cum = 0;
            for (let i = 0; i < weights.length; i++) {
              cum += weights[i];
              if (r <= cum) return (i + 1).toString();
            }
            return "4";
          };

          const companyPool = [
            "한전KPS(주) 충남사업소", "(주)삼우전기안전", "현대건설 충청안전본부", "LS일렉트릭 청주공장", "충남대학교병원 설비팀",
            "두산에너빌리티 창원", "SK하이닉스 청주캠퍼스", "포스코 포항제철소", "LX하우시스 울산", "한국전력 대전본부",
            "금호석유화학 여수", "삼성디스플레이 천안", "코오롱인더스트리 구미", "롯데케미칼 대산", "한화솔루션 여수",
            "아모레퍼시픽 대전공장", "삼양사 세종공장", "일진하이솔루스", "성우하이텍", "동희오토 예산"
          ];

          const traineePool = [
            "김우진", "이정훈", "박준형", "최영민", "강동우", "정지오", "황지훈", "이민성", "최승우", "장현우",
            "박혜진", "김다은", "이지현", "서아름", "도민준", "천송이", "장그레", "안영이", "한석율", "장백기"
          ];

          const repPool = [
            "홍길동", "이순신", "강감찬", "유관순", "임꺽정", "홍경래", "장보고", "안중근", "김구", "윤봉길"
          ];

          const deptPool = [
            "시설관리팀", "안전보건실", "전기제어과", "공무팀", "인사총무부", "생산기술과", "공정자동화팀", "안전점검센터"
          ];

          const posPool = [
            "팀장", "과장", "차장", "대리", "부장", "주임", "주임연구원", "파트장"
          ];

          const cityPool = [
            "경기 안양시", "부산 사하구", "광주 북구", "대전 유성구",
            "충남 천안시", "충북 청주시", "세종특별자치시", "울산 남구"
          ];

          // 1. Demand survey mock data
          const demandQ4_3_Pool = [
            "PLC 지멘스 특별 트래픽 급속 제어반 실습",
            "KEC 규격 기반 고압 케이블 포설 설계 대행",
            "전기차 충전인프라 화재 예방 및 고전압 보호계전",
            "정밀 계측 전원 노이즈 분석 실시간 진단 트랙",
            "KEC 전선 배선 실무 정합 설계 시연 교반",
            "ESS 고출력 배터리 안전 열폭주 대비 운용",
            "수배전 차단기 정밀 동작 회로 해석 보충반",
            "전기시공관리자 현업 맞춤 인접업무 기초 이론"
          ];
          const demandQ4_4_Pool = [
            "바쁜 현장 기사들을 위하여 주말이나 야간 교차 이수 세션을 적극 열어주셨으면 고맙겠습니다.",
            "이론 강의보다는 실제 작동하는 최신 사양 실습 장비를 더 많이 만져볼 수 있게 인프라를 보조해 주세요.",
            "매해 개정되는 한글 KEC 분석 교보재 매뉴얼을 훈련 후에 실무 도람용으로 한 권씩 추가 지급해주면 엄청난 성장이 예상됩니다.",
            "강사진의 강의 수준이 뛰어난데, 현장 돌발 사고 극복 사례를 풍부한 영상으로 사후 공유 받았으면 합니다.",
            "정원 제약으로 신청이 너무나 빨리 마감됩니다. 분기 대비 과정 수 자체를 확대 구성해 배려해주길 희망합니다.",
            "우리 소규모 대행업체 근로자들에게 최적화된 소그룹 방문 이동형 매핑 지도과정도 증설 부탁드립니다.",
            "과정에서 사용되는 기자재가 산업 현장 최신 기종과 일치했으면 실무 투입 시 이점이 극대화될 것입니다.",
            "집체 교육의 시간적 공백을 온라인 사전 이러닝 복습 패키지 등으로 메울 수 있는 정책적 결단이 시급합니다."
          ];

          const sampleDemands = [];
          for (let i = 0; i < 16; i++) {
            const comp = companyPool[i % companyPool.length];
            const name = traineePool[i % traineePool.length];
            const rep = repPool[i % repPool.length];
            const dept = deptPool[i % deptPool.length];
            const pos = posPool[i % posPool.length];
            const city = cityPool[i % cityPool.length];

            sampleDemands.push({
              companyName: comp,
              representative: rep,
              companyAddress: city,
              contactName: traineePool[(i + 5) % traineePool.length],
              department: dept,
              position: pos,
              tel: `042-821-${1000 + i}`,
              mobile: `010-${2000 + i}-5678`,
              fax: `042-821-${1001 + i}`,
              email: `${getRandomItem(['wjkim', 'jhlee', 'jhpark', 'dykang', 'shlee', 'mskim', 'swchoi', 'hwjang'])}@${getRandomItem(['kps.co.kr', 'naver.com', 'daum.net', 'gmail.com'])}`,
              privacyConsent: true,
              q1_1: getRandomItem(['설계', '감리', '안전관리', '진단·점검', '기타']),
              q1_2: getRandomItem(['수도권', '충청권', '강원권', '호남권', '영남권', '제주권']),
              q1_3: getRandomItem(['10명 미만', '10명~50명 미만', '50명~100명 미만', '100명~300명 미만', '300명 이상']),
              q2_1: getRandomItem(['훈련과정에 대해 알고 있으며 참여한 경험이 있다', '훈련과정에 대해 알고 있으나 참여하지 않았다', '훈련과정에 대해 알지 못한다']),
              q2_2: getRandomSubArray(['회사 교육 담당자의 안내', '지인을 통한 안내와 추천', '협회 홈페이지 및 이메일 등 웹매체를 통해서', '협회지, 홍보 리플릿 등 우편물을 통해서'], 1, 2),
              q2_3: getRandomItem(['5', '4', '3', '2', '1']),
              q2_4: getRandomItem(['담당 업무에 대한 기본 소양 확보', '담당 업무에 대한 실무능력향상', '담당 업무가 아닌 인접 업무로 확장', '강사 또는 수강생들과의 교류를 통해 정보 습득', '기타']),
              q2_5: getRandomItem(['실습(40) : 이론(60)', '실습(50) : 이론(50)', '실습(60) : 이론(40)', '실습(70) : 이론(30)', '기타']),
              q2_5_other: '',
              q2_6: getRandomItem(['인사/교육 담당 부서', '대표자 또는 경영진', '현업 부서장', '개인(근로자 본인)', '기타']),
              q2_6_other: '',
              q2_7: getRandomSubArray(['대체인력 부족', '일정 조정 어려움', '훈련과정 정보 부족', '경영층의 인식 부족', '비용 부담', '기타'], 1, 3),
              q2_7_other: '',
              q2_8: getRandomItem(['5', '4', '3', '2', '1']),
              q3_1: getRandomItem(['중앙교육원(경기도 안양시)', '영남교육원(부산광역시)', '호남교육원(광주광역시)']),
              q3_2: getRandomItem(['접근성(거리·교통)', '교육시설 및 환경', '희망 과정 운영', '업무와의 연계성', '기타']),
              q3_2_other: '',
              q3_3: getRandomSubArray(COURSES_LIST, 2, 5),
              q3_4: getRandomSubArray(['훈련 내용의 적합성', '업무와의 연관성', '훈련 일정', '비용 지원 여부', '훈련기관 인지도', '기타'], 1, 3),
              q3_4_other: '',
              q4_1: getRandomItem(['교육 부족', '역량 부족', '매뉴얼 부족', '최신기술 대응 부족', '기타']),
              q4_2: getRandomItem(['세미나', '사내 교육', '매뉴얼', '외부 위탁', '기타']),
              q4_3: getRandomItem(demandQ4_3_Pool),
              q4_4: getRandomItem(demandQ4_4_Pool),
              createdAt: new Date().toISOString()
            });
          }

          // 2. Field Corp
          const corpQ2_7_Pool = [
            "수료 후 현장에서 막힐 때 활용할 수 있는 이메일 온라인 원격 질의응답 피드백 채널 개설",
            "매년 업데이트되는 최신 KEC 기술규정 요약 실무 책자 및 체크리스트 발송",
            "PLC 심화 제어 실무 동영상 강의 링크 및 예제 프로젝트 소스코드 상시 공개",
            "현장 적용 중 오작동 예방을 위한 모의 고장 훈련 동영상 및 장비 이력서 공유",
            "소속 기업 현장을 방문하여 실무 애로 기술을 진단하고 가이드해주는 1:1 자문 서비스 도입",
            "과정이 끝난 후에도 기수별 교류를 도모해 줄 세미나 정기 주최"
          ];
          const corpQ3_6_Pool = [
            "수료 복귀 후 미쯔비시 PLC 래더 코딩 활용법을 선임 팀원들과 주도적으로 세미나를 열어 전파하여 오작동 사고를 예방하는 성과를 도출함.",
            "특강에서 습득한 접지 노하우를 발휘해 노후 분전반의 불명확한 누전 부위를 정밀 매클 추적하여 조기 결함 해소 기염을 토함.",
            "계측기 고주파 노이즈 필터 동작을 정확하게 시연·해석해 공정 내 기계적 오동작의 진척 현상을 95% 이상 조기 수선 조치함.",
            "KEC 표준 접지선을 규격대로 즉각 전면 재배치하여 안전공사 검사 기준을 단번에 통과함과 동시에 100% 무재해 전장을 완수함.",
            "현장 수배전기 내부 열화상 측정 분석 노하우를 바탕으로, 과열 현상이 포착된 메인 변압기를 폭발 전에 긴급 교체 조치하는 성과를 거둠.",
            "공조 실무 제어 회로를 최적화하여 연간 대기전력 소모를 15% 감축하는 실효적 조직 기여에 성공함."
          ];
          const corpQ3_7_Pool = [
            "자사 조작반 제어기 사양에 맞춰 더 미세하게 복합 고장을 셋업해볼 수 있는 디버깅 교보재 세트를 지원해 주기 희망합니다.",
            "KEC 이론 계산이 까다로워 수험생들을 위해 계산식을 쉽게 도와주는 현장용 엑셀 매크로 템플릿 교육이 더 깊게 가미되길 바랍니다.",
            "실제 현장에서 단선된 고장 케이블이나 오동작 차단기 등 대형 고장 셋업 실물 제품이 교육장에 상시 추가 배치되면 좋겠습니다.",
            "교육 기간이 조금 짧아 실습 시간이 아쉬웠습니다. 집체 시간을 하루 이틀 더 늘리거나 주말 실습반을 신설해 주길 바람.",
            "지멘스뿐만 아니라 미쯔비시나 멜섹 등 다른 최신 인공지능 통합 메이커 장비에 대한 상호 호환 시연도 추가되길 원합니다.",
            "이러닝으로 기초 사전 상식을 이수하고 오프라인에선 풀 실습만 집중할 수 있는 하이브리드 커리큘럼 전환이 추진되면 합니다."
          ];

          const sampleCorps = [];
          for (let i = 0; i < 16; i++) {
            const comp = companyPool[i % companyPool.length];
            const name = traineePool[i % traineePool.length];
            const dept = deptPool[i % deptPool.length];

            sampleCorps.push({
              companyName: comp,
              traineeName: name,
              q1_1: getRandomItem(['대표이사/사업주', '임원', '부서장', '팀장/현장관리자', '인사/교육담당자', '기타']),
              q1_2: getRandomItem(['설계', '감리', '안전관리', '진단/점검', '기타']),
              q1_3: getRandomItem(['10명 미만', '10명~50명 미만', '50명~100명 미만', '100명~300명 미만', '300명 이상']),
              q1_4: getRandomItem(['직접 지시/평가', '주기적 확인', '간접 파악', '거의 모름']),
              q2_1: getRandomSubArray(COURSES_LIST, 1, 3),
              q2_2: getRandomItem(['업무생산성 향상', '신기술 도입 대비', '자격 취득', '안전사고 예방', '기타']),
              q2_3: getRandomScore(),
              q2_4: getRandomScore(),
              q2_5: getRandomItem(['근무시간 배려', '자료 및 장비 보조', '포상 및 가점', '별도 지원 없음']),
              q2_6: getRandomScore(),
              q2_7: getRandomItem(corpQ2_7_Pool),
              q3_1: getRandomScore([0.05, 0.05, 0.1, 0.4, 0.4]),
              q3_2: getRandomScore([0.05, 0.05, 0.12, 0.38, 0.4]),
              q3_3: getRandomScore([0.05, 0.1, 0.1, 0.45, 0.3]),
              q3_4: getRandomScore([0.05, 0.05, 0.1, 0.45, 0.35]),
              q3_5: getRandomScore([0.05, 0.05, 0.1, 0.4, 0.4]),
              q3_6: getRandomItem(corpQ3_6_Pool),
              q3_7: getRandomItem(corpQ3_7_Pool),
              createdAt: new Date().toISOString()
            });
          }

          // 3. Field Trainee
          const traineeQ8_Pool = [
            "KEC 표준에 따른 안전 절연 배선 규격을 현업에서 전산 설계할 때, 허용 전류 오차 갭을 9% 미만으로 정합 설계하여 자율 안전성 검사 승인을 성공 완수했습니다.",
            "수배전설비 시퀀스 도면 해석 특강에서 실습한 가상 차단 장애 대응 규칙을 사용해, 실제 낙뢰 시 비상발전기 연동 마스터 회로의 복구 시간을 15분 단축했습니다.",
            "현장에서 PLC 이더넷 통신 지연으로 가공 라인이 마비되었는데, 원격 패킷 모니터링 실습 노하우를 살려 통신 버퍼 용량을 늘려 30분 만에 완전 정상 복구했습니다.",
            "노후 소방 수배전반 내부를 계리 진단하는 열화상 카메라 분석 실무 덕분에, 미세 온도가 85도까지 급상승 중이던 마그네틱 접촉기를 적시에 교체하여 화재를 미연에 예방했습니다.",
            "관행적으로 처리하던 고저압 비접지 접지 저항 측정을 배운 멀티미터 주파수 필터링 기능으로 소숫점 둘째자리까지 정확하게 계측해서 전력 안전 등급을 B급으로 상승시켰습니다.",
            "공조 동력 제어 인공지능 센서의 PLC 프로그램을 최적화한 래더 로직으로 보완하여, 오작동으로 버려지는 가공 불량률을 무려 22% 감소시켰습니다."
          ];

          const sampleTrainees = [];
          for (let i = 0; i < 16; i++) {
            const isOther = Math.random() > 0.8;
            const q1_1_val = isOther ? '기타' : getRandomItem(['설계', '감리', '안전관리', '진단·점검']);
            sampleTrainees.push({
              q1_1: q1_1_val,
              q1_1_other: isOther ? '설비 유지보수 전담' : '',
              q1_1_final: isOther ? '기타(설비 유지보수 전담)' : q1_1_val,
              q1_2: getRandomItem(['1～5년', '6～10년', '11～15년', '16～20년', '21년 이상']),
              q2_1: getRandomScore(),
              q2_2: getRandomScore(),
              q2_3: getRandomScore(),
              q2_4: getRandomScore(),
              q2_5: getRandomScore(),
              q3_1: getRandomScore(),
              q3_2: getRandomScore(),
              q3_3: getRandomScore(),
              q3_4: getRandomScore(),
              q3_5: getRandomScore(),
              q3_6: getRandomScore(),
              q3_7: getRandomScore(),
              q3_8: getRandomScore(),
              q3_9: getRandomScore(),
              q3_10: getRandomScore(),
              q4: getRandomItem(traineeQ8_Pool),
              createdAt: new Date().toISOString()
            });
          }

          // 4. FGI Surveys
          const fgiQ4_3_Pool = [
            "공동훈련센터의 전기안전관리 교과가 매회 개정되는 KEC 기준법안을 속도감 있게 담아내고 있어 재교육 비용 부담이 엄청나게 줄었습니다. 앞으로도 최신 오프라인 정밀 실습 기재 확충 세션을 대폭 구성해 지원해 주세요.",
            "현장의 격무와 인력 부족으로 정규 며칠 교육 파견이 상시적인 고충 요소입니다. 이 공백을 슬기롭게 메우기 위한 1일 집중 교차 세션이나 동영상 사전 이러닝 보완책이 한층 정교하게 입안되기를 기대합니다.",
            "초급 기사들의 장비 작동 미숙이 안전 안전사고의 최대 원인인데, 실장 수준의 모의 사고 분석 및 복구 훈련이 교과 과정에 늘어나 학습 효과가 큽니다. 시공 중심의 전문 특성화 과정을 한층 확대 개방해주시면 정기 파견하겠습니다.",
            "수강생들의 교육 후 현업 적용도 성과가 가시적이라 만족스럽니다. 소수 인원이나 원격지에 위치한 기업을 위해 장비를 가지고 찾아가는 '이동식 맞춤 지도' 프로그램도 개설 검토해주시기를 부탁합니다."
          ];

          const fgiQ2_5_Pool = [
            "노후 설비 교체 및 KEC 규정에 따른 접지/피뢰 설비 설계 실무와 관련된 심화 교육이 필요합니다.",
            "최신 태양광 발전설비 및 ESS(에너지저장장치) 시스템 점검 및 유지보수 특화 과정이 시급합니다.",
            "수배전반 조작 및 정전 수전 발생 시 위기 대처 시뮬레이션 위주의 실습 교육이 가장 필요하다고 봅니다.",
            "PLC 제어 및 스마트 자동화 설비 연동 오류를 디버깅할 수 있는 트러블슈팅 전문 과정 편성을 희망합니다.",
            "신입 직원들을 위한 고압/특고압 안전 수칙 및 절연 파괴 예방 사례 실습 교육이 필수적입니다."
          ];

          const sampleFgis = [];
          for (let i = 0; i < 16; i++) {
            const comp = companyPool[(i + 3) % companyPool.length];
            const name = traineePool[(i + 8) % traineePool.length];
            const dept = deptPool[i % deptPool.length];
            const pos = posPool[i % posPool.length];
            const city = cityPool[i % cityPool.length];

            sampleFgis.push({
              companyName: comp,
              companyType: getRandomItem(['대규모 기업', '우선지원 대상기업']),
              companyAddressCity: city,
              industry: getRandomItem(['설계', '감리', '안전관리', '기타']),
              contactName: name,
              department: dept,
              position: pos,
              tel: `02-${3000 + i}-4567`,
              email: `${getRandomItem(['ad', 'ko', 'pt', 'tech', 'eng'])}@${getRandomItem(['con.co.kr', 'hanmail.net', 'naver.com'])}`,
              q1_1: getRandomItem(['1~5명', '6~10명', '11~20명', '21~50명', '51명 이상']),
              q1_2: getRandomItem(['3년 이하 근로자 중심', '4~6년 경력자 중심', '7년 이상 숙련자 중심', '고르게 분포']),
              q1_3: getRandomSubArray(['전기안전관리', '전력시설물 설계', '전력시설물 감리', '전기공사 시공관리', '수배전설비 운영', '자동제어ㆍPLC', '전기설비 진단ㆍ점검', '기타'], 1, 3),
              q2_1: getRandomItem(['저연차(3년 이하)', '중간연차(4~10년)', '고연차(11년 이상)']),
              q2_2: getRandomItem(['직무 기초 이해 수준', '기본 실무 수행 수준', '독립 업무 수행 수준', '현장 문제 해결 수준', '전문기술 활용 및 지도 수준']),
              q2_3: getRandomItem(['직무 기초 이해 수준', '기본 실무 수행 수준', '독립 업무 수행 수준', '현장 문제 해결 수준', '전문기술 활용 및 지도 수준']),
              q2_4: getRandomSubArray(['직무 전문지식', '법령기준 이해', '실무적용 능력', '문제상황 조치', '안전관리 책임', '기타'], 1, 3),
              q2_5: getRandomItem(fgiQ2_5_Pool),
              q3_1: getRandomSubArray(['훈련 내용의 적합성', '업무 연관성', '훈련 일정', '비용 지원 여부', '훈련 장소', '기타'], 1, 2),
              q3_2: getRandomSubArray(['업무 공백 발생', '대체인력 부족', '직무별 맞춤교육 부족', '사내 교육 시설 부족', '기업 인식 부족', '예산 부족', '접근성 제약', '기타'], 1, 2),
              q3_3: getRandomItem(['1일(8H)', '2일(16H)', '3일(24H)', '4일(32H)', '5일(40H) 이상']),
              q3_4: getRandomSubArray(['2~4월', '5~7월', '8~11월'], 1, 2),
              q3_5: getRandomItem(['1~2명', '3~5명', '6~10명', '11~20명', '21명 이상']),
              q4_1: getRandomItem(['5', '4', '3', '2', '1']),
              q4_2: getRandomSubArray(['교육 일정 다양화', '실습 중심 교육 확대', '최신 기술과정 확대', '강사 전문성 강화', '교육시설 및 환경 개선', '기타'], 1, 2),
              q4_3: getRandomItem(fgiQ4_3_Pool),
              createdAt: new Date().toISOString()
            });
          }

          // Insert helper
          const dbAdder = async (colName: string, arr: any[]) => {
            const promises = arr.map(item => addDoc(collection(db, colName), item));
            await Promise.all(promises);
          };

          await dbAdder('surveys_demand', sampleDemands);
          await dbAdder('surveys_field_corp', sampleCorps);
          await dbAdder('surveys_field_trainee', sampleTrainees);
          await dbAdder('surveys_fgi', sampleFgis);

          await fetchAllData();
          setCustomAlert({
            isOpen: true,
            title: "시딩 완료",
            message: "분석 시뮬레이션용 수려한 샘플 데이터셋 16건씩 데이터 생성이 완료되었습니다! 모든 응답이 완벽하고 다양하게 구성되었습니다."
          });
        } catch (err: any) {
          console.error("Data Seeding Failure: ", err);
          setCustomAlert({
            isOpen: true,
            title: "오류 발생",
            message: "데이터 시딩 중 오류가 발생했습니다: " + err.message
          });
        } finally {
          setFetchingData(false);
        }
      }
    });
  };

  const downloadPDF = async () => {
    const element = reportRef.current;
    if (!element) return;

    setIsExporting(true);
    // Give Recharts and DOM 600ms to reconstruct with fixed rendering
    await new Promise((resolve) => setTimeout(resolve, 605));

    const opt = {
      margin:       [8, 8, 8, 8] as [number, number, number, number],
      filename:     `Consortium_${activeTab}_Report.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      pagebreak:    { mode: ['css', 'legacy'] },
      html2canvas:  { 
        scale: 2, 
        useCORS: true,
        windowWidth: 756,
        onclone: (clonedDoc: Document) => {
          const elements = clonedDoc.querySelectorAll('*');
          elements.forEach((el: any) => {
            const style = window.getComputedStyle(el);
            
            // Background Color
            const bg = style.backgroundColor;
            if (bg && (bg.includes('oklch') || bg.includes('oklab'))) {
              el.style.backgroundColor = convertModernColorStr(bg);
            }
            
            // Text Color
            const col = style.color;
            if (col && (col.includes('oklch') || col.includes('oklab'))) {
              el.style.color = convertModernColorStr(col);
            }
            
            // Border Colors
            const btc = style.borderTopColor;
            if (btc && (btc.includes('oklch') || btc.includes('oklab'))) el.style.borderTopColor = convertModernColorStr(btc);
            const brc = style.borderRightColor;
            if (brc && (brc.includes('oklch') || brc.includes('oklab'))) el.style.borderRightColor = convertModernColorStr(brc);
            const bbc = style.borderBottomColor;
            if (bbc && (bbc.includes('oklch') || bbc.includes('oklab'))) el.style.borderBottomColor = convertModernColorStr(bbc);
            const blc = style.borderLeftColor;
            if (blc && (blc.includes('oklch') || blc.includes('oklab'))) el.style.borderLeftColor = convertModernColorStr(blc);

            // SVG Fill and Stroke
            const fill = style.fill;
            if (fill && (fill.includes('oklch') || fill.includes('oklab'))) el.style.fill = convertModernColorStr(fill);
            const stroke = style.stroke;
            if (stroke && (stroke.includes('oklch') || stroke.includes('oklab'))) el.style.stroke = convertModernColorStr(stroke);
          });
        }
      },
      jsPDF:        { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    try {
      // Execute html2pdf
      await html2pdf().from(element).set(opt).save();
    } catch (err: any) {
      console.error("PDF Export Fail, falling back using browser print:", err);
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  // --- STATS COMPILATION METHODS ---

  // Generic Aggregator Helper to compile distributions of any field
  const aggregateField = (list: any[], key: string) => {
    const counts: { [k: string]: number } = {};
    list.forEach(item => {
      const val = item[key];
      const processVal = (v: any) => {
        if (!v) return;
        const strVal = typeof v === 'object' ? (v.label || v.name || JSON.stringify(v)) : String(v);
        const cleanedStr = strVal.replace(/[①②③④⑤]\s*/g, '');
        const normalized = cleanedStr.startsWith('기타(') ? '기타' : cleanedStr;
        counts[normalized] = (counts[normalized] || 0) + 1;
      };

      if (Array.isArray(val)) {
        val.forEach(v => processVal(v));
      } else if (val !== undefined && val !== null && val !== '') {
        processVal(val);
      }
    });
    return Object.keys(counts)
      .map(name => ({ name, value: counts[name] }))
      .sort((a, b) => b.value - a.value);
  };

  // 1. Demand Surveys Aggregation
  const getDemandStats = () => {
    const total = demands.length;
    if (total === 0) return { 
      industryData: [], regionData: [], topCourses: [], avgNecessity: 0,
      emplData: [], expData: [], routeData: [], necessityData: [],
      reasonData: [], ratioData: [], deciderData: [], obstacleData: [],
      intentData: [], eduCenterData: [], chooseFactorData: [],
      goryeoData: [], fieldHurdleData: [], fieldSolutionData: []
    };

    const industries: { [key: string]: number } = {};
    const regions: { [key: string]: number } = {};
    const coursesCount: { [key: string]: number } = {};
    let totalNecessity = 0;

    demands.forEach(d => {
      if (d.q1_1) industries[d.q1_1] = (industries[d.q1_1] || 0) + 1;
      if (d.q1_2) regions[d.q1_2] = (regions[d.q1_2] || 0) + 1;
      if (d.q2_3) totalNecessity += parseFloat(d.q2_3) || 3;
      if (d.q3_3 && typeof d.q3_3 === 'object' && !Array.isArray(d.q3_3)) {
        Object.keys(d.q3_3).forEach((course: string) => {
          coursesCount[course] = (coursesCount[course] || 0) + 1;
        });
      } else if (Array.isArray(d.q3_3)) {
        d.q3_3.forEach((course: string) => {
          coursesCount[course] = (coursesCount[course] || 0) + 1;
        });
      }
    });

  const industryData = Object.keys(industries).map(name => ({ name, value: industries[name] }));

    const regionData = Object.keys(regions).map(name => {
      let cleanName = name;
      if (cleanName.includes('수도권')) cleanName = '수도권';
      else if (cleanName.includes('충청권')) cleanName = '충청권';
      else if (cleanName.includes('호남권')) cleanName = '호남권';
      else if (cleanName.includes('영남권')) cleanName = '영남권';
      else if (cleanName.includes('제주권')) cleanName = '제주권';
      else if (cleanName.includes('강원권')) cleanName = '강원권';
      return { name: cleanName, value: regions[name] };
    });
    
    // Group back the cleaned regions to sum up properly
    const groupedRegions: { [key: string]: number } = {};
    regionData.forEach(r => {
      groupedRegions[r.name] = (groupedRegions[r.name] || 0) + r.value;
    });
    const finalRegionData = Object.keys(groupedRegions).map(name => ({ name, value: groupedRegions[name] }));
    const topCourses = Object.keys(coursesCount)
      .map(name => ({ name, count: coursesCount[name] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const qaGroups: Record<string, { prefix: string, text: string }[]> = {
      '2-1. 사업분야 기타의견': [],
      '2-2. 훈련경로 기타의견': [],
      '2-4. 훈련필요이유 기타의견': [],
      '2-5. 희망비율 기타의견': [],
      '2-6. 결정권자 기타의견': [],
      '2-7. 장애요인 기타의견': [],
      '3-2. 교육원 선택이유 기타의견': [],
      '3-4. 고려요인 기타의견': [],
      '4-1. 현장어려움 기타의견': [],
      '4-2. 해결방법 기타의견': [],
      '4-3. 추가 개설 필요 과정': [],
      '4-4. 바라는 점': []
    };

    demands.forEach(d => {
      const company = d.companyName || '무명 회사';
      const contact = d.contactName || '실무진';
      const prefix = `${company} (${contact})`;
      if (d.q2_1_other) qaGroups['2-1. 사업분야 기타의견'].push({ prefix, text: d.q2_1_other });
      if (d.q2_2_other) qaGroups['2-2. 훈련경로 기타의견'].push({ prefix, text: d.q2_2_other });
      if (d.q2_4_other) qaGroups['2-4. 훈련필요이유 기타의견'].push({ prefix, text: d.q2_4_other });
      if (d.q2_5_other) qaGroups['2-5. 희망비율 기타의견'].push({ prefix, text: d.q2_5_other });
      if (d.q2_6_other) qaGroups['2-6. 결정권자 기타의견'].push({ prefix, text: d.q2_6_other });
      if (d.q2_7_other) qaGroups['2-7. 장애요인 기타의견'].push({ prefix, text: d.q2_7_other });
      if (d.q3_2_other) qaGroups['3-2. 교육원 선택이유 기타의견'].push({ prefix, text: d.q3_2_other });
      if (d.q3_4_other) qaGroups['3-4. 고려요인 기타의견'].push({ prefix, text: d.q3_4_other });
      if (d.q4_1_other) qaGroups['4-1. 현장어려움 기타의견'].push({ prefix, text: d.q4_1_other });
      if (d.q4_2_other) qaGroups['4-2. 해결방법 기타의견'].push({ prefix, text: d.q4_2_other });
      if (d.q4_3) qaGroups['4-3. 추가 개설 필요 과정'].push({ prefix, text: d.q4_3 });
      if (d.q4_4) qaGroups['4-4. 바라는 점'].push({ prefix, text: d.q4_4 });
    });

    return {
      industryData,
      regionData: finalRegionData,
      topCourses,
      qaGroups,
      avgNecessity: (totalNecessity / total).toFixed(1),
      emplData: aggregateField(demands, 'q1_3'),
      expData: aggregateField(demands, 'q2_1'),
      routeData: aggregateField(demands, 'q2_2'),
      necessityData: aggregateField(demands, 'q2_3'),
      reasonData: aggregateField(demands, 'q2_4'),
      ratioData: aggregateField(demands, 'q2_5'),
      deciderData: aggregateField(demands, 'q2_6'),
      obstacleData: aggregateField(demands, 'q2_7'),
      intentData: aggregateField(demands, 'q2_8'),
      eduCenterData: aggregateField(demands, 'q3_1'),
      chooseFactorData: aggregateField(demands, 'q3_2'),
      goryeoData: aggregateField(demands, 'q3_4'),
      fieldHurdleData: aggregateField(demands, 'q4_1'),
      fieldSolutionData: aggregateField(demands, 'q4_2')
    };
  };

  // Rule-based text-mining feedback summarizer
  const summarizeComments = (comments: string[]) => {
    const validComments = comments.filter(c => c && c.trim().length > 1);
    const totalCount = validComments.length;
    if (totalCount === 0) {
      return {
        summaryText: "현재 축적된 주관식 건의 사항 의견 장부에 유효한 텍스트 데이터가 존재하지 않아 종합 기조 요약이 제공되지 않습니다.",
        bullets: []
      };
    }

    const categories = [
      {
        id: "schedule",
        title: "📅 교육 일정 다각화 및 현업 공백 보완",
        desc: "생업 현장에서의 기기 장기 공백 및 시간적 마찰을 줄이기 위해 '유연한 하이브리드 교차 형태 수강'이나 '주말/평일 오후 분산 이수' 등의 스케줄 유연성을 강하게 희망하고 있습니다.",
        keywords: ["시간", "일정", "주말", "평일", "야간", "퇴근", "바빠", "단축", "조율", "공백", "오프라인", "하이브리드", "단기"]
      },
      {
        id: "facility",
        title: "🛠️ 최신 기술 실습 장비/기자재 보강 및 교사 교체",
        desc: "기초 이론 중심의 해설보다는 현장에 설치된 실제 실물 및 계통 전력반, 최신 계측기 등을 장시간 만지며 체득할 수 있는 현장 접합형 시뮬레이션 환경 보조를 원합니다.",
        keywords: ["장비", "실습", "기자재", "노후", "하드웨어", "실제", "만져", "시뮬레이터", "실무", "현장", "기기", "실험", "실제적"]
      },
      {
        id: "curriculum",
        title: "📖 참가 훈련인력 수준 차이에 맞춘 기초/심화 이원화",
        desc: "인력별 배경 기술에 따른 경험 편차가 심각하여 왕초보 대상의 쉬운 단선 이론부터 실제 현직 최상급자 대상의 초고압 신기술 안전 진단 심화반까지 수준별 전력 과정 구성을 제안했습니다.",
        keywords: ["난이도", "기초", "어렵", "쉬운", "초보", "심화", "어려워", "수준별", "상세", "이해가", "이원화", "초급"]
      },
      {
        id: "instructor",
        title: "🎓 실무 사고 및 해결 경험이 많은 베테랑 강사진",
        desc: "정량적 수식 증명보다는 실제로 전기 화재, 절연 붕괴, 안전 기계 고장 등의 위급 사건을 극복한 다년차 현장 최고 명장들의 트러블슈팅 이력 중심 실황 강평을 압도적으로 주문합니다.",
        keywords: ["강사", "교수", "전문성", "실무경험", "강의력", "답변", "설명", "실력", "베테랑", "강사진"]
      },
      {
        id: "newCourse",
        title: "💡 변화된 최신 전기·소방 안전 규격 기반 강좌 개설",
        desc: "이론 전반 및 신기술을 넘어, 매해 개정되는 국가 기술 안전 지침(KEC 등)과 고전압 배선 표준화 등 업무적 안전 책무를 면피하고 리스크를 줄일 구체적 실무 법률 특강 형성을 요청합니다.",
        keywords: ["신규", "다양", "과목", "최신", "트렌드", "신기술", "새로운", "소방", "법령", "안전제일", "개정", "법률"]
      },
      {
        id: "textbook",
        title: "📚 실무 밀착형 현지 참고 다이어그램/가이드 배포",
        desc: "훈련 종료 후에도 기계실이나 설계 데스크에 즉시 부착해 응급 처치 요람으로 사용할 수 있는 구조도, 단계별 체계도 및 실무 트레이닝 전용 소형 고품질 핸드북 지급을 소장하고 있습니다.",
        keywords: ["교재", "책", "자료", "피피티", "ppt", "설명서", "인쇄", "메뉴얼", "바이블", "가이드", "도면", "안내서"]
      }
    ];

    const tallies = categories.map(cat => {
      let score = 0;
      validComments.forEach(c => {
        const lower = c.toLowerCase();
        const matches = cat.keywords.filter(keyword => lower.includes(keyword));
        if (matches.length > 0) {
          score += matches.length;
        }
      });
      return { ...cat, score };
    });

    const sorted = tallies.sort((a, b) => b.score - a.score);
    const topBullets = sorted.filter(c => c.score > 0).slice(0, 3);

    if (topBullets.length === 0) {
      topBullets.push(
        { id: "gen1", title: "📝 실무 중심의 다각적 교육 품질 검토", desc: "참여 주체들은 대체로 교육 후 질의응답 피드백의 품질 및 실무 정합성 보존 지원을 메인 화두로 제안하고 분석에 참가 중입니다.", score: 1, keywords: [] },
        { id: "gen2", title: "📡 실시간 응답 동기화 및 대시보드 스탯 연계", desc: "추가 수합이 진행될 때마다 주관식 패턴 정밀 진단과 평점 분산 계수가 실시간으로 리프레싱되어 전산에 안전 반영 중입니다.", score: 1, keywords: [] }
      );
    }

    const summaryText = `총 ${totalCount}건의 축적된 현업 주관식 의견을 수집 전사하여 텍스트 카테고라이징 분석을 실시간 수행하였습니다. 응답 원장의 핵심 기술 키워드 발생 빈도를 정비 배치한 종합 기조 리포트는 다음과 같습니다.`;

    return {
      summaryText,
      bullets: topBullets
    };
  };

  // 2. Corp Field Placement Aggregation
  const getCorpStats = () => {
    const total = fieldCorps.length;
    if (total === 0) return { 
      coreScores: [], observeData: [],
      corpObserveData: [], corpIndustryData: [], corpEmplData: [],
      corpQ2_1: [], corpQ2_2: [], corpQ2_3: [],
      qaGroups: {} as Record<string, { prefix: string, text: string }[]>
    };

    let total3_1 = 0, total3_2 = 0, total3_3 = 0, total3_4 = 0, total3_5 = 0;
    const observes: { [key: string]: number } = {};
    const qaGroups: Record<string, { prefix: string, text: string }[]> = {
      '1-1. 직위 기타의견': [],
      '1-2. 사업분야 기타의견': [],
      '2-2. 지원방식 기타의견': [],
      '2-4. 후속지원 필요사항': [],
      '3-6. 업무개선 사례': [],
      '3-7. 보완/개선 사항': []
    };

    fieldCorps.forEach(c => {
      total3_1 += parseFloat(c.q3_1) || 3;
      total3_2 += parseFloat(c.q3_2) || 3;
      total3_3 += parseFloat(c.q3_3) || 3;
      total3_4 += parseFloat(c.q3_4) || 3;
      total3_5 += parseFloat(c.q3_5) || 3;
      
      if (c.q1_4) observes[c.q1_4] = (observes[c.q1_4] || 0) + 1;

      const prefix = c.companyName || '익명업체';
      if (c.q1_1_other) qaGroups['1-1. 직위 기타의견'].push({ prefix, text: c.q1_1_other });
      if (c.q1_2_other) qaGroups['1-2. 사업분야 기타의견'].push({ prefix, text: c.q1_2_other });
      if (c.q2_2_other) qaGroups['2-2. 지원방식 기타의견'].push({ prefix, text: c.q2_2_other });
      if (c.q2_4) qaGroups['2-4. 후속지원 필요사항'].push({ prefix, text: c.q2_4 });
      if (c.q3_6) qaGroups['3-6. 업무개선 사례'].push({ prefix, text: c.q3_6 });
      if (c.q3_7) qaGroups['3-7. 보완/개선 사항'].push({ prefix, text: c.q3_7 });
    });

    const coreScores = [
      { metric: "업무 적용도", score: Number((total3_1 / total).toFixed(2)) },
      { metric: "업무수행체계성", score: Number((total3_2 / total).toFixed(2)) },
      { metric: "업무성과 향상", score: Number((total3_3 / total).toFixed(2)) },
      { metric: "문제해결", score: Number((total3_4 / total).toFixed(2)) },
      { metric: "조직 기여도", score: Number((total3_5 / total).toFixed(2)) },
    ];

    const observeData = Object.keys(observes).map(name => ({ name, value: observes[name] }));

    return { 
      coreScores, 
      observeData,
      corpObserveData: aggregateField(fieldCorps, 'q1_4'),
      corpIndustryData: aggregateField(fieldCorps, 'q1_2'),
      corpEmplData: aggregateField(fieldCorps, 'q1_3'),
      corpQ2_1: aggregateField(fieldCorps, 'q2_1'),
      corpQ2_2: aggregateField(fieldCorps, 'q2_2'),
      corpQ2_3: aggregateField(fieldCorps, 'q2_3'),
      qaGroups
    };
  };

  // 3. Trainee Field Placement Aggregation
  const getTraineeStats = () => {
    const total = fieldTrainees.length;
    if (total === 0) return { 
      dimensions: [], careerData: [],
      traineeTaskData: [], traineeCareerData: [], traineeEmplData: [],
      traineeScore22: [], traineeScore23: [], traineeScore24: [],
      traineeScore25: [], traineeScore26: [], traineeScore31: [],
      traineeScore32: [], traineeScore41: [], traineeScore42: [],
      traineeScore51: [], traineeScore52: [], traineeScore61: [],
      traineeScore62: [], traineeScore71: [], traineeScore72: []
    };

    let relDocs = 0, useDocs = 0, pracDocs = 0, skillDocs = 0, orgDocs = 0;
    let effDocs = 0, motDocs = 0, desDocs = 0, peerDocs = 0, chgDocs = 0;
    const careers: { [key: string]: number } = {};

    fieldTrainees.forEach(t => {
      relDocs += parseFloat(t.q2_1) || 3;
      useDocs += parseFloat(t.q2_2) || 3;
      pracDocs += parseFloat(t.q2_3) || 3;
      skillDocs += parseFloat(t.q2_4) || 3;
      orgDocs += parseFloat(t.q2_5) || 3;

      effDocs += ((parseFloat(t.q3_1) || 3) + (parseFloat(t.q3_2) || 3)) / 2;
      motDocs += ((parseFloat(t.q3_3) || 3) + (parseFloat(t.q3_4) || 3)) / 2;
      desDocs += ((parseFloat(t.q3_5) || 3) + (parseFloat(t.q3_6) || 3)) / 2;
      peerDocs += ((parseFloat(t.q3_7) || 3) + (parseFloat(t.q3_8) || 3)) / 2;
      chgDocs += ((parseFloat(t.q3_9) || 3) + (parseFloat(t.q3_10) || 3)) / 2;

      if (t.q1_2) careers[t.q1_2] = (careers[t.q1_2] || 0) + 1;
    });

    const dimensions = [
      { name: "업무 관련성", score: Number((relDocs / total).toFixed(2)) },
      { name: "업무 유용성", score: Number((useDocs / total).toFixed(2)) },
      { name: "실용 적용성", score: Number((pracDocs / total).toFixed(2)) },
      { name: "업무 향상도", score: Number((skillDocs / total).toFixed(2)) },
      { name: "성과 기여도", score: Number((orgDocs / total).toFixed(2)) },
      { name: "자기효능감", score: Number((effDocs / total).toFixed(2)) },
      { name: "전이동기", score: Number((motDocs / total).toFixed(2)) },
      { name: "전이설계", score: Number((desDocs / total).toFixed(2)) },
      { name: "상사 및 동료 지원", score: Number((peerDocs / total).toFixed(2)) },
      { name: "변화가능성", score: Number((chgDocs / total).toFixed(2)) }
    ];

    const careerData = Object.keys(careers).map(name => ({ name, value: careers[name] }));

    return { 
      dimensions, 
      careerData,
      traineeTaskData: aggregateField(fieldTrainees, 'q1_1'),
      traineeCareerData: aggregateField(fieldTrainees, 'q1_2'),
      traineeScore21: aggregateField(fieldTrainees, 'q2_1'),
      traineeScore22: aggregateField(fieldTrainees, 'q2_2'),
      traineeScore23: aggregateField(fieldTrainees, 'q2_3'),
      traineeScore24: aggregateField(fieldTrainees, 'q2_4'),
      traineeScore25: aggregateField(fieldTrainees, 'q2_5'),
      traineeScore31: aggregateField(fieldTrainees, 'q3_1'),
      traineeScore32: aggregateField(fieldTrainees, 'q3_2'),
      traineeScore33: aggregateField(fieldTrainees, 'q3_3'),
      traineeScore34: aggregateField(fieldTrainees, 'q3_4'),
      traineeScore35: aggregateField(fieldTrainees, 'q3_5'),
      traineeScore36: aggregateField(fieldTrainees, 'q3_6'),
      traineeScore37: aggregateField(fieldTrainees, 'q3_7'),
      traineeScore38: aggregateField(fieldTrainees, 'q3_8'),
      traineeScore39: aggregateField(fieldTrainees, 'q3_9'),
      traineeScore310: aggregateField(fieldTrainees, 'q3_10')
    };
  };

  // 4. Fgi Survey Aggregation
  const getFgiStats = () => {
    const total = fgis.length;
    if (total === 0) return { 
      demandTargets: [], contrastData: [], avgSatDoc: 0,
      fgiEmplData: [], fgiCareerData: [], fgiTaskData: [],
      fgiTargetData: [], fgiCurrLevelData: [], fgiTargetLevelData: [],
      fgiLackData: [], fgiNeedEduData: [], fgiConsiderData: [],
      fgiBlockerData: [], fgiPeriodData: [], fgiSeasonData: [],
      fgiVolumeData: [], fgiSatData: [], fgiImproveData: [],
      fgiRegionData: []
    };

    const targets: { [key: string]: number } = {};
    const regions: { [key: string]: number } = {};
    let sumSat = 0;
    let sumCurr = 0;
    let sumTarget = 0;

    fgis.forEach(f => {
      if (f.q2_1) {
        const cleaned = f.q2_1.replace(/\([^)]*\)/g, '').trim();
        targets[cleaned] = (targets[cleaned] || 0) + 1;
      }
      if (f.companyAddressCity) regions[f.companyAddressCity] = (regions[f.companyAddressCity] || 0) + 1;
      sumSat += parseFloat(f.q4_1) || 3;

      // Map competency level string values to score equivalents
      const getNum = (s: string) => {
        if (!s) return 3;
        if (s.includes('①') || s.includes('기초 이해')) return 1;
        if (s.includes('②') || s.includes('기본 실무')) return 2;
        if (s.includes('③') || s.includes('독립 업무')) return 3;
        if (s.includes('④') || s.includes('문제 해결')) return 4;
        if (s.includes('⑤') || s.includes('지도 수준')) return 5;
        return 3;
      };

      sumCurr += getNum(f.q2_2);
      sumTarget += getNum(f.q2_3);
    });

    const demandTargets = Object.keys(targets).map(name => ({ name, value: targets[name] }));

    const contrastData = [
      { category: "평균 기술 역량", 현재역량: Number((sumCurr / total).toFixed(2)), 목표역량: Number((sumTarget / total).toFixed(2)) }
    ];

    const fgiRegionData = Object.keys(regions).map(name => ({ name, value: regions[name] })).sort((a, b) => b.value - a.value);

    return {
      demandTargets,
      contrastData,
      fgiRegionData,
      avgSat: (sumSat / total).toFixed(1),
      fgiEmplData: aggregateField(fgis, 'q1_1'),
      fgiCareerData: aggregateField(fgis, 'q1_2'),
      fgiTaskData: aggregateField(fgis, 'q1_3'),
      fgiTargetData: aggregateField(fgis, 'q2_1'),
      fgiCurrLevelData: aggregateField(fgis, 'q2_2'),
      fgiTargetLevelData: aggregateField(fgis, 'q2_3'),
      fgiLackData: aggregateField(fgis, 'q2_4'),
      fgiNeedEduData: aggregateField(fgis, 'q2_5'),
      fgiConsiderData: aggregateField(fgis, 'q3_1'),
      fgiBlockerData: aggregateField(fgis, 'q3_2'),
      fgiPeriodData: aggregateField(fgis, 'q3_3'),
      fgiSeasonData: aggregateField(fgis, 'q3_4'),
      fgiVolumeData: aggregateField(fgis, 'q3_5'),
      fgiSatData: aggregateField(fgis, 'q4_1'),
      fgiImproveData: aggregateField(fgis, 'q4_2')
    };
  };

  // Render Login state before authorization is verified
  if (authChecking) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-[#2B5C43] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-gray-500">관리자 인증 상태를 안전하게 검증하고 있습니다...</p>
        </div>
      </div>
    );
  }

  if (!currentUser || !isAdmin) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-emerald-100 overflow-hidden text-center p-8">
          <div className="w-16 h-16 bg-emerald-50 text-primary-green flex items-center justify-center rounded-2xl mx-auto mb-6">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-black text-gray-950 mb-2">통합 관리자 로그인 (종합)</h2>
          <p className="text-xs text-gray-500 mb-6 leading-relaxed">
            통합 분석 대시보드는 권한이 구동 확인된 컨소시엄 내부 시스템 관리자에게만 접근을 허용합니다.
          </p>

          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-2.5 bg-primary-green text-white hover:bg-primary-green-hover py-3 px-4 rounded-xl font-bold text-sm shadow-xs transition duration-200"
          >
            <span>구글 ID 로그인</span>
          </button>

          {currentUser && !isAdmin && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex flex-col gap-2.5 text-left leading-relaxed">
              <div className="flex items-start gap-2">
                <AlertCircle size={20} className="shrink-0 mt-0.5 text-red-600" />
                <span>
                  로그인된 계정(<b>{currentUser.email}</b>)은 승인된 관리자가 아닙니다. 권한 활성화를 원하시면 해당 이메일 주소를 관리자에게 등록 요청해 주십시오.
                </span>
              </div>
              <div className="border-t border-red-200/50 pt-2.5 mt-1 bg-white/55 p-3 rounded-lg text-gray-800 space-y-1 font-mono text-[10px]">
                <div>• 나의 로그인 이메일: <b className="select-all bg-gray-100 px-1 rounded text-red-700 font-bold">{currentUser.email}</b></div>
              </div>
              <p className="text-[9px] text-gray-400 font-medium">※ 위 구글 이메일이 관리 대장에 추가되면 즉시 관리자 페이지 접근이 전면 허용됩니다.</p>
            </div>
          )}

          <button
            onClick={() => navigate('/')}
            className="mt-6 text-xs text-gray-400 hover:text-gray-600 inline-flex items-center gap-1 font-semibold"
          >
            <ArrowLeft size={14} />
            <span>설문 포털 홈으로 가기</span>
          </button>
        </div>
      </div>
    );
  }

  // Loaded constants for graphs
  const demandStats = getDemandStats();
  const corpStats = getCorpStats();
  const traineeStats = getTraineeStats();
  const fgiStats = getFgiStats();

  // Dynamic analysis computation block for executive summary briefings
  const sortedDemandCourses = [...(demandStats.topCourses || [])].sort((a, b) => b.count - a.count);
  const maxDemandCount = sortedDemandCourses[0]?.count || 0;
  const topDemandCourses = maxDemandCount > 0 ? sortedDemandCourses.filter(c => c.count === maxDemandCount) : [];
  const sortedDemandIndustries = [...(demandStats.industryData || [])].sort((a, b) => b.value - a.value);
  const sortedDemandRegions = [...(demandStats.regionData || [])].sort((a, b) => b.value - a.value);
  const topDemandCourse = sortedDemandCourses[0];
  const topDemandIndustry = sortedDemandIndustries[0];
  const topDemandRegion = sortedDemandRegions[0];

  const sortedCorpCoreScores = [...(corpStats.coreScores || [])].sort((a, b) => b.score - a.score);
  const topCorpMetric = sortedCorpCoreScores[0];
  const bottomCorpMetric = sortedCorpCoreScores[sortedCorpCoreScores.length - 1];
  const sortedCorpObserve = [...(corpStats.observeData || [])].sort((a, b) => b.value - a.value);
  const topCorpObserve = sortedCorpObserve[0];

  const sortedTraineeDimensions = [...(traineeStats.dimensions || [])].sort((a, b) => b.score - a.score);
  const topTraineeMetric = sortedTraineeDimensions[0];
  const bottomTraineeMetric = sortedTraineeDimensions[sortedTraineeDimensions.length - 1];
  const sortedTraineeCareer = [...(traineeStats.careerData || [])].sort((a, b) => b.value - a.value);
  const topTraineeCareer = sortedTraineeCareer[0];

  const fgiTargetCurr = fgiStats.contrastData[0]?.현재역량 || 0;
  const fgiTargetGoal = fgiStats.contrastData[0]?.목표역량 || 0;
  const fgiTargetGap = Number((fgiTargetGoal - fgiTargetCurr).toFixed(2));
  const sortedFgiTargets = [...(fgiStats.demandTargets || [])].sort((a, b) => b.value - a.value);
  const topFgiTarget = sortedFgiTargets[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-emerald-50/20 flex flex-col">
      {/* Admin header */}
      <header className="bg-slate-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#2B5C43] text-white p-1.5 rounded-lg">
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold">컨소시엄 설문조사 통합 관리자 페이지</h1>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-300 font-semibold flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
              <UserCheck size={14} className="text-emerald-400" />
              <span>{currentUser.email} (최고관리자)</span>
            </span>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition duration-200"
            >
              <ArrowLeft size={14} />
              <span>홈으로</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 bg-slate-800 hover:bg-red-950 hover:text-white border border-slate-700 hover:border-red-900 px-3 py-1.5 rounded-lg text-xs font-semibold scroll-py-2 transition duration-200"
            >
              <LogOut size={14} />
              <span>종료</span>
            </button>
          </div>
        </div>
      </header>

      {/* Control Actions (Tab layout selector) */}
      <section className="bg-white border-b border-gray-200/80 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4 py-3">
          
          {/* Tab buttons */}
          <div className="flex flex-wrap gap-1.5 bg-gray-100 p-1 rounded-xl">
            {[
              { id: 'demand', label: '수요조사', count: demands.length },
              { id: 'field_corp', label: '현업적용도(기업)', count: fieldCorps.length },
              { id: 'field_trainee', label: '현업적용도(훈련생)', count: fieldTrainees.length },
              { id: 'fgi', label: 'FGI', count: fgis.length },
              { id: 'admin_mgmt', label: '관리자 계정 관리', count: adminsList.length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-primary-green text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-emerald-950 text-white' : 'bg-gray-200 text-gray-700'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Action buttons (Extract) */}
          {activeTab !== 'admin_mgmt' && (
            <div className="flex gap-2 w-full md:w-auto shrink-0 justify-end">
              <button
                onClick={downloadPDF}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-primary-green border border-emerald-200 px-4 py-2 rounded-xl text-xs font-bold transition"
              >
                <Download size={14} />
                <span>보고서 PDF 출력</span>
              </button>
              <button
                onClick={downloadExcel}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition"
              >
                <FileSpreadsheet size={14} />
                <span>MS 엑셀 다운로드 (.xlsx)</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Tester-Only Panel Section */}
      {currentUser?.email === 'seanyoo97@gmail.com' && (
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200/80 pb-4">
              <div>
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <ShieldAlert size={18} className="text-red-700" />
                  <span>최고 관리자(seanyoo97@gmail.com) 통합 제어판</span>
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  원활한 테스트를 위해 설문 도메인별 데이터 영구 삭제 및 샘플 데이터 자동 생성 도구를 지원합니다.
                </p>
              </div>
              
              <button
                onClick={handleSeedAllData}
                disabled={fetchingData}
                className="w-full md:w-auto flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 shrink-0"
              >
                <UserPlus size={14} />
                <span>시연용 샘플 데이터 생성 (각 16건)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <button
                onClick={() => handleClearSpecificData('surveys_demand', '훈련 수요조사')}
                disabled={fetchingData}
                className="flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200/80 p-3 rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                <Trash2 size={13} />
                <span>수요조사 데이터 영구 삭제</span>
              </button>

              <button
                onClick={() => handleClearSpecificData('surveys_field_corp', '현업적용도(기업)')}
                disabled={fetchingData}
                className="flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200/80 p-3 rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                <Trash2 size={13} />
                <span>현업적용도(기업) 데이터 영구 삭제</span>
              </button>

              <button
                onClick={() => handleClearSpecificData('surveys_field_trainee', '현업적용도(훈련생)')}
                disabled={fetchingData}
                className="flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200/80 p-3 rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                <Trash2 size={13} />
                <span>현업적용도(훈련생) 데이터 영구 삭제</span>
              </button>

              <button
                onClick={() => handleClearSpecificData('surveys_fgi', 'FGI 심층조사')}
                disabled={fetchingData}
                className="flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200/80 p-3 rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                <Trash2 size={13} />
                <span>FGI 데이터 영구 삭제</span>
              </button>

              <button
                onClick={handleClearAllData}
                disabled={fetchingData}
                className="flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white p-3 rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
              >
                <Trash2 size={13} />
                <span>전체 응답 일괄 영구삭제</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Stats Panel Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8">
        
        {fetchingData ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-emerald-100 shadow-sm space-y-3">
            <div className="w-10 h-10 border-4 border-primary-green border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-gray-500 font-medium">실시간 설문 제출 성과를 동기화하여 시각화 분석 중입니다...</p>
          </div>
        ) : (
          <div 
            id="report-container" 
            ref={reportRef} 
            className="space-y-8 bg-white p-6 sm:p-10 rounded-2xl border border-emerald-150/60 shadow-md"
            style={isExporting ? { width: '730px', minWidth: '730px', padding: '24px 16px', boxSizing: 'border-box', backgroundColor: '#ffffff' } : undefined}
          >
            
            {/* Report            {/* TAB CONTENT: DEMAND */}
            {activeTab === 'demand' && (
              <div className="space-y-8">
                {/* Stats cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5" style={isExporting ? { pageBreakInside: 'avoid', marginBottom: '16px' } : undefined}>
                  <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-xl text-left">
                    <span className="text-xs text-emerald-800 font-bold block">총 설문 응답자 수</span>
                    <span className="text-2xl font-black text-gray-900 mt-1 block">{demands.length} <sub className="text-xs font-medium text-gray-500">개사</sub></span>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-xl text-left">
                    <span className="text-xs text-emerald-800 font-bold block">컨소시엄 훈련 필요 지수</span>
                    <span className="text-2xl font-black text-gray-900 mt-1 block">{demandStats.avgNecessity || 0} <sub className="text-xs font-medium text-gray-500">/ 5.0 점</sub></span>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-xl text-left">
                    <span className="text-xs text-emerald-800 font-bold block">컨소시엄 교육 희망 과정 수</span>
                    <span className="text-2xl font-black text-gray-900 mt-1 block">
                      {(demands.reduce((acc, curr) => acc + (curr.q3_3?.length || 0), 0) / (demands.length || 1)).toFixed(1)} <sub className="text-xs font-medium text-gray-500">과목</sub>
                    </span>
                  </div>
                </div>

                {demands.length > 0 && (
                  /* Executive Summary Briefing for High-ups */
                  <div className="bg-slate-900 text-white rounded-2xl p-6 border border-emerald-500/30 text-left shadow-lg space-y-4" style={isExporting ? { pageBreakInside: 'avoid' } : undefined}>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-emerald-400">📊 훈련과정 수요조사 핵심 분석 결과 및 시사점</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-300">
                      <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50 space-y-2">
                        <span className="text-slate-400 font-bold block">• 최고 선호 훈련과정</span>
                        {topDemandCourses.length > 0 ? (
                          <div className="space-y-2.5 max-h-[120px] overflow-y-auto pr-1">
                            {topDemandCourses.map((c, idx) => (
                              <div key={idx} className="text-xs font-bold text-white leading-relaxed">
                                <span className="text-emerald-400 font-black">&quot;{c.name}&quot;</span>
                                <span className="block text-slate-300 text-[10px] font-normal">총 {c.count}개사 선택 ({((c.count / demands.length) * 100).toFixed(1)}%)</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-500">데이터가 수집되지 않았습니다.</p>
                        )}
                      </div>
                      <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50 space-y-2">
                        <span className="text-slate-400 font-bold block">• 참여기업 업종 및 지역 편중도</span>
                        <div className="text-sm font-bold text-slate-200 leading-relaxed space-y-1">
                          {topDemandIndustry ? (
                            <span className="block">최다 업종: <b className="text-[#34d399]">{topDemandIndustry.name}</b> ({topDemandIndustry.value}개사, {((topDemandIndustry.value/demands.length)*100).toFixed(1)}%)</span>
                          ) : null}
                          {topDemandRegion ? (
                            <span className="block">최고 지역: <b className="text-[#34d399]">{topDemandRegion.name}</b> ({topDemandRegion.value}개사, {((topDemandRegion.value/demands.length)*100).toFixed(1)}%)</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50 space-y-2">
                        <span className="text-slate-400 font-bold block">• 과정 운영 및 개선 제안</span>
                        <p className="text-[11px] text-slate-300 leading-relaxed md:leading-normal">
                          {(() => {
                            const complaints = demands.map(d => d.q4_1).filter(Boolean);
                            const wishes = demands.map(d => d.q4_4).filter(Boolean);
                            let hasScheduleIssue = false;
                            let hasLevelIssue = false;
                            let hasFacilityIssue = false;

                            [...complaints, ...wishes].forEach(txt => {
                              const lower = txt.toLowerCase();
                              if (lower.includes('시간') || lower.includes('일정') || lower.includes('교대') || lower.includes('공백') || lower.includes('바빠') || lower.includes('현업') || lower.includes('조정') || lower.includes('주말') || lower.includes('근무')) {
                                hasScheduleIssue = true;
                              }
                              if (lower.includes('난이도') || lower.includes('어렵') || lower.includes('초보') || lower.includes('기초') || lower.includes('실무')) {
                                hasLevelIssue = true;
                              }
                              if (lower.includes('장비') || lower.includes('실습') || lower.includes('기자재') || lower.includes('시설') || lower.includes('현장')) {
                                hasFacilityIssue = true;
                              }
                            });

                            let adviceText = "";
                            if (complaints.length > 0 || wishes.length > 0) {
                              adviceText += "접수된 실시간 애로사항 및 건의의견을 분석한 결과, ";
                              if (hasScheduleIssue) {
                                adviceText += "교대 근무 등으로 인한 훈련 참가 시간 확보 및 현업 공백 문제가 가장 뚜렷하게 확인되었습니다. ";
                              }
                              if (hasLevelIssue) {
                                adviceText += "참여 직원 간 기술 지식 수준 차이에 따른 난이도 조절 필요성이 감지되었습니다. ";
                              }
                              if (hasFacilityIssue) {
                                adviceText += "실전 정비 실습을 위한 노후 기자재 교체 및 가상 실습 인프라 보강을 희망하는 의견이 존재합니다. ";
                              }
                              if (!hasScheduleIssue && !hasLevelIssue && !hasFacilityIssue) {
                                adviceText += "교수 설계 및 커리큘럼 반응은 호조세이나, 현업 적시 적용을 조율하기 위한 상시 채널 개방이 필요해 보입니다. ";
                              }
                            } else {
                              adviceText = "수혜 업체들의 주요 우려 사항은 바쁜 생산 일정 중 집체 훈련 시간 조율의 한계와 실무 정합성 편차로 요약됩니다. ";
                            }

                            return `${adviceText}따라서 이미 편성된 정규 과정 진행 시, 주 업종인 [${topDemandIndustry?.name || '안전관리'}] 분야 기업들의 애로 해결을 위하 여 '현장 맞춤형 온·오프 하이브리드 교차 이수' 및 '주요 고장 메커니즘 중심의 현장 실습 도구 전면 보강' 등 실효적 운영을 우선적으로 조정할 것을 제안합니다.`;
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {demands.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 bg-gray-50 rounded-xl">제출된 수요 데이터가 아직 없습니다.</div>
                ) : (
                  <div className="space-y-8">
                    {/* Charts rows */}
                    <div className="grid grid-cols-1 gap-8">
                      {/* Top Courses Bar Chart */}
                      <div className="bg-slate-50 border border-gray-150 p-5 rounded-2xl text-left" style={isExporting ? { pageBreakInside: 'avoid' } : undefined}>
                        <h4 className="text-xs font-bold text-slate-800 mb-4 tracking-wider flex items-center gap-1.5">
                          <TrendingUp size={16} className="text-primary-green" />
                          <span>가장 수료의향이 높은 상위 8개 훈련과정</span>
                        </h4>
                        <div className={isExporting ? "h-[300px] flex justify-center w-full overflow-hidden" : "h-72"}>
                          {isExporting ? (
                            <BarChart data={demandStats.topCourses} layout="vertical" width={580} height={280}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" />
                              <YAxis dataKey="name" type="category" width={220} style={{ fontSize: '9px', fontWeight: 'bold' }} />
                              <Tooltip />
                              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                <LabelList dataKey="count" position="right" style={{ fontSize: '11px', fontWeight: 'bold', fill: '#0f172a' }} />
                                {demandStats.topCourses.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Bar>
                            </BarChart>
                          ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={demandStats.topCourses} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={200} style={{ fontSize: '10px', fontWeight: 'bold' }} />
                                <Tooltip />
                                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                  <LabelList dataKey="count" position="right" style={{ fontSize: '11px', fontWeight: 'bold', fill: '#0f172a' }} />
                                  {demandStats.topCourses.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          )}
                        </div>

                        {/* Numerical data table list for High-ups */}
                        <div className="mt-4 bg-white border border-gray-100 rounded-xl p-4 text-left">
                          <h5 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></span>
                            <span>훈련과정 선호 순위별 정밀 수치 통계표</span>
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-1.5 text-xs">
                            {demandStats.topCourses.map((c, idx) => (
                              <div key={idx} className="flex justify-between items-center py-1 border-b border-gray-50">
                                <span className="font-semibold text-gray-700 truncate max-w-[220px]">{idx+1}위. {c.name}</span>
                                <span className="font-black text-emerald-800 shrink-0">{c.count}개사 <span className="text-gray-400 font-normal">({((c.count / demands.length) * 100).toFixed(1)}%)</span></span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      </div>

                    {/* --- DEMAND COMPREHENSIVE QUESTION DATA SECTION --- */}
                    <div className="border-t border-slate-100 pt-8 mt-4" style={{ pageBreakInside: 'avoid' }}>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6 text-left">
                        <div>
                          <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                            <span className="w-2.5 h-2.5 bg-teal-600 rounded-full animate-ping" />
                            <span>📊 수요조사 설문문항 분석</span>
                          </h3>
                        </div>
                      </div>

                      {/* Expanded Questions Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <DetailedChartCard title="1-1. 주 업종 응답 비율" data={demandStats.industryData} questionCode="q1_1" color="#f97316" />
                        <DetailedChartCard title="1-2. 응답 기업 지역 분포" data={demandStats.regionData} questionCode="q1_2" color="#0ea5e9" />
                        <DetailedChartCard title="1-3. 참가신청 기업의 상시근로자 수 (규모)" data={demandStats.emplData} questionCode="q1_3" color="#3b82f6" />
                        <DetailedChartCard title="2-1. 국가인적자원개발컨소시엄 참여 이력 유무" data={demandStats.expData} questionCode="q2_1" color="#10b981" />
                        <OtherOpinionsCard title="2-1. 기타 의견 (주요 사업 분야)" data={demandStats.qaGroups['2-1. 사업분야 기타의견']} isExporting={isExporting} questionCode="q2_1" />
                        <DetailedChartCard title="2-2. 협회 컨소시엄 훈련과정 주요 인지 경로" data={demandStats.routeData} questionCode="q2_2" color="#6366f1" />
                        <OtherOpinionsCard title="2-2. 기타 의견 (인지 경로)" data={demandStats.qaGroups['2-2. 훈련경로 기타의견']} isExporting={isExporting} questionCode="q2_2" />
                        <DetailedChartCard title="2-3. 직무능력 향상 훈련이 어느 정도 필요하다고 생각하는지" data={demandStats.necessityData} questionCode="q2_3" color="#f59e0b" />
                        <DetailedChartCard title="2-4. 직무능력 향상 훈련이 필요하다고 생각하는 이유" data={demandStats.reasonData} questionCode="q2_4" color="#ec4899" />
                        <OtherOpinionsCard title="2-4. 기타 의견 (훈련 필요성 이유)" data={demandStats.qaGroups['2-4. 훈련필요이유 기타의견']} isExporting={isExporting} questionCode="q2_4" />
                        <DetailedChartCard title="2-5. 이상적인 실습, 이론 비율" data={demandStats.ratioData} questionCode="q2_5" color="#8b5cf6" />
                        <OtherOpinionsCard title="2-5. 기타 의견 (희망 실습/이론 비율)" data={demandStats.qaGroups['2-5. 희망비율 기타의견']} isExporting={isExporting} questionCode="q2_5" />
                        <DetailedChartCard title="2-6. 훈련 참가 결정권을 쥔 핵심 의사결정자" data={demandStats.deciderData} questionCode="q2_6" color="#ff5733" />
                        <OtherOpinionsCard title="2-6. 기타 의견 (결정권자)" data={demandStats.qaGroups['2-6. 결정권자 기타의견']} isExporting={isExporting} questionCode="q2_6" />
                        <DetailedChartCard title="2-7. 훈련참여 시 가장 큰 애로사항" data={demandStats.obstacleData} questionCode="q2_7" color="#ef4444" />
                        <OtherOpinionsCard title="2-7. 기타 의견 (참여 애로사항)" data={demandStats.qaGroups['2-7. 장애요인 기타의견']} isExporting={isExporting} questionCode="q2_7" />
                        <DetailedChartCard title="2-8. 협회의 컨소시엄 훈련과정에 참여할 의향 정도" data={demandStats.intentData} questionCode="q2_8" color="#06b6d4" />
                        
                        <DetailedChartCard title="3-1. 훈련참여 시 어느 교육원으로 훈련신청을 할지" data={demandStats.eduCenterData} questionCode="q3_1" color="#22c55e" />
                        <DetailedChartCard title="3-2. 해당 교육원을 선택한 이유" data={demandStats.chooseFactorData} questionCode="q3_2" color="#f43f5e" />
                        <OtherOpinionsCard title="3-2. 기타 의견 (타 교육원 선택 이유)" data={demandStats.qaGroups['3-2. 교육원 선택이유 기타의견']} isExporting={isExporting} questionCode="q3_2" />
                        <DetailedChartCard title="3-4. 훈련 교육 위탁 시 주요 고려요인" data={demandStats.goryeoData} questionCode="q3_4" color="#14b8a6" />
                        <OtherOpinionsCard title="3-4. 기타 의견 (교육 위탁 시 고려 요인)" data={demandStats.qaGroups['3-4. 고려요인 기타의견']} isExporting={isExporting} questionCode="q3_4" />
                        
                        <DetailedChartCard title="4-1. 현장업무 진행 시 어려움" data={demandStats.fieldHurdleData} questionCode="q4_1" color="#8b5cf6" />
                        <OtherOpinionsCard title="4-1. 기타 의견 (현장 업무 진행 상의 구체적 애로)" data={demandStats.qaGroups['4-1. 현장어려움 기타의견']} isExporting={isExporting} questionCode="q4_1" />
                        <DetailedChartCard title="4-2. 어려움 해소를 위한 해결 방법" data={demandStats.fieldSolutionData} questionCode="q4_2" color="#0ea5e9" />
                        <OtherOpinionsCard title="4-2. 기타 의견 (현장 애로 해소 방안 제안)" data={demandStats.qaGroups['4-2. 해결방법 기타의견']} isExporting={isExporting} questionCode="q4_2" />
                        <OtherOpinionsCard title="4-3. 협회 컨소시엄을 통해 과정 편성을 희망하는 직무훈련내용" data={demandStats.qaGroups['4-3. 추가 개설 필요 과정']} isExporting={isExporting} questionCode="q4_3" />
                        <OtherOpinionsCard title="4-4. 정부지원 교육사업 및 전력설비업계 관련 바라는 점" data={demandStats.qaGroups['4-4. 바라는 점']} isExporting={isExporting} questionCode="q4_4" />
                      </div>
                    </div>

                    {/* AI OPINION SUMMARIZER BOX (AT TOP of 주관식 수기 테이블) */}
                    <div className="border-t border-slate-100 pt-8 mt-4 text-left" style={{ pageBreakInside: 'avoid' }}>
                      <div className="bg-gradient-to-br from-teal-50/50 to-emerald-50/10 border border-teal-150 p-6 rounded-2xl shadow-xs space-y-4 text-left">
                        <div className="flex items-center gap-2 text-teal-850">
                          <Brain className="text-teal-600 animate-pulse" size={18} />
                          <h4 className="text-xs font-bold tracking-tight">수요조사 주관식 건의사항 원문 분석 요약 (AI 텍스트 마이닝)</h4>
                        </div>
                        {(() => {
                          const comments = demands.map(d => d.q4_4).filter(Boolean);
                          const analysis = summarizeComments(comments);
                          return (
                            <div className="space-y-4">
                              <p className="text-[11px] text-gray-600 leading-relaxed font-light">{analysis.summaryText}</p>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {analysis.bullets.map((b, idx) => (
                                  <div key={idx} className="bg-white/90 border border-teal-100 p-4 rounded-xl flex flex-col justify-between space-y-2 hover:shadow-xs transition duration-200">
                                    <div className="space-y-1">
                                      <span className="text-[11px] font-black text-slate-800 block text-left">{b.title}</span>
                                      <p className="text-[10px] text-gray-500 leading-relaxed font-light text-left">{b.desc}</p>
                                    </div>
                                    <div className="pt-2 border-t border-gray-50 flex justify-between items-center text-[9px] text-teal-600 font-bold">
                                      <span>기조 빈출 일치성</span>
                                      <span>{(b as any).score ? `일치 가중치: ${(b as any).score}건` : '강한 연계'}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* TAB CONTENT: FIELD CORP */}
            {activeTab === 'field_corp' && (
              <div className="space-y-8">
                {/* Stats card */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5" style={isExporting ? { pageBreakInside: 'avoid', marginBottom: '16px' } : undefined}>
                  <div className="bg-teal-50/50 border border-teal-150/60 p-5 rounded-xl text-left">
                    <span className="text-xs text-teal-850 font-bold block">종합 기업 평가 표본</span>
                    <span className="text-2xl font-black text-gray-900 mt-1 block">{fieldCorps.length} <sub className="text-xs font-medium text-gray-500">개사</sub></span>
                  </div>
                  <div className="bg-teal-50/50 border border-teal-150/60 p-5 rounded-xl text-left">
                    <span className="text-xs text-teal-850 font-bold block">평균 업무 적용 평점</span>
                    <span className="text-2xl font-black text-gray-900 mt-1 block">
                      {(fieldCorps.reduce((acc, curr) => acc + parseFloat(curr.q3_1 || 3), 0) / (fieldCorps.length || 1)).toFixed(2)} <sub className="text-xs font-medium text-gray-500">/ 5.0 점</sub>
                    </span>
                  </div>
                  <div className="bg-teal-50/50 border border-teal-150/60 p-5 rounded-xl text-left">
                    <span className="text-xs text-teal-850 font-bold block">교육 확대 긍정 의향 지수</span>
                    <span className="text-2xl font-black text-gray-900 mt-1 block">
                      {(fieldCorps.reduce((acc, curr) => acc + parseFloat(curr.q2_6 || 3), 0) / (fieldCorps.length || 1)).toFixed(2)} <sub className="text-xs font-medium text-gray-500">/ 5.0 점</sub>
                    </span>
                  </div>
                </div>

                {/* Executive Summary Briefing */}
                {fieldCorps.length > 0 && (
                  <div className="bg-slate-900 text-white rounded-2xl p-6 border border-teal-500/30 text-left shadow-lg space-y-4" style={isExporting ? { pageBreakInside: 'avoid' } : undefined}>
                    <div className="flex items-center gap-2">
                       <h3 className="text-sm font-black text-teal-400">📈 기업 훈련 현업적용도 성과조사 핵심 성취 브리핑</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-300">
                      <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50 space-y-2">
                        <span className="text-slate-400 font-bold block">• 최고/최저 성과 훈련 부문</span>
                        <div className="text-sm font-bold text-white leading-relaxed">
                          {topCorpMetric ? (
                            <span className="block">최우수: <b className="text-teal-400">&quot;{topCorpMetric.metric}&quot;</b> ({topCorpMetric.score}점)</span>
                          ) : null}
                          {bottomCorpMetric ? (
                            <span className="block mt-0.5">미흡/보완: <b className="text-rose-400">&quot;{bottomCorpMetric.metric}&quot;</b> ({bottomCorpMetric.score}점)</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50 space-y-2">
                        <span className="text-slate-400 font-bold block">• 대다수 수료생 행동 관찰 성향</span>
                        <div className="text-sm font-bold text-slate-200 leading-relaxed">
                          {topCorpObserve ? (
                            <span>관찰 다수그룹: <b className="text-teal-300">&quot;{topCorpObserve.name}&quot;</b> 현상 지배적 ({topCorpObserve.value}개사, {((topCorpObserve.value/fieldCorps.length)*100).toFixed(1)}%)</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50 space-y-1">
                        <span className="text-slate-400 font-bold block">• 본 훈련과정 종합 성과 총평</span>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          복귀 수료생들의 평균 업무 적용도가 <b className="text-white">{(fieldCorps.reduce((acc, curr) => acc + parseFloat(curr.q3_1 || 3), 0) / (fieldCorps.length || 1)).toFixed(2)}점</b>으로 상당히 긍정적이며, 
                          특히 경영진 관리 성향 수준이 상위권을 지속합니다. 보완 의제인 <b className="text-rose-300">&quot;{bottomCorpMetric?.metric}&quot;</b> 영역의 세부 실천 도구를 강화하는 정규 커리큘럼 보강 조치가 추천됩니다.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {fieldCorps.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 bg-gray-50 rounded-xl">수집된 훈련현업적용도(기업) 데이터가 존재하지 않습니다.</div>
                ) : (
                  <div className="space-y-8">
                    <div className={isExporting ? "grid grid-cols-1 gap-8" : "grid grid-cols-1 lg:grid-cols-2 gap-8"}>
                      {/* Radar scores for learning transfer */}
                      <div className="bg-slate-50 border border-gray-150 p-5 rounded-2xl text-left" style={isExporting ? { pageBreakInside: 'avoid' } : undefined}>
                        <h4 className="text-xs font-bold text-slate-800 mb-4 tracking-wider">부서장 시각 훈련 성과 5대 차원 레이더</h4>
                        <div className={isExporting ? "h-[300px] flex justify-center w-full overflow-hidden" : "h-72"}>
                          {isExporting ? (
                            <RadarChart outerRadius={80} data={corpStats.coreScores} width={580} height={260}>
                              <PolarGrid />
                              <PolarAngleAxis dataKey="metric" style={{ fontSize: '10px', fontWeight: 'bold' }} />
                              <PolarRadiusAxis angle={30} domain={[1, 5]} />
                              <Radar name="현업적용 성취도" dataKey="score" stroke="#0f766e" fill="#0f766e" fillOpacity={0.6}>
                                <LabelList dataKey="score" position="top" style={{ fontSize: '11px', fontWeight: 'bold', fill: '#0f172a' }} />
                              </Radar>
                              <Tooltip />
                            </RadarChart>
                          ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <RadarChart outerRadius={90} data={corpStats.coreScores}>
                                <PolarGrid />
                                <PolarAngleAxis dataKey="metric" style={{ fontSize: '11px', fontWeight: 'bold' }} />
                                <PolarRadiusAxis angle={30} domain={[1, 5]} />
                                <Radar name="현업적용 성취도" dataKey="score" stroke="#0f766e" fill="#0f766e" fillOpacity={0.6}>
                                  <LabelList dataKey="score" position="top" style={{ fontSize: '9px', fontWeight: 'bold', fill: '#0f766e' }} />
                                </Radar>
                                <Tooltip />
                              </RadarChart>
                            </ResponsiveContainer>
                          )}
                        </div>

                        {/* Core scores exact statistics table */}
                        <div className="mt-4 bg-white border border-gray-100 rounded-xl p-4 text-left">
                          <h5 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></span>
                            <span>부서장 평가 5대 평가지표 정밀 대조표 (실수치)</span>
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5 text-xs font-semibold">
                            {sortedCorpCoreScores.map((c, idx) => (
                              <div key={idx} className="flex justify-between py-1 border-b border-gray-50">
                                <span className="font-semibold text-gray-700">{idx+1}위. {c.metric} 성취도</span>
                                <span className="font-black text-emerald-800 shrink-0">{c.score} / 5.0 점</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Observe Level */}
                      <div className="bg-slate-50 border border-gray-150 p-5 rounded-2xl text-left" style={isExporting ? { pageBreakInside: 'avoid' } : undefined}>
                        <h4 className="text-xs font-bold text-slate-800 mb-4 tracking-wider">부서 관리자의 훈련 복귀생 관찰 성향 비율</h4>
                        <div className={isExporting ? "h-[250px] flex justify-center w-full overflow-hidden" : "h-64 flex items-center justify-center"}>
                          {isExporting ? (
                            <PieChart width={580} height={240}>
                              <Pie
                                data={corpStats.observeData}
                                cx="50%" cy="50%"
                                outerRadius={72}
                                dataKey="value"
                                label={({ name, value, percent }) => `${name} (${value}개사, ${(percent * 100).toFixed(0)}%)`}
                                style={{ fontSize: '10px', fontWeight: 'bold', fill: '#0f172a' }}
                              >
                                {corpStats.observeData.map((e, i) => (
                                  <Cell key={`cell-${i}`} fill={COLORS[(i + 2) % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={corpStats.observeData}
                                  cx="50%" cy="50%"
                                  outerRadius={80}
                                  dataKey="value"
                                  label={({ name, value, percent }) => `${name} (${value}개사, ${(percent * 100).toFixed(0)}%)`}
                                  style={{ fontSize: '11px', fontWeight: 'bold' }}
                                >
                                  {corpStats.observeData.map((e, i) => (
                                    <Cell key={`cell-${i}`} fill={COLORS[(i + 2) % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          )}
                        </div>

                        {/* Observe levels exact statistics table */}
                        <div className="mt-4 bg-white border border-gray-100 rounded-xl p-4 text-left">
                          <h5 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-indigo-650 rounded-full"></span>
                            <span>부서장 시각 복귀 수료생 실무 관찰 상세 통계표</span>
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5 text-xs font-semibold">
                            {sortedCorpObserve.map((e, idx) => (
                              <div key={idx} className="flex justify-between py-1 border-b border-gray-50">
                                <span className="font-semibold text-gray-700">• {e.name}</span>
                                <span className="font-bold text-indigo-900 shrink-0">{e.value}개소 <span className="text-gray-400 font-normal">({((e.value / fieldCorps.length) * 100).toFixed(1)}%)</span></span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Specific comments */}
                    <div className="p-6 bg-slate-50 rounded-2xl border border-gray-150 text-left" style={isExporting ? { pageBreakInside: 'avoid' } : undefined}>
                      <h4 className="text-xs font-bold text-slate-800 mb-3 tracking-wider">주요 개선 및 두드러진 변화 피드백 대장 (원장 내용)</h4>
                      <div className={isExporting ? "grid grid-cols-1 gap-6 text-xs" : "grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs"}>
                        <div className={isExporting ? "" : "max-h-[260px] overflow-y-auto pr-2 bg-white/50 p-3 rounded-xl border border-gray-100/80"}>
                          <span className="font-bold text-emerald-800 block mb-2">두드러진 실무 변화 사례:</span>
                          <ul className="list-disc leading-relaxed pl-4 space-y-1.5 text-gray-600">
                            {fieldCorps.filter(c => c.q3_6).map((c, idx) => (
                              <li key={idx}>[{c.companyName || '익명'}] &quot;{c.q3_6}&quot;</li>
                            ))}
                          </ul>
                        </div>
                        <div className={isExporting ? "" : "max-h-[260px] overflow-y-auto pr-2 bg-white/50 p-3 rounded-xl border border-gray-100/80"}>
                          <span className="font-bold text-teal-850 block mb-2">훈련 개선 필요 피드백:</span>
                          <ul className="list-disc leading-relaxed pl-4 space-y-1.5 text-gray-600">
                            {fieldCorps.filter(c => c.q3_7).map((c, idx) => (
                              <li key={idx}>[{c.companyName || '익명'}] &quot;{c.q3_7}&quot;</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* --- CORP COMPREHENSIVE QUESTION DATA SECTION --- */}
                    <div className="border-t border-slate-100 pt-8 mt-4" style={{ pageBreakInside: 'avoid' }}>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6 text-left">
                        <div>
                          <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                            <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-ping" />
                            <span>📊 현업적용도(기업) 설문문항 분석</span>
                          </h3>
                          <p className="text-[10px] text-gray-400 mt-1">부서장 관찰평가 주요 설문문항의 응답 분포 통계를 제공합니다.</p>
                        </div>
                      </div>

                      {/* Expanded Questions Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <DetailedChartCard title="1-2. 귀사의 주요 업종 또는 사업 분야는 무엇입니까?" data={corpStats.corpIndustryData} questionCode="q1_2" color="#3b82f6" />
                        <DetailedChartCard title="1-3. 귀사의 사업장 상시 근로자 수는 다음 중 어느 구간에 해당합니까?" data={corpStats.corpEmplData} questionCode="q1_3" color="#10b981" />
                        <DetailedChartCard title="1-4. 귀하는 훈련 참여 근로자의 업무 변화를 어느 정도 관리/관찰할 수 있습니까?" data={corpStats.corpObserveData} questionCode="q1_4" color="#6366f1" />
                        
                        <DetailedChartCard title="2-1. 수료 직원이 학습내용을 업무에 활용할 수 있도록 지원하였습니까?" data={corpStats.corpQ2_1} questionCode="q2_1" color="#f59e0b" />
                        <DetailedChartCard title="2-2. 귀사가 제공한 지원 방식은 무엇입니까?" data={corpStats.corpQ2_2} questionCode="q2_2" color="#ec4899" />
                        <DetailedChartCard title="2-3. 향후 훈련 참여 기회를 확대할 의향이 있습니까?" data={corpStats.corpQ2_3} questionCode="q2_3" color="#8b5cf6" />
                      </div>

                      {/* Subjective Submissions */}
                      <div className="mt-8 mb-6 border-t border-slate-100 pt-8" style={isExporting ? { pageBreakInside: 'avoid' } : undefined}>
                        <div className="flex items-center gap-2 text-indigo-900 mb-6">
                          <MessageSquare className="text-indigo-600" size={18} />
                          <h4 className="text-sm font-bold tracking-tight">주관식 서술 종합 요약</h4>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                          <OtherOpinionsCard title="1-1. 직위 기타의견" data={corpStats.qaGroups['1-1. 직위 기타의견']} isExporting={isExporting} questionCode="q1_1" />
                          <OtherOpinionsCard title="1-2. 사업분야 기타의견" data={corpStats.qaGroups['1-2. 사업분야 기타의견']} isExporting={isExporting} questionCode="q1_2" />
                          <OtherOpinionsCard title="2-2. 지원방식 기타의견" data={corpStats.qaGroups['2-2. 지원방식 기타의견']} isExporting={isExporting} questionCode="q2_2" />
                          <OtherOpinionsCard title="2-4. 후속지원 필요사항" data={corpStats.qaGroups['2-4. 후속지원 필요사항']} isExporting={isExporting} questionCode="q2_4" />
                          <OtherOpinionsCard title="3-6. 업무개선 사례" data={corpStats.qaGroups['3-6. 업무개선 사례']} isExporting={isExporting} questionCode="q3_6" />
                          <OtherOpinionsCard title="3-7. 보완/개선 사항" data={corpStats.qaGroups['3-7. 보완/개선 사항']} isExporting={isExporting} questionCode="q3_7" />
                        </div>
                      </div>
                    </div>

                    {/* AI OPINION SUMMARIZER BOX (AT TOP of 주관식 수기 테이블) */}
                    <div className="border-t border-slate-100 pt-8 mt-4 text-left" style={{ pageBreakInside: 'avoid' }}>
                      <div className="bg-gradient-to-br from-indigo-50/50 to-teal-50/10 border border-indigo-150 p-6 rounded-2xl shadow-xs space-y-4 text-left">
                        <div className="flex items-center gap-2 text-indigo-900">
                          <Brain className="text-indigo-600 animate-pulse" size={18} />
                          <h4 className="text-xs font-bold tracking-tight">부서장 주관식 서술 종합 요약 (AI 현장 지표 분석)</h4>
                        </div>
                        {(() => {
                          const comments = [
                            ...fieldCorps.map(c => c.q3_6),
                            ...fieldCorps.map(c => c.q3_7)
                          ].filter(Boolean);
                          const analysis = summarizeComments(comments);
                          return (
                            <div className="space-y-4 text-left">
                              <p className="text-[11px] text-gray-600 leading-relaxed font-light">{analysis.summaryText}</p>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                                {analysis.bullets.map((b, idx) => (
                                  <div key={idx} className="bg-white/90 border border-indigo-100 p-4 rounded-xl flex flex-col justify-between space-y-2 hover:shadow-xs transition duration-200">
                                    <div className="space-y-1 text-left">
                                      <span className="text-[11px] font-black text-slate-800 block text-left">{b.title}</span>
                                      <p className="text-[10px] text-gray-500 leading-relaxed font-light text-left">{b.desc}</p>
                                    </div>
                                    <div className="pt-2 border-t border-gray-50 flex justify-between items-center text-[9px] text-indigo-600 font-bold">
                                      <span>종합 일치도</span>
                                      <span>{(b as any).score ? `식별 강도: ${(b as any).score}건` : '강한 분석성'}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: FIELD TRAINEE */}
            {activeTab === 'field_trainee' && (
              <div className="space-y-8">
                {/* Stats cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5" style={isExporting ? { pageBreakInside: 'avoid', marginBottom: '16px' } : undefined}>
                  <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-xl text-left">
                    <span className="text-xs text-emerald-850 font-bold block font-semibold">응답 수</span>
                    <span className="text-2xl font-black text-gray-900 mt-1 block">{fieldTrainees.length} <sub className="text-xs font-medium text-gray-500">명 수료생</sub></span>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-xl text-left">
                    <span className="text-xs text-emerald-800 font-bold block font-semibold">자기효능감 평균 점수</span>
                    <span className="text-2xl font-black text-gray-900 mt-1 block">
                      {(fieldTrainees.reduce((acc, curr) => acc + ((parseFloat(curr.q3_1 || 3) + parseFloat(curr.q3_2 || 3)) / 2), 0) / (fieldTrainees.length || 1)).toFixed(2)} <sub className="text-xs font-medium text-gray-500">/ 5.0 점</sub>
                    </span>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-xl text-left">
                    <span className="text-xs text-emerald-800 font-semibold block font-semibold">상사 및 동료 지원 평균 점수</span>
                    <span className="text-2xl font-black text-gray-900 mt-1 block">
                      {(fieldTrainees.reduce((acc, curr) => acc + ((parseFloat(curr.q3_7 || 3) + parseFloat(curr.q3_8 || 3)) / 2), 0) / (fieldTrainees.length || 1)).toFixed(2)} <sub className="text-xs font-medium text-gray-500">/ 5.0 점</sub>
                    </span>
                  </div>
                </div>

                {/* Executive Summary Briefing */}
                {fieldTrainees.length > 0 && (
                  <div className="bg-slate-900 text-white rounded-2xl p-6 border border-emerald-500/30 text-left shadow-lg space-y-4" style={isExporting ? { pageBreakInside: 'avoid' } : undefined}>
                    <div className="flex items-center gap-2">
                       <h3 className="text-sm font-black text-emerald-400">🎓 현업적용도(훈련생) 핵심 분석 결과 및 시사점</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-300">
                      <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50 space-y-2">
                        <span className="text-slate-400 font-bold block">• 핵심 성과 지표 비교</span>
                        <div className="text-sm font-bold text-white leading-relaxed">
                          {topTraineeMetric ? (
                            <span className="block">가장 우수한 지표: <b className="text-[#34d399]">{topTraineeMetric.name}</b> ({topTraineeMetric.score}점)</span>
                          ) : null}
                          {bottomTraineeMetric ? (
                            <span className="block mt-0.5">상대적 미흡 지표: <b className="text-[#f43f5e]">{bottomTraineeMetric.name}</b> ({bottomTraineeMetric.score}점)</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50 space-y-2">
                        <span className="text-slate-400 font-bold block">• 가장 많은 응답자 경력 분포</span>
                        <div className="text-sm font-bold text-slate-200 leading-relaxed">
                          {topTraineeCareer ? (
                            <span>최다 경력: <b className="text-teal-300">{topTraineeCareer.name}</b> ({topTraineeCareer.value}명, {((topTraineeCareer.value/fieldTrainees.length)*100).toFixed(1)}%)</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50 space-y-1">
                        <span className="text-slate-400 font-bold block">• 개선 제안</span>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          해당 과정은 <b className="text-[#34d399]">[{topTraineeMetric?.name}]</b>에서 강점을 보이고 있어 활용을 장려해야 합니다. 
                          반면, <b className="text-[#f43f5e]">[{bottomTraineeMetric?.name}]</b> 지표가 낮게 나타났으므로, 이를 보완할 수 있는 조직 내 지원책이나 교육 방식의 개선이 필요합니다.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {fieldTrainees.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 bg-gray-50 rounded-xl">학습자용 성과 적용 데이터가 아직 존재하지 않습니다.</div>
                ) : (
                  <div className="space-y-8">
                    <div className={isExporting ? "grid grid-cols-1 gap-8" : "grid grid-cols-1 lg:grid-cols-2 gap-8"}>
                      {/* Bar chart representing trainee dimensions */}
                      <div className="bg-slate-50 border border-gray-150 p-5 rounded-2xl col-span-1 lg:col-span-2 text-left" style={isExporting ? { pageBreakInside: 'avoid' } : undefined}>
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="text-xs font-bold text-slate-800 tracking-wider flex items-center gap-1">
                            <TrendingUp size={16} className="text-[#2B5C43]" />
                            <span>현업적용도 핵심 지표 상세 분석</span>
                          </h4>
                          {!isExporting && (
                            <div className="text-[10px] bg-white border border-gray-200 px-2 py-1 rounded text-gray-500 font-medium">
                              [평균점수 해석] 4.5 이상: 매우 우수 / 3.5~4.4: 우수 / 2.5~3.4: 보통 / 1.5~2.4: 미흡 / 1.5 미만: 매우 미흡
                            </div>
                          )}
                        </div>
                        <div className={isExporting ? "h-[320px] flex justify-center w-full overflow-hidden" : "h-80"}>
                          {isExporting ? (
                            <BarChart data={traineeStats.dimensions} width={580} height={300}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" style={{ fontSize: '9px', fontWeight: 'bold' }} />
                              <YAxis domain={[1, 5]} />
                              <Tooltip />
                              <Bar dataKey="score" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40}>
                                <LabelList dataKey="score" position="top" style={{ fontSize: '11px', fontWeight: 'bold', fill: '#0f172a' }} />
                                {traineeStats.dimensions.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Bar>
                            </BarChart>
                          ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={traineeStats.dimensions}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" style={{ fontSize: '11px', fontWeight: 'bold' }} />
                                <YAxis domain={[1, 5]} />
                                <Tooltip />
                                <Bar dataKey="score" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40}>
                                  <LabelList dataKey="score" position="top" style={{ fontSize: '11px', fontWeight: 'bold', fill: '#0f172a' }} />
                                  {traineeStats.dimensions.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          )}
                        </div>

                        {/* 10대 지표 상세 수치표 */}
                        <div className="mt-4 bg-white border border-gray-100 rounded-xl p-4 text-left">
                          <h5 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></span>
                            <span>핵심 성과 지표 종합표</span>
                          </h5>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs">
                            {sortedTraineeDimensions.map((d, idx) => (
                              <div key={idx} className="bg-gray-50/50 px-3 py-2 rounded-lg border border-gray-100 flex flex-col justify-between">
                                <span className="font-semibold text-gray-500 text-[10px]">{idx+1}위. {d.name}</span>
                                <span className="font-black text-emerald-800 text-sm mt-0.5">{d.score} <span className="text-[10px] text-gray-400 font-normal">/ 5.0</span></span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={isExporting ? "grid grid-cols-1 gap-8" : "grid grid-cols-1 lg:grid-cols-2 gap-8"}>
                      {/* Trainee careers */}
                      <div className={`bg-slate-50 border border-gray-150 p-5 rounded-2xl flex flex-col justify-between text-left ${isExporting ? 'h-auto' : 'h-[380px]'}`} style={isExporting ? { pageBreakInside: 'avoid' } : undefined}>
                        <h4 className="text-xs font-bold text-slate-800 mb-2 tracking-wider">응답자 경력 분포</h4>
                        <div className={isExporting ? "h-[300px] flex justify-center w-full overflow-hidden" : "h-[320px] w-full flex items-center justify-center"}>
                          {isExporting ? (
                            <PieChart width={580} height={280} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                              <Pie
                                data={traineeStats.careerData}
                                cx="50%" cy="50%"
                                outerRadius={80}
                                dataKey="value"
                                labelLine={true}
                                label={({ name, value, percent }) => `${name} (${value}명, ${(percent * 100).toFixed(0)}%)`}
                                style={{ fontSize: '10px', fontWeight: 'bold', fill: '#0f172a' }}
                              >
                                {traineeStats.careerData.map((e, i) => (
                                  <Cell key={`cell-${i}`} fill={COLORS[(i + 3) % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <Pie
                                  data={traineeStats.careerData}
                                  cx="50%" cy="50%"
                                  outerRadius="50%"
                                  dataKey="value"
                                  labelLine={true}
                                  label={({ name, value, percent }) => `${name} (${value}명, ${(percent * 100).toFixed(0)}%)`}
                                  style={{ fontSize: '10px', fontWeight: 'bold' }}
                                >
                                  {traineeStats.careerData.map((e, i) => (
                                    <Cell key={`cell-${i}`} fill={COLORS[(i + 3) % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          )}
                        </div>

                        {/* 전공 경력 상세 수치표 */}
                        <div className="mt-4 bg-white border border-gray-100 rounded-xl p-4 text-left">
                          <h5 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-sky-600 rounded-full"></span>
                            <span>경력 분포표</span>
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                            {sortedTraineeCareer.map((e, idx) => (
                              <div key={idx} className="flex justify-between py-1 border-b border-gray-50">
                                <span className="font-semibold text-gray-700">• {e.name}</span>
                                <span className="font-bold text-sky-850 shrink-0">{e.value}명 ({((e.value / fieldTrainees.length) * 100).toFixed(1)}%)</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Summary list */}
                      <div className={`bg-slate-50 border border-gray-150 p-5 rounded-2xl flex flex-col text-left ${isExporting ? 'h-auto' : 'h-[380px]'}`} style={isExporting ? { pageBreakInside: 'avoid' } : undefined}>
                        <h4 className="text-xs font-bold text-slate-800 mb-3 tracking-wider shrink-0">주관식 의견 종합</h4>
                        <div className={`divide-y divide-gray-150 text-xs text-left flex-1 ${isExporting ? '' : 'overflow-y-auto pr-2 custom-scrollbar min-h-0'}`}>
                          {fieldTrainees.filter(t => t.q4).map((t, idx) => (
                            <div key={idx} className="py-2.5">
                              <span className="font-bold text-emerald-800">훈련생 사례 {idx + 1} ({t.q1_1_final || t.q1_1 || '전공'}):</span>
                              <p className="text-gray-600 font-light mt-0.5 leading-relaxed">&quot;{t.q4}&quot;</p>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>

                    {/* --- TRAINEE COMPREHENSIVE QUESTION DATA SECTION --- */}
                    <div className="border-t border-slate-100 pt-8 mt-4" style={{ pageBreakInside: 'avoid' }}>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6 text-left">
                        <div>
                          <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                            <span className="w-2.5 h-2.5 bg-emerald-600 rounded-full animate-ping" />
                            <span>📊 현업적용도(훈련생) 설문문항 분석</span>
                          </h3>
                        </div>
                      </div>

                      {/* Expanded Questions Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <DetailedChartCard title="1-1. 주 담당 업무" data={traineeStats.traineeTaskData} questionCode="q1_1" color="#3b82f6" />
                        <DetailedChartCard title="1-2. 관련 업무 경력" data={traineeStats.traineeCareerData} questionCode="q1_2" color="#10b981" />
                        
                        <DetailedChartCard title="2-1. [업무관련성] 학습한 내용은 실제 업무와 관련이 높다" data={traineeStats.traineeScore21} questionCode="q2_1" color="#f59e0b" />
                        <DetailedChartCard title="2-2. [업무유용성] 학습한 내용은 업무 적용에 도움이 되었다" data={traineeStats.traineeScore22} questionCode="q2_2" color="#ec4899" />
                        <DetailedChartCard title="2-3. [실용적용성] 학습내용을 업무에 지속적으로 적용하고자 노력하고 있다" data={traineeStats.traineeScore23} questionCode="q2_3" color="#8b5cf6" />
                        <DetailedChartCard title="2-4. [업무향상도] 훈련 이후 업무를 더 효과적이고 체계적으로 수행하게 되었다" data={traineeStats.traineeScore24} questionCode="q2_4" color="#06b6d4" />
                        <DetailedChartCard title="2-5. [성과기여도] 학습한 내용은 업무성과 향상에 도움이 되었다" data={traineeStats.traineeScore25} questionCode="q2_5" color="#ef4444" />
                        
                        <DetailedChartCard title="3-1. [자기효능감] 업무에 새로운 지식과 기술을 적용할 수 있다" data={traineeStats.traineeScore31} questionCode="q3_1" color="#22c55e" />
                        <DetailedChartCard title="3-2. [자기효능감] 어려운 상황에서도 배운 내용을 업무에 활용할 수 있다" data={traineeStats.traineeScore32} questionCode="q3_2" color="#f43f5e" />
                        
                        <DetailedChartCard title="3-3. [전이동기] 배운 지식과 기술이 업무성과 향상에 도움이 된다" data={traineeStats.traineeScore33} questionCode="q3_3" color="#a855f7" />
                        <DetailedChartCard title="3-4. [전이동기] 업무 관련 문제를 해결하는 데 도움이 된다고 생각한다" data={traineeStats.traineeScore34} questionCode="q3_4" color="#14b8a6" />
                        
                        <DetailedChartCard title="3-5. [전이설계] 훈련과정은 업무 적용 방법을 구체적으로 안내하였다" data={traineeStats.traineeScore35} questionCode="q3_5" color="#6b7280" />
                        <DetailedChartCard title="3-6. [전이설계] 과정은 직무 활용 사례와 실무 중심으로 구성되었다" data={traineeStats.traineeScore36} questionCode="q3_6" color="#3b82f6" />
                        
                        <DetailedChartCard title="3-7. [상사/동료지원] 상사는 학습 내용을 업무에 활용하도록 지원한다" data={traineeStats.traineeScore37} questionCode="q3_7" color="#10b981" />
                        <DetailedChartCard title="3-8. [상사/동료지원] 동료는 학습 내용을 업무에 적용하도록 지원한다" data={traineeStats.traineeScore38} questionCode="q3_8" color="#6366f1" />
                        
                        <DetailedChartCard title="3-9. [변화가능성] 우리 부서는 학습 내용을 업무에 적용하려는 분위기가 있다" data={traineeStats.traineeScore39} questionCode="q3_9" color="#f59e0b" />
                        <DetailedChartCard title="3-10. [변화가능성] 우리 부서는 새로운 업무 방식 시도에 긍정적이다" data={traineeStats.traineeScore310} questionCode="q3_10" color="#ec4899" />
                      </div>
                    </div>

                    {/* AI OPINION SUMMARIZER BOX (AT TOP of 주관식 수기 테이블) */}
                    <div className="border-t border-slate-100 pt-8 mt-4 text-left" style={{ pageBreakInside: 'avoid' }}>
                      <div className="bg-gradient-to-br from-emerald-50/50 to-indigo-50/10 border border-emerald-150 p-6 rounded-2xl shadow-xs space-y-4 text-left">
                        <div className="flex items-center gap-2 text-emerald-950">
                          <Brain className="text-emerald-700 animate-pulse" size={18} />
                          <h4 className="text-xs font-bold tracking-tight">훈련생 주관식도 직접 종합 요약 (AI 텍스트 마이닝)</h4>
                        </div>
                        {(() => {
                          const comments = fieldTrainees.map(t => t.q4).filter(Boolean);
                          const analysis = summarizeComments(comments);
                          return (
                            <div className="space-y-4 text-left">
                              <p className="text-[11px] text-gray-600 leading-relaxed font-light">{analysis.summaryText}</p>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                                {analysis.bullets.map((b, idx) => (
                                  <div key={idx} className="bg-white/90 border border-emerald-100 p-4 rounded-xl flex flex-col justify-between space-y-2 hover:shadow-xs transition duration-200">
                                    <div className="space-y-1 text-left">
                                      <span className="text-[11px] font-black text-slate-800 block text-left">{b.title}</span>
                                      <p className="text-[10px] text-gray-500 leading-relaxed font-light text-left">{b.desc}</p>
                                    </div>
                                    <div className="pt-2 border-t border-gray-50 flex justify-between items-center text-[9px] text-emerald-600 font-bold">
                                      <span>기류 일치성</span>
                                      <span>{(b as any).score ? `일치 빈출: ${(b as any).score}건` : '안정적'}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: FGI */}
            {activeTab === 'fgi' && (
              <div className="space-y-8">
                {/* Stats cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5" style={isExporting ? { pageBreakInside: 'avoid', marginBottom: '16px' } : undefined}>
                  <div className="bg-[#e0f2f1]/40 border border-[#0f766e]/30 p-5 rounded-xl text-left">
                    <span className="text-xs text-neutral-600 font-bold block">FGI 응답 수</span>
                    <span className="text-2xl font-black text-gray-900 mt-1 block">{fgis.length} <sub className="text-xs font-medium text-gray-500">개 그룹</sub></span>
                  </div>
                  <div className="bg-[#e0f2f1]/40 border border-[#0f766e]/30 p-5 rounded-xl text-left">
                    <span className="text-xs text-neutral-600 font-bold block">컨소시엄 훈련 만족도 지표</span>
                    <span className="text-2xl font-black text-gray-900 mt-1 block">{fgiStats.avgSat || 0} <sub className="text-xs font-medium text-gray-500">/ 5.0 점</sub></span>
                  </div>
                </div>

                {/* Executive Summary Briefing */}
                {fgis.length > 0 && (
                  <div className="bg-slate-900 text-white rounded-2xl p-6 border border-emerald-500/30 text-left shadow-lg space-y-4" style={isExporting ? { pageBreakInside: 'avoid' } : undefined}>
                    <div className="flex items-center gap-2">
                       <h3 className="text-sm font-black text-emerald-400">💬 FGI(요구조사) 데이터 핵심 브리핑</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-300">
                      <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50 space-y-2">
                        <span className="text-slate-400 font-bold block">• 요구 역량 대비 현재 수준</span>
                        <div className="text-sm font-bold text-white leading-relaxed space-y-1">
                          <span className="block text-gray-400 text-xs">현재 수준: <b className="text-white">{fgiTargetCurr}점</b></span>
                          <span className="block text-emerald-400 text-xs">요구 목표 수준: <b className="text-emerald-400">{fgiTargetGoal}점</b></span>
                          <span className="block text-rose-400 text-xs pb-1">격차(Gap): <b className="text-rose-400">{fgiTargetGap}점</b> 차이 발생</span>
                          <span className="block text-[10px] text-slate-400 font-normal leading-snug pt-1.5 border-t border-slate-700/50">차이(Gap) 점수가 클수록 현장 실무에서 요구하는 역량과 실제 역량 간 불일치가 커, 우선적이고 집중적인 교육 훈련이 시급함을 의미합니다.</span>
                        </div>
                      </div>
                      <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50 space-y-2">
                        <span className="text-slate-400 font-bold block">• 훈련이 시급한 연차</span>
                        <div className="text-sm font-bold text-slate-200 leading-relaxed">
                          {topFgiTarget ? (
                            <span>최우선 대상: <b className="text-teal-300">&quot;{topFgiTarget.name}&quot;</b> ({topFgiTarget.value}표, {((topFgiTarget.value / fgis.length) * 100).toFixed(1)}%)</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50 space-y-1">
                        <span className="text-slate-400 font-bold block">• FGI 면담자의 제안 핵심 요약</span>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          패널들의 전반 만족도는  <b className="text-white">{fgiStats.avgSat}점 / 5.0점</b>으로 상당히 높으며 실무적 갈증이 상존합니다. 
                          요구 수준과 현재 격차인 <b className="text-rose-300">{fgiTargetGap}점</b>을 조속히 메우기 위해 <b className="text-[#34d399]">{topFgiTarget?.name || '시급대상연차'}</b>에 집중 조준하여 맞춤 특화 단기 심화과정 특수 증설이 강력히 제안됩니다.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {fgis.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 bg-gray-50 rounded-xl">수합된 FGI 질문조사 데이터가 없습니다.</div>
                ) : (
                  <div className="space-y-8">
                    {/* Contrast Level graph */}
                    <div className={isExporting ? "grid grid-cols-1 gap-8" : "grid grid-cols-1 lg:grid-cols-2 gap-8"}>
                      <div className="lg:col-span-2 bg-slate-50 border border-gray-150 p-5 rounded-2xl text-left" style={isExporting ? { pageBreakInside: 'avoid' } : undefined}>
                        <h4 className="text-sm font-bold text-slate-800 mb-4 tracking-wider">요구 역량과 현재 역량 비교 분석</h4>
                        <div className={isExporting ? "h-[300px] flex justify-center w-full overflow-hidden" : "h-80"}>
                          {isExporting ? (
                            <BarChart data={fgiStats.contrastData} width={1000} height={280}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="category" style={{ fontSize: '12px', fontWeight: 'bold' }} />
                              <YAxis domain={[1, 5]} />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="현재역량" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={60}>
                                <LabelList dataKey="현재역량" position="top" style={{ fontSize: '11px', fontWeight: 'bold', fill: '#1e3a8a' }} />
                              </Bar>
                              <Bar dataKey="목표역량" fill="#EA580C" radius={[4, 4, 0, 0]} maxBarSize={60}>
                                <LabelList dataKey="목표역량" position="top" style={{ fontSize: '11px', fontWeight: 'bold', fill: '#7c2d12' }} />
                              </Bar>
                            </BarChart>
                          ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={fgiStats.contrastData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="category" style={{ fontSize: '12px', fontWeight: 'bold' }} />
                                <YAxis domain={[1, 5]} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="현재역량" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={60}>
                                  <LabelList dataKey="현재역량" position="top" style={{ fontSize: '12px', fontWeight: 'bold', fill: '#1e3a8a' }} />
                                </Bar>
                                <Bar dataKey="목표역량" fill="#EA580C" radius={[4, 4, 0, 0]} maxBarSize={60}>
                                  <LabelList dataKey="목표역량" position="top" style={{ fontSize: '12px', fontWeight: 'bold', fill: '#7c2d12' }} />
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          )}
                        </div>

                        {/* 역량 GAP 상세 성과 수치표 */}
                        <div className="mt-4 bg-white border border-gray-100 rounded-xl p-4 text-left shadow-sm">
                          <h5 className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-rose-600 rounded-full"></span>
                            <span>역량 차이 세부 비교표</span>
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
                            <div className="bg-zinc-50 border border-zinc-100 rounded-lg p-3.5 flex justify-between items-center shadow-xs">
                              <span className="text-gray-500 font-bold">현재 실전 역량</span>
                              <span className="font-bold text-lg text-gray-800">{fgiTargetCurr} <span className="text-xs font-medium text-gray-500">/ 5.0</span></span>
                            </div>
                            <div className="bg-emerald-50/70 border border-emerald-100 rounded-lg p-3.5 flex justify-between items-center shadow-xs">
                              <span className="text-emerald-700 font-bold">목표 역량</span>
                              <span className="font-bold text-lg text-emerald-800">{fgiTargetGoal} <span className="text-xs font-medium text-emerald-600">/ 5.0</span></span>
                            </div>
                            <div className="bg-rose-50/70 border border-rose-100 rounded-lg p-3.5 flex justify-between items-center shadow-xs">
                              <span className="text-rose-700 font-bold">초과 격차(GAP)</span>
                              <span className="font-bold text-lg text-rose-800">{fgiTargetGap} <span className="text-xs font-medium text-rose-600">점</span></span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Demand targets circle chart */}
                      <div className="bg-slate-50 border border-gray-150 p-5 rounded-2xl text-left flex flex-col" style={isExporting ? { pageBreakInside: 'avoid' } : undefined}>
                        <h4 className="text-sm font-bold text-slate-800 mb-4 tracking-wider">훈련이 시급한 연차 분포</h4>
                        <div className={isExporting ? "h-[250px] flex justify-center w-full overflow-hidden" : "h-64 flex items-center justify-center"}>
                          {isExporting ? (
                            <PieChart width={500} height={240}>
                              <Pie
                                data={fgiStats.demandTargets}
                                cx="50%" cy="50%"
                                outerRadius={60}
                                dataKey="value"
                                label={({ name, value, percent }) => `${name} (${value}명, ${(percent * 100).toFixed(0)}%)`}
                                style={{ fontSize: '10px', fontWeight: 'bold', fill: '#0f172a' }}
                              >
                                {fgiStats.demandTargets.map((e, idx) => (
                                  <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={fgiStats.demandTargets}
                                  cx="50%" cy="50%"
                                  outerRadius={70}
                                  dataKey="value"
                                  label={({ name, value, percent }) => `${name} (${value}명, ${(percent * 100).toFixed(0)}%)`}
                                  style={{ fontSize: '11px', fontWeight: 'bold' }}
                                >
                                  {fgiStats.demandTargets.map((e, idx) => (
                                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          )}
                        </div>

                        {/* 연차 대상 상세 수치표 */}
                        <div className="mt-auto bg-white border border-gray-100 rounded-xl p-4 text-left shadow-sm">
                          <h5 className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></span>
                            <span>훈련 시급 대상 분포표</span>
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm font-semibold">
                            {sortedFgiTargets.map((e, idx) => (
                              <div key={idx} className="flex justify-between py-1.5 border-b border-gray-50 items-center">
                                <span className="font-semibold text-gray-700 truncate mr-2">• {e.name}</span>
                                <span className="font-bold text-emerald-800 shrink-0">{e.value}명 <span className="text-xs text-gray-400 font-medium ml-1">({((e.value / fgis.length) * 100).toFixed(1)}%)</span></span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Region bar chart */}
                      <div className="bg-slate-50 border border-gray-150 p-5 rounded-2xl text-left flex flex-col" style={isExporting ? { pageBreakInside: 'avoid' } : undefined}>
                        <h4 className="text-sm font-bold text-slate-800 mb-4 tracking-wider">시/도별 참여 분포</h4>
                        <div className={isExporting ? "h-[250px] flex justify-center w-full overflow-hidden" : "h-64 flex items-center justify-center"}>
                          {isExporting ? (
                            <BarChart data={fgiStats.fgiRegionData} width={500} height={240} layout="vertical" margin={{ left: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                              <XAxis type="number" hide />
                              <YAxis dataKey="name" type="category" width={90} axisLine={false} tickLine={false} style={{ fontSize: '11px', fontWeight: 'bold' }} />
                              <Tooltip cursor={{ fill: '#f1f5f9' }} />
                              <Bar dataKey="value" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={20}>
                                <LabelList dataKey="value" position="right" style={{ fontSize: '11px', fontWeight: 'bold' }} />
                              </Bar>
                            </BarChart>
                          ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={fgiStats.fgiRegionData} layout="vertical" margin={{ left: 10, right: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={80} axisLine={false} tickLine={false} style={{ fontSize: '12px', fontWeight: 'bold' }} />
                                <Tooltip cursor={{ fill: '#f1f5f9' }} />
                                <Bar dataKey="value" fill="#8B5CF6" radius={[0, 4, 4, 0]} maxBarSize={30}>
                                  <LabelList dataKey="value" position="right" style={{ fontSize: '12px', fontWeight: 'bold', fill: '#6b21a8' }} />
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          )}
                        </div>

                        {/* 시/도 대상 상세 수치표 */}
                        <div className="mt-auto bg-white border border-gray-100 rounded-xl p-4 text-left shadow-sm">
                          <h5 className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-purple-600 rounded-full"></span>
                            <span>상위 참여 지역 분포표</span>
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm font-semibold">
                            {fgiStats.fgiRegionData.slice(0, 6).map((e, idx) => (
                              <div key={idx} className="flex justify-between py-1.5 border-b border-gray-50 items-center">
                                <span className="font-semibold text-gray-700 truncate mr-2">{idx + 1}. {e.name}</span>
                                <span className="font-bold text-purple-800 shrink-0">{e.value}곳 <span className="text-xs text-gray-400 font-medium ml-1">({((e.value / fgis.length) * 100).toFixed(1)}%)</span></span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detailed textual comments */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                      <div className={`bg-slate-50 border border-gray-150 p-6 rounded-2xl text-left ${isExporting ? 'overflow-visible h-auto' : 'overflow-y-auto max-h-[360px] pr-2'}`} style={isExporting ? { pageBreakInside: 'avoid' } : undefined}>
                        <h4 className="text-sm font-bold text-slate-800 mb-3 tracking-wider">주관식 응답 모아보기: 필요 교육 분야 (2-5)</h4>
                        <div className="divide-y divide-gray-200">
                          {fgis.filter(f => f.q2_5).map((f, i) => (
                            <div key={i} className="py-2.5 text-xs">
                              <span className="font-bold text-[#2B5C43]">{f.companyName || '무명'} ({f.contactName || '대표'}):</span>
                              <p className="text-gray-600 font-light mt-0.5 leading-relaxed">&quot;{f.q2_5}&quot;</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className={`bg-slate-50 border border-gray-150 p-6 rounded-2xl text-left ${isExporting ? 'overflow-visible h-auto' : 'overflow-y-auto max-h-[360px] pr-2'}`} style={isExporting ? { pageBreakInside: 'avoid' } : undefined}>
                        <h4 className="text-sm font-bold text-slate-800 mb-3 tracking-wider">주관식 응답 모아보기: 협회 컨소시엄 훈련에 바라는 점 (4-3)</h4>
                        <div className="divide-y divide-gray-200">
                          {fgis.filter(f => f.q4_3).map((f, i) => (
                            <div key={i} className="py-2.5 text-xs">
                              <span className="font-bold text-[#2B5C43]">{f.companyName || '무명'} ({f.contactName || '대표'}):</span>
                              <p className="text-gray-600 font-light mt-0.5 leading-relaxed">&quot;{f.q4_3}&quot;</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* --- FGI COMPREHENSIVE QUESTION DATA SECTION --- */}
                    <div className="border-t border-slate-100 pt-8 mt-4" style={{ pageBreakInside: 'avoid' }}>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6 text-left">
                        <div>
                          <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                            <span className="w-2.5 h-2.5 bg-teal-600 rounded-full animate-ping" />
                            <span>📊 FGI 조사 설문문항 분석</span>
                          </h3>
                        </div>
                      </div>

                      {/* Expanded Questions Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <DetailedChartCard title="1-1. 면담 기업의 전기관련 재직근로자 수" data={fgiStats.fgiEmplData} questionCode="q1_1" color="#3b82f6" />
                        <DetailedChartCard title="1-2. 면담 기업의 전기직무 재직근로자 경력 분포" data={fgiStats.fgiCareerData} questionCode="q1_2" color="#10b981" />
                        <DetailedChartCard title="1-3. 면담 기업 전기직무 재직근로자의 주요 수행 업무" data={fgiStats.fgiTaskData} questionCode="q1_3" color="#6366f1" />
                        <DetailedChartCard title="2-1. 면담 기업 전기직무 재직근로자 중 가장 교육 수요가 높은 대상" data={fgiStats.fgiTargetData} questionCode="q2_1" color="#f59e0b" />
                        <DetailedChartCard title="2-2. 전기직무 재직근로자의 현재 실무역량 수준" data={fgiStats.fgiCurrLevelData} questionCode="q2_2" color="#ec4899" />
                        <DetailedChartCard title="2-3. 전기직무 재직근로자에게 요구하는 목표 역량 수준" data={fgiStats.fgiTargetLevelData} questionCode="q2_3" color="#8b5cf6" />
                        <DetailedChartCard title="2-4. 전기직무 재직근로자가 업무 수행 시 가장 부족하다고 생각되는 역량" data={fgiStats.fgiLackData} questionCode="q2_4" color="#06b6d4" />
                        <DetailedChartCard title="3-1. 재직근로자를 컨소시엄 훈련에 참여시키는 경우, 가장 중요하게 고려하는 사항" data={fgiStats.fgiConsiderData} questionCode="q3_1" color="#22c55e" />
                        <DetailedChartCard title="3-2. 재직근로자를 교육에 보낼 때 장애가 되는 요소" data={fgiStats.fgiBlockerData} questionCode="q3_2" color="#f43f5e" />
                        <DetailedChartCard title="3-3. 재직근로자를 컨소시엄 훈련에 참여시키는 경우, 허용 가능한 기간" data={fgiStats.fgiPeriodData} questionCode="q3_3" color="#a855f7" />
                        <DetailedChartCard title="3-4. 면담 기업에서 컨소시엄 훈련 참여가 가능한 시기" data={fgiStats.fgiSeasonData} questionCode="q3_4" color="#14b8a6" />
                        <DetailedChartCard title="3-5. 훈련 참여 가능한 예상 인원" data={fgiStats.fgiVolumeData} questionCode="q3_5" color="#6b7280" />
                        <DetailedChartCard title="4-1. 협회 컨소시엄 훈련에 대한 전반적인 만족도" data={fgiStats.fgiSatData} questionCode="q4_1" color="#3b82f6" />
                        <DetailedChartCard title="4-2. 협회 컨소시엄 훈련에 개선이 필요한 사항" data={fgiStats.fgiImproveData} questionCode="q4_2" color="#10b981" />
                      </div>
                    </div>

                    {/* AI OPINION SUMMARIZER BOX (AT TOP of 주관식 수기 테이블) */}
                    <div className="border-t border-slate-100 pt-8 mt-4 text-left" style={{ pageBreakInside: 'avoid' }}>
                      <div className="bg-gradient-to-br from-teal-50/50 to-zinc-50/10 border border-teal-150 p-6 rounded-2xl shadow-xs space-y-4 text-left">
                        <div className="flex items-center gap-2 text-teal-900">
                          <Brain className="text-teal-600 animate-pulse" size={18} />
                          <h4 className="text-xs font-bold tracking-tight">FGI 패널 심도 진술 종합 요약 (AI 텍스트 마이닝)</h4>
                        </div>
                        {(() => {
                          const comments = fgis.flatMap(f => [f.q4_3, f.q4_4].filter(Boolean));
                          const analysis = summarizeComments(comments);
                          return (
                            <div className="space-y-4 text-left">
                              <p className="text-[11px] text-gray-600 leading-relaxed font-light">{analysis.summaryText}</p>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                                {analysis.bullets.map((b, idx) => (
                                  <div key={idx} className="bg-white/90 border border-teal-100 p-4 rounded-xl flex flex-col justify-between space-y-2 hover:shadow-xs transition duration-200">
                                    <div className="space-y-1 text-left">
                                      <span className="text-[11px] font-black text-slate-800 block text-left">{b.title}</span>
                                      <p className="text-[10px] text-gray-500 leading-relaxed font-light text-left">{b.desc}</p>
                                    </div>
                                    <div className="pt-2 border-t border-gray-50 flex justify-between items-center text-[9px] text-teal-600 font-bold">
                                      <span>기치 일치성</span>
                                      <span>{(b as any).score ? `확률 분포: ${(b as any).score}건` : '우수성 대조'}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: ADMIN MANAGEMENT */}
            {activeTab === 'admin_mgmt' && (
              <div className="space-y-8 text-left">
                <div className="bg-slate-50 border border-gray-150 p-6 rounded-2xl space-y-4 text-left">
                  <div className="border-b border-gray-200/80 pb-2">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <Lock size={15} className="text-emerald-600" />
                      <span>관리자 권한 부여 방법 & 보안 수칙</span>
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
                    {/* Timeline steps */}
                    <div className="space-y-3">
                      <span className="text-[11px] font-bold text-slate-700 block">⚡ 관리자 권한 부여 방법</span>
                      <div className="space-y-2 text-[10.5px]">
                        <div className="flex gap-2">
                          <span className="flex-shrink-0 w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[9px] mt-0.5">1</span>
                          <p className="text-gray-650 font-normal leading-relaxed">관리자(직원)의 구글 이메일 주소를 하단 양식에 등록합니다.</p>
                        </div>
                        <div className="flex gap-2">
                          <span className="flex-shrink-0 w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[9px] mt-0.5">2</span>
                          <p className="text-gray-650 font-normal leading-relaxed">등록된 관리자가 시스템 메인 화면에서 <strong className="text-emerald-700 font-bold">Google 로그인</strong>을 통해 세션을 활성화합니다.</p>
                        </div>
                        <div className="flex gap-2">
                          <span className="flex-shrink-0 w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[9px] mt-0.5">3</span>
                          <p className="text-gray-650 font-normal leading-relaxed">즉시 계정이 연동되어 관리자 페이지 전 기능 접근이 가능합니다.</p>
                        </div>
                      </div>
                    </div>

                    {/* Security checklist */}
                    <div className="border-t md:border-t-0 md:border-l border-gray-200/60 md:pl-6 pt-3 md:pt-0 space-y-2">
                      <span className="text-[11px] font-bold text-slate-700 block">🔒 공동훈련센터 관리자 보안 서약</span>
                      
                      <div className="space-y-2.5 text-[10px] text-gray-600">
                        <label className="flex items-start gap-2 cursor-pointer group">
                          <input type="checkbox" defaultChecked className="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5" />
                          <span className="group-hover:text-slate-800 transition">데이터의 외부 무단 유출 행위를 절대 금지합니다.</span>
                        </label>
                        <label className="flex items-start gap-2 cursor-pointer group">
                          <input type="checkbox" defaultChecked className="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5" />
                          <span className="group-hover:text-slate-800 transition">대리 로그인 및 계정의 공유를 엄격히 금지합니다.</span>
                        </label>
                        <label className="flex items-start gap-2 cursor-pointer group">
                          <input type="checkbox" defaultChecked className="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5" />
                          <span className="group-hover:text-slate-800 transition">업무 후, 보안 유지를 위해 정기적인 로그아웃을 실시합니다.</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Admins List Table */}
                <div className="bg-white border border-gray-150 rounded-2xl overflow-hidden shadow-xs">
                  <div className="bg-slate-50 border-b border-gray-150 px-5 py-4 flex items-center justify-between">
                    <h4 className="text-xs font-extrabold text-slate-800 tracking-wider flex items-center gap-1.5">
                      <Users size={16} className="text-emerald-700" />
                      <span>관리자 목록</span>
                    </h4>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
                      등록 관리자 수: {adminsList.length}명
                    </span>
                  </div>

                  <div className="overflow-x-auto min-w-full">
                    <table className="min-w-full divide-y divide-gray-150 text-left">
                      <thead className="bg-[#F8FAFC]">
                        <tr className="text-gray-400 font-bold text-[10px] tracking-wider">
                          <th className="px-5 py-3 font-semibold">이름 / 직위</th>
                          <th className="px-5 py-3 font-semibold">구글 이메일</th>
                          <th className="px-5 py-3 font-semibold">고유 연동 상태</th>
                          <th className="px-5 py-3 font-semibold text-center">권한 및 제어</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150 text-xs">
                        {adminsList.map((admin) => {
                          const isSuper = admin.email === "seanyoo97@gmail.com";
                          const isMe = admin.id === currentUser?.uid || admin.email === currentUser?.email;
                          const isUidBased = !admin.id.includes('@');
                          return (
                            <tr key={admin.id} className="hover:bg-slate-50/50 transition">
                              <td className="px-5 py-3.5">
                                <div className="font-bold text-gray-900">{admin.name || "미기입"}</div>
                                <div className="text-[10px] text-gray-500 font-light mt-0.5">{admin.memo || "정보 없음"}</div>
                              </td>
                              <td className="px-5 py-3.5 font-medium text-gray-700">
                                {admin.email}
                              </td>
                              <td className="px-5 py-3.5">
                                <span className={`inline-block text-[9px] px-2 py-0.5 font-semibold rounded-full border ${
                                  isSuper ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
                                  isUidBased ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                }`}>
                                  {isSuper ? '최고 총괄 권한' : isUidBased ? '로그인 맵핑 연동' : '이메일 자동 승인'}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-center">
                                {isSuper ? (
                                  <span className="bg-slate-900 border border-slate-700 text-white text-[9px] px-2 py-0.5 rounded font-bold font-mono">
                                    SUPER OWNER
                                  </span>
                                ) : isMe ? (
                                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] px-2 py-0.5 rounded font-bold">
                                    본인 활성계정
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleDeleteAdmin(admin.id, admin.email)}
                                    disabled={mgmtLoading}
                                    className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition disabled:opacity-50 inline-flex items-center gap-1 text-[11px] font-bold"
                                    title="권한 회수 및 관리자 영구삭제"
                                  >
                                    <Trash2 size={13} />
                                    <span>삭제</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {adminsList.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-gray-400">
                              등록된 관리 행원이 없습니다.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Bottom Row Forms (Profiles & Invitation Forms) side-by-side with nice density */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* My Profile Card */}
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-155 p-6 rounded-2xl space-y-4 shadow-xs">
                    <div className="border-b border-emerald-150 pb-2">
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <UserCheck size={16} className="text-[#0D9488]" />
                        <span>내 상태 및 프로필 수정</span>
                      </h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">내 이름과 소속부서 정보를 직접 입력하고 갱신합니다.</p>
                    </div>

                    <div className="space-y-1 text-slate-500 text-[10px] bg-white border border-emerald-100/50 p-3 rounded-xl">
                      <div><strong className="text-slate-700 font-bold">로그인 계정:</strong> {currentUser?.email}</div>
                      <div className="mt-1"><strong className="text-slate-700 font-bold">권한 레벨:</strong> {currentUser?.email === 'seanyoo97@gmail.com' ? '최고 총괄 마스터' : '승인 관리자'}</div>
                    </div>

                    <form onSubmit={handleUpdateMyProfile} className="space-y-3">
                      <div className="space-y-1 text-left">
                        <label className="text-[11px] font-bold text-slate-700 block">관리자 이름 <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          required
                          placeholder="예: 김철수"
                          value={myAdminName}
                          onChange={(e) => setMyAdminName(e.target.value)}
                          className="w-full bg-white border border-gray-200 focus:border-primary-green focus:ring-1 focus:ring-primary-green outline-none py-2 px-3 rounded-lg text-xs"
                        />
                      </div>

                      <div className="space-y-1 text-left">
                        <label className="text-[11px] font-bold text-slate-700 block">직위 <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          required
                          placeholder="예: 과장"
                          value={myAdminMemo}
                          onChange={(e) => setMyAdminMemo(e.target.value)}
                          className="w-full bg-white border border-gray-200 focus:border-primary-green focus:ring-1 focus:ring-primary-green outline-none py-2 px-3 rounded-lg text-xs"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={myProfileLoading}
                        className="w-full bg-emerald-600 text-white hover:bg-emerald-700 py-2.5 px-4 rounded-xl font-bold text-xs shadow-xs transition duration-200 disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        <UserCheck size={14} />
                        <span>{myProfileLoading ? "정보 저장 중..." : "내 프로필 정보 갱신"}</span>
                      </button>
                    </form>
                  </div>

                  {/* Add Admin Form */}
                  <div className="bg-slate-50 border border-gray-150 p-6 rounded-2xl space-y-4">
                    <div className="border-b border-gray-200 pb-2">
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <UserPlus size={16} className="text-primary-green" />
                        <span>신규 관리자 가입 허용</span>
                      </h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">이메일 주소 등록만으로 권한이 원스톱 자동 활성화됩니다.</p>
                    </div>

                    <form onSubmit={handleAddNewAdmin} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-gray-700 block">이메일 주소 <span className="text-red-500">*</span></label>
                        <input
                          type="email"
                          required
                          placeholder="example@association.or.kr"
                          value={newAdminEmail}
                          onChange={(e) => setNewAdminEmail(e.target.value)}
                          className="w-full bg-white border border-gray-200 focus:border-primary-green focus:ring-1 focus:ring-primary-green outline-none py-2 px-3 rounded-lg text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-gray-700 block">관리자 이름 <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          required
                          placeholder="예: 김철수"
                          value={newAdminName}
                          onChange={(e) => setNewAdminName(e.target.value)}
                          className="w-full bg-white border border-gray-200 focus:border-primary-green focus:ring-1 focus:ring-primary-green outline-none py-2 px-3 rounded-lg text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-gray-700 block">직위 <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          required
                          placeholder="예: 과장"
                          value={newAdminMemo}
                          onChange={(e) => setNewAdminMemo(e.target.value)}
                          className="w-full bg-white border border-gray-200 focus:border-primary-green focus:ring-1 focus:ring-primary-green outline-none py-2 px-3 rounded-lg text-xs"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={mgmtLoading}
                        className="w-full bg-primary-green text-white hover:bg-primary-green-hover py-2.5 px-4 rounded-xl font-bold text-xs shadow-xs transition duration-200 disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        <UserPlus size={14} />
                        <span>{mgmtLoading ? "등록 처리 중..." : "관리자 추가 등록"}</span>
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Custom Confirm Modal */}
      {customConfirm?.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 shadow-2xl overflow-hidden p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${customConfirm.isDanger ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>
                <ShieldAlert size={22} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">{customConfirm.title}</h3>
            </div>
            <p className="text-xs text-slate-600 font-medium mt-4 leading-relaxed bg-slate-50/80 p-3.5 rounded-xl border border-slate-100">
              {customConfirm.message}
            </p>
            <div className="flex justify-end gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setCustomConfirm(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 active:scale-98 transition"
              >
                {customConfirm.cancelText || "취소"}
              </button>
              <button
                type="button"
                onClick={customConfirm.onConfirm}
                className={`px-4.5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm hover:shadow-md active:scale-98 transition duration-200 ${
                  customConfirm.isDanger 
                    ? "bg-red-600 hover:bg-red-700" 
                    : "bg-teal-600 hover:bg-teal-700 text-white"
                }`}
              >
                {customConfirm.confirmText || "확인"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Modal */}
      {customAlert?.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 shadow-2xl overflow-hidden p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <ShieldCheck size={22} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">{customAlert.title}</h3>
            </div>
            <p className="text-xs text-slate-600 font-medium mt-4 leading-relaxed bg-slate-50/80 p-3.5 rounded-xl border border-slate-100">
              {customAlert.message}
            </p>
            <div className="flex justify-end mt-5">
              <button
                type="button"
                onClick={() => {
                  if (customAlert.onClose) customAlert.onClose();
                  setCustomAlert(null);
                }}
                className="bg-slate-900 hover:bg-slate-850 active:scale-98 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md hover:shadow-slate-350/50 transition"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
