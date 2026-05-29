import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { COURSES_LIST } from '../courses';
import { ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

export default function DemandSurvey() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    // 기본정보
    companyName: '',
    representative: '',
    companyAddress: '',
    contactName: '',
    department: '',
    position: '',
    tel: '',
    mobile: '',
    fax: '',
    email: '',
    privacyConsent: false,

    // 1. 업체 일반현황
    q1_1: '', // 주된 업종
    q1_2: '', // 위치 지역
    q1_3: '', // 직원 수

    // 2. 훈련 수요조사
    q2_1: '', // 참여 경험
    q2_2: [] as string[], // 알게 된 경로 (복수선택)
    q2_3: '', // 훈련 필요성
    q2_4: '', // 필요한 이유
    q2_4_other: '', // 필요한 이유 (기타)
    q2_5: '', // 실습과 이론 비율
    q2_5_other: '', // 실습과 이론 비율 (기타)
    q2_6: '', // 결정 주체
    q2_6_other: '', // 결정 주체 (기타)
    q2_7: [] as string[], // 애로사항 (복수선택)
    q2_7_other: '', // 애로사항 (기타)
    q2_8: '', // 참여 의향

    // 3. 훈련 참여조사
    q3_1: '', // 교육원
    q3_2: '', // 선택 이유
    q3_2_other: '', // 선택 이유 (기타)
    q3_3: {} as Record<string, string[]>, // 참여 가능 과정 및 시기 { "course_1": ["2~4월", "8~11월"] }
    q3_4: [] as string[], // 주요 고려요인 (복수선택)
    q3_4_other: '', // 주요 고려요인 (기타)

    // 4. 산업현장
    q4_1: '', // 애로사항
    q4_1_other: '', // 애로사항 기타
    q4_2: '', // 해결 방법
    q4_2_other: '', // 해결 방법 기타
    q4_3: '', // 추가 개설 필요 과정 (주관식)
    q4_4: '', // 바라는 점 (주관식)
  });

  // Check if completed already (Disabled for testing to allow duplicate responses)
  const alreadyCompleted = false;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setErrorMessage('');
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleMultiCheckboxChange = (section: 'q2_2' | 'q2_7' | 'q3_4', val: string) => {
    setErrorMessage('');
    setFormData(prev => {
      const arr = prev[section] as string[];
      if (arr.includes(val)) {
        return { ...prev, [section]: arr.filter(item => item !== val) };
      } else {
        return { ...prev, [section]: [...arr, val] };
      }
    });
  };

  const handleCoursePeriodChange = (course: string, period: string) => {
    setErrorMessage('');
    setFormData(prev => {
      const q33 = prev.q3_3 as Record<string, string[]>;
      const coursePeriods = q33[course] || [];
      const updatedPeriods = coursePeriods.includes(period)
        ? coursePeriods.filter(p => p !== period)
        : [...coursePeriods, period];
      
      const newQ3_3 = { ...q33 };
      if (updatedPeriods.length > 0) {
        newQ3_3[course] = updatedPeriods;
      } else {
        delete newQ3_3[course];
      }
      return { ...prev, q3_3: newQ3_3 };
    });
  };

  // Branch jumping logic controls
  const isExperienced = formData.q2_1 === '훈련과정에 대해 알고 있으며 참여한 경험이 있다';
  const knowsButNoParticipation = formData.q2_1 === '훈련과정에 대해 알고 있으나 참여하지 않았다';
  const doesNotKnow = formData.q2_1 === '훈련과정에 대해 알지 못한다';

  const totalSteps = 6;

  const validateStep = () => {
    switch (step) {
      case 1:
        if (!formData.companyName.trim() || !formData.contactName.trim() || !formData.mobile.trim()) {
          return "회사명, 성명, 휴대폰 번호는 필수 입력사항입니다.";
        }
        if (!formData.privacyConsent) {
          return "개인정보 수집 및 동의서에 동의하셔야 설문 작성이 가능합니다.";
        }
        return "";
      case 2:
        if (!formData.q1_1 || !formData.q1_2 || !formData.q1_3) {
          return "모든 일반현황 질문에 답변해 주세요.";
        }
        return "";
      case 3:
        if (!formData.q2_1) {
          return "참여 경험을 선택해 주세요.";
        }
        return "";
      case 4:
        if (!formData.q2_3 || !formData.q2_4 || !formData.q2_5 || !formData.q2_6 || !formData.q2_8) {
          return "모든 필수 선택형 문항에 답해주세요.";
        }
        return "";
      case 5:
        if (!formData.q3_1 || !formData.q3_2) {
          return "선택형 참여조사 항목(교육원, 선택 이유)을 채워주십시오.";
        }
        if (Object.keys(formData.q3_3).length === 0) {
          return "참여 가능한 과정을 최소 1개 이상 골라주세요.";
        }
        return "";
      case 6:
        if (formData.q4_1 && !formData.q4_2) {
          return "4-1번 문항(어려움)을 선택하셨다면, 4-2번 문항(해결 방법)도 선택해 주세요.";
        }
        if (formData.q4_2 && !formData.q4_1) {
          return "4-2번 문항(해결 방법)을 선택하셨다면, 4-1번 문항(어려움)도 선택해 주세요.";
        }
        return "";
      default:
        return "";
    }
  };

  const validateAll = () => {
    // Stage 1
    if (!formData.companyName.trim() || !formData.contactName.trim() || !formData.mobile.trim()) {
      return "[1단계] 회사명, 성명, 휴대폰 번호는 필수 입력사항입니다.";
    }
    if (!formData.privacyConsent) {
      return "[1단계] 개인정보 수집 및 동의서에 동의하셔야 설문 작성이 가능합니다.";
    }

    // Stage 2
    if (!formData.q1_1 || !formData.q1_2 || !formData.q1_3) {
      return "[2단계] 모든 일반현황 질문에 답변해 주세요.";
    }

    // Stage 3
    if (!formData.q2_1) {
      return "[3단계] 참여 경험을 선택해 주세요.";
    }

    // Stage 4
    if (!formData.q2_3 || !formData.q2_4 || !formData.q2_5 || !formData.q2_6 || !formData.q2_8) {
      return "[4단계] 모든 필수 선택형 문항에 답해주세요.";
    }

    // Stage 5
    if (formData.q2_8 !== '1') {
      if (!formData.q3_1 || !formData.q3_2) {
        return "[5단계] 선택형 참여조사 항목(교육원, 선택 이유)을 채워주십시오.";
      }
      if (Object.keys(formData.q3_3).length === 0) {
        return "[5단계] 참여 가능한 과정을 최소 1개 이상 골라주세요.";
      }
    }

    // Stage 6
    if (formData.q4_1 && !formData.q4_2) {
      return "[6단계] 4-1번 문항(어려움)을 선택하셨다면, 4-2번 문항(해결 방법)도 선택해 주세요.";
    }
    if (formData.q4_2 && !formData.q4_1) {
      return "[6단계] 4-2번 문항(해결 방법)을 선택하셨다면, 4-1번 문항(어려움)도 선택해 주세요.";
    }

    return "";
  };

  const handleNext = () => {
    const error = validateStep();
    if (error) {
      setErrorMessage(error);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setErrorMessage('');

    if (step === 3) {
      setStep(4);
    } else if (step === 4) {
      if (formData.q2_8 === '1') {
        // Skip course selection (Step 5) if they have absolutely no intention to participate
        setStep(6);
      } else {
        setStep(5);
      }
    } else {
      setStep(prev => prev + 1);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrev = () => {
    setErrorMessage('');
    if (step === 6 && formData.q2_8 === '1') {
      setStep(4);
    } else {
      setStep(prev => prev - 1);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== totalSteps) {
      handleNext();
      return;
    }

    const error = validateStep();
    if (error) {
      setErrorMessage(error);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (alreadyCompleted) {
      setErrorMessage("이미 작성을 완료하신 설문입니다.");
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const submissionData = {
        ...formData,
        createdAt: serverTimestamp()
      };

      // Create document in Firestore collection 'surveys_demand'
      await addDoc(collection(db, 'surveys_demand'), submissionData);
      
      // Save completion flag
      localStorage.setItem('survey_completed_/survey/demand', 'true');
      setIsSubmitted(true);
    } catch (err) {
      console.error(err);
      try {
        handleFirestoreError(err, OperationType.CREATE, 'surveys_demand');
      } catch (adaptedError: any) {
        setErrorMessage(`제출 중 오류가 발생했습니다: ${adaptedError.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      if (e.target instanceof HTMLTextAreaElement) return;
      if (e.target instanceof HTMLButtonElement) return;
      if (e.target instanceof HTMLInputElement && e.target.type === 'submit') return;
      e.preventDefault();
    }
  };

  if (isSubmitted || alreadyCompleted) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
        <div className="bg-white max-w-lg w-full p-10 rounded-3xl border border-emerald-100 shadow-2xl text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-teal-500 to-emerald-600" />
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xs">
            <CheckCircle2 size={36} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">설문에 참여해 주셔서 대단히 감사합니다.</h2>
          <button
            onClick={() => navigate('/')}
            className="w-full mt-6 py-4.5 bg-teal-600 hover:bg-teal-700 active:scale-98 text-white rounded-xl font-extrabold text-sm shadow-md transition-all duration-200 cursor-pointer block border-none outline-none text-center active:scale-[0.98] min-h-[48px] break-keep"
          >
            통합 설문조사 포털 홈으로 이동
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-bg to-emerald-150 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg border border-emerald-100 overflow-hidden">
        {/* Banner */}
        <div className="bg-gradient-to-r from-primary-green to-emerald-700 text-white p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">2027년 컨소시엄 훈련 수요조사</h1>
          <p className="text-emerald-50/90 text-[11px] sm:text-xs font-light leading-relaxed mb-4">
            안녕하십니까?<br/>
            먼저 바쁘신 가운데 귀한 시간을 내어 설문에 응답해 주셔서 대단히 감사합니다.<br/>
            한국전기기술인협회 인적자원개발팀에서는 국가인적자원개발컨소시엄 사업의 협약기업 재직근로자들의 직무역량 강화를 위한 컨소시엄 훈련 로드맵 및 과정개발(개편)을 추진하고 있습니다.<br/>
            본 설문서는 직무별 컨소시엄 훈련의 필요성을 도출하여, 컨소시엄 훈련 과정개발(개편) 및 방향성 수립을 목적으로 진행하고 있습니다.<br/>
            본 수요조사결과는 향후 컨소시엄 훈련 과정개발에 매우 중요한 자료로 활용되며 수요조사 본래의 목적 이외에는 사용하지 않겠습니다. 수요조사 응답에는 약 10분 정도 소요됩니다.<br/>
            바쁘시더라도 성실하게 응답해주시면 감사하겠습니다.<br/><br/>
            한국전기기술인협회 교육원장 배상
          </p>
          <p className="text-emerald-50/90 text-[11px] sm:text-xs font-light leading-relaxed">
            ※ 본 조사와 관련된 문의나 의견이 있으시면 아래로 연락 주시기 바랍니다.<br/>
            &nbsp;&nbsp;□ 조사기관 : 한국전기기술인협회 교육원 인적자원개발팀(02-2182-0781~8)
          </p>
        </div>

        {/* Progress Tracker */}
        <div className="px-6 py-4 bg-emerald-50/50 border-b border-emerald-100 flex items-center justify-between text-xs sm:text-sm text-gray-500 font-medium">
          <div className="flex items-center gap-1.5 text-primary-green">
            <span className="w-6 h-6 rounded-full bg-primary-green text-white text-xs flex items-center justify-center font-bold">
              {step}
            </span>
            <span>단계 ({step} / {totalSteps})</span>
          </div>
          <div className="w-1/2 bg-gray-200 h-1.5 rounded-full overflow-hidden hidden sm:block">
            <div
              className="bg-primary-green h-1.5 transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
          <span className="text-gray-400">
            {step === 1 && "기본정보 및 동의"}
            {step === 2 && "업체 일반현황"}
            {step === 3 && "훈련 경험 분석"}
            {step === 4 && "상세 훈련 필요 분석"}
            {step === 5 && "세부 과정 희망"}
            {step === 6 && "제출 및 바라는 점"}
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={(e) => e.preventDefault()} onKeyDown={handleKeyDown} className="p-6 sm:p-10">
          
          {errorMessage && (
            <div className="p-4 mb-6 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-2">
              <AlertTriangle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: 기본정보 및 개인정보 사용 동의 */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <h3 className="text-lg font-bold text-gray-900">기본정보 입력</h3>
                <p className="text-xs text-gray-500">정확한 통계를 위해 기재해주십시오. (필수 기재 항목 체크)</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">회사명 *</label>
                  <input
                    type="text"
                    name="companyName"
                    required
                    value={formData.companyName}
                    onChange={handleChange}
                    className="w-full border border-gray-200 focus:border-primary-green focus:ring-1 focus:ring-primary-green outline-none py-2 px-3 rounded-lg text-sm"
                    placeholder="예: 주식회사 한국전력환경"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">대표자명</label>
                  <input
                    type="text"
                    name="representative"
                    value={formData.representative}
                    onChange={handleChange}
                    className="w-full border border-gray-200 focus:border-primary-green focus:ring-1 focus:ring-primary-green outline-none py-2 px-3 rounded-lg text-sm"
                    placeholder="예: 김전기"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">회사 소재지</label>
                  <input
                    type="text"
                    name="companyAddress"
                    value={formData.companyAddress}
                    onChange={handleChange}
                    className="w-full border border-gray-200 focus:border-primary-green focus:ring-1 focus:ring-primary-green outline-none py-2 px-3 rounded-lg text-sm"
                    placeholder="예: 경기도 안양시 동안구 시민대로"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">성명 *</label>
                  <input
                    type="text"
                    name="contactName"
                    required
                    value={formData.contactName}
                    onChange={handleChange}
                    className="w-full border border-gray-200 focus:border-primary-green focus:ring-1 focus:ring-primary-green outline-none py-2 px-3 rounded-lg text-sm"
                    placeholder="예: 홍길동"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">부서</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full border border-gray-200 focus:border-primary-green focus:ring-1 focus:ring-primary-green outline-none py-2 px-3 rounded-lg text-sm"
                    placeholder="예: 안전관리팀"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">직위</label>
                  <input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    className="w-full border border-gray-200 focus:border-primary-green focus:ring-1 focus:ring-primary-green outline-none py-2 px-3 rounded-lg text-sm"
                    placeholder="예: 과장"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">이메일</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full border border-gray-200 focus:border-primary-green focus:ring-1 focus:ring-primary-green outline-none py-2 px-3 rounded-lg text-sm"
                    placeholder="예: email@company.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">일반 전화 (Tel)</label>
                  <input
                    type="text"
                    name="tel"
                    value={formData.tel}
                    onChange={handleChange}
                    className="w-full border border-gray-200 focus:border-primary-green focus:ring-1 focus:ring-primary-green outline-none py-2 px-3 rounded-lg text-sm"
                    placeholder="예: 02-123-4567"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">휴대폰 번호 (Mobile) *</label>
                  <input
                    type="text"
                    name="mobile"
                    required
                    value={formData.mobile}
                    onChange={handleChange}
                    className="w-full border border-gray-200 focus:border-primary-green focus:ring-1 focus:ring-primary-green outline-none py-2 px-3 rounded-lg text-sm"
                    placeholder="예: 010-1234-5678"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">팩스 번호 (Fax)</label>
                  <input
                    type="text"
                    name="fax"
                    value={formData.fax}
                    onChange={handleChange}
                    className="w-full border border-gray-200 focus:border-primary-green focus:ring-1 focus:ring-primary-green outline-none py-2 px-3 rounded-lg text-sm"
                    placeholder="예: 02-123-4568"
                  />
                </div>
              </div>

              {/* Privacy agreement statement */}
              <div className="bg-emerald-50/50 rounded-xl p-5 border border-emerald-100 flex flex-col gap-3">
                <span className="font-bold text-xs text-green-900 block">개인정보 수집 및 동의서 (필수)</span>
                <p className="text-xs text-gray-600 leading-relaxed">
                  한국전기기술인협회는 개인정보 수집 및 이용 목적 외의 내용으로 개인정보를 활용하지 않습니다.
                </p>
                <label className="flex items-center gap-2 mt-2 cursor-pointer active:scale-[0.98] transition-all min-h-[44px] break-keep">
                  <input
                    type="checkbox"
                    name="privacyConsent"
                    checked={formData.privacyConsent}
                    onChange={handleChange}
                    className="w-4 h-4 text-primary-green focus:ring-primary-green border-gray-300 rounded flex-shrink-0"
                  />
                  <span className="text-xs font-bold text-gray-700">
                    개인정보 수집 및 이용에 동의합니다. *
                  </span>
                </label>
              </div>
            </motion.div>
          )}

          {/* STEP 2: 업체 일반현황 */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <h3 className="text-lg font-bold text-gray-900">1. 업체 일반현황</h3>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">1-1. 귀 사의 주된 업종은 무엇입니까?</label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {['설계', '감리', '안전관리', '진단·점검', '기타'].map(opt => (
                    <label
                      key={opt}
                      className={`flex items-center justify-center py-2.5 px-4 text-xs font-medium rounded-xl border cursor-pointer select-none transition ${
                        formData.q1_1 === opt
                          ? 'border-primary-green bg-emerald-50 text-emerald-800 ring-2 ring-primary-green/20'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="q1_1"
                        value={opt}
                        checked={formData.q1_1 === opt}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">1-2. 귀 사가 위치한 지역은 다음 중 어디에 해당됩니까?</label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    '수도권 (서울, 경기, 인천)',
                    '충청권 (충북, 충남, 대전, 세종)',
                    '강원권 (강원)',
                    '호남권 (전북, 전남, 광주)',
                    '영남권 (경북, 경남, 대구, 울산, 부산)',
                    '제주권 (제주)'
                  ].map((opt, i) => (
                    <label
                      key={opt}
                      className={`flex items-center justify-center py-3 px-3 text-xs font-bold rounded-xl border cursor-pointer select-none transition ${
                        formData.q1_2 === opt
                          ? 'border-primary-green bg-emerald-50 text-emerald-800 ring-2 ring-primary-green/20'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="q1_2"
                        value={opt}
                        checked={formData.q1_2 === opt}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <span>{['①','②','③','④','⑤','⑥'][i]} {opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">1-3. 귀 사의 직원 수는 다음 중 어디에 해당됩니까?</label>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  {['10명 미만', '10명~50명 미만', '50명~100명 미만', '100명~300명 미만', '300명 이상'].map(opt => (
                    <label
                      key={opt}
                      className={`flex items-center justify-center py-2.5 px-3 text-xs font-medium rounded-xl border cursor-pointer select-none transition ${
                        formData.q1_3 === opt
                          ? 'border-primary-green bg-emerald-50 text-emerald-800 ring-2 ring-primary-green/20'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="q1_3"
                        value={opt}
                        checked={formData.q1_3 === opt}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: 훈련 참여 경험 판단 (분기 게이트웨이) */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <h3 className="text-lg font-bold text-gray-900">2. 훈련 참여 경험 분석</h3>
                <p className="text-xs text-gray-500">이 문항의 응답 결과에 따라 최적화된 맞춤형 질문지로 인터페이스가 즉시 이동합니다.</p>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-bold text-gray-800">
                  2-1. 귀 사는 우리 협회의 컨소시엄 훈련과정에 참여한 경험이 있습니까?
                </label>

                <div className="flex flex-col gap-3 max-w-2xl mx-auto mt-4">
                  {[
                    { val: "훈련과정에 대해 알고 있으며 참여한 경험이 있다", prefix: "①" },
                    { val: "훈련과정에 대해 알고 있으나 참여하지 않았다", prefix: "②" },
                    { val: "훈련과정에 대해 알지 못한다", prefix: "③" }
                  ].map(opt => (
                    <label
                      key={opt.val}
                      className={`flex flex-col p-4 rounded-xl border cursor-pointer transition select-none ${
                        formData.q2_1 === opt.val
                          ? 'border-primary-green bg-emerald-50 ring-2 ring-primary-green/30 text-emerald-950'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="q2_1"
                          value={opt.val}
                          checked={formData.q2_1 === opt.val}
                          onChange={handleChange}
                          className="w-4 h-4 text-primary-green focus:ring-primary-green flex-shrink-0"
                        />
                        <span className="font-bold text-sm">{opt.prefix} {opt.val}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4: 상세 훈련 수요조사 */}
          {step === 4 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <h3 className="text-lg font-bold text-gray-900">2. 훈련 수요조사</h3>
                <p className="text-xs text-primary-green font-semibold">모든 응답자를 대상으로 상세 현황 조사를 이어갑니다.</p>
              </div>

              {/* Only show 2-2 details if they participated */}
              {isExperienced && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">2-2. 우리 협회의 컨소시엄 훈련과정은 어떻게 알게 되었습니까? (복수 선택 가능)</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {['회사 교육 담당자의 안내', '지인을 통한 안내와 추천', '협회 홈페이지 및 이메일 등 웹매체를 통해서', '협회지, 홍보 리플릿 등 우편물을 통해서'].map(opt => {
                      const isChecked = formData.q2_2.includes(opt);
                      return (
                        <label
                          key={opt}
                          className={`flex items-center gap-3 p-3 text-xs font-semibold rounded-xl border cursor-pointer select-none transition ${
                            isChecked
                              ? 'border-primary-green bg-emerald-50 text-emerald-800'
                              : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleMultiCheckboxChange('q2_2', opt)}
                            className="w-4 h-4 text-primary-green rounded border-gray-300 focus:ring-primary-green flex-shrink-0"
                          />
                          <span>{['①','②','③','④'][['회사 교육 담당자의 안내', '지인을 통한 안내와 추천', '협회 홈페이지 및 이메일 등 웹매체를 통해서', '협회지, 홍보 리플릿 등 우편물을 통해서'].indexOf(opt)]} {opt}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">2-3. 귀 사는 재직자에 대한 직무능력 향상 훈련이 어느 정도 필요하다고 생각하십니까?</label>
                <div className="grid grid-cols-5 gap-2">
                  {['매우 필요하다', '필요하다', '보통이다', '별로 필요하지 않다', '전혀 필요하지 않다'].map((opt, i) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setErrorMessage('');
                        setFormData(prev => ({ ...prev, q2_3: (5 - i).toString() }));
                      }}
                      className={`py-3 px-1 text-xs font-bold rounded-xl border transition ${
                        formData.q2_3 === (5 - i).toString()
                          ? 'bg-primary-green text-white border-primary-green'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {['①','②','③','④','⑤'][i]} {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">2-4. 귀 사는 재직자에 대한 직무능력 향상 훈련이 필요하다고 생각한 이유가 무엇입니까?</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {['담당 업무에 대한 기본 소양 확보', '담당 업무에 대한 실무능력향상', '담당 업무가 아닌 인접 업무로 확장', '강사 또는 수강생들과의 교류를 통해 정보 습득', '기타'].map((opt, i) => (
                      <label
                        key={opt}
                        className={`flex items-center gap-3 p-3 text-xs font-semibold rounded-xl border cursor-pointer select-none transition ${
                          formData.q2_4 === opt
                            ? 'border-primary-green bg-emerald-50 text-emerald-800'
                            : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name="q2_4"
                          value={opt}
                          checked={formData.q2_4 === opt}
                          onChange={handleChange}
                          className="w-4 h-4 text-primary-green focus:ring-primary-green flex-shrink-0"
                        />
                        <span>{['①','②','③','④','⑤'][i]} {opt}</span>
                      </label>
                    ))}
                  </div>
                  {formData.q2_4 === '기타' && (
                    <input
                      type="text"
                      name="q2_4_other"
                      value={formData.q2_4_other || ''}
                      onChange={handleChange}
                      placeholder="기타 이유를 자유롭게 작성해 주세요."
                      className="mt-2 w-full border border-gray-200 focus:border-primary-green focus:ring-1 focus:ring-primary-green outline-none py-2 px-3 rounded-lg text-sm"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">2-5. 귀 사에서 직무능력향상훈련에 참여한다면 실습훈련과 이론강의 비율은 어느 정도가 적당하다고 생각하십니까?</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                    {['실습(40) : 이론(60)', '실습(50) : 이론(50)', '실습(60) : 이론(40)', '실습(70) : 이론(30)', '기타'].map((opt, i) => (
                      <label
                        key={opt}
                        className={`flex flex-col items-center justify-center p-2.5 text-xs font-semibold rounded-xl border cursor-pointer select-none transition ${
                          formData.q2_5 === opt
                            ? 'border-primary-green bg-emerald-50 text-emerald-800'
                            : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name="q2_5"
                          value={opt}
                          checked={formData.q2_5 === opt}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <span>{['①','②','③','④','⑤'][i]} {opt}</span>
                      </label>
                    ))}
                  </div>
                  {formData.q2_5 === '기타' && (
                    <input
                      type="text"
                      name="q2_5_other"
                      value={formData.q2_5_other}
                      onChange={handleChange}
                      placeholder="기타 비율을 자유롭게 작성해 주세요. (예: 실습 80 : 이론 20)"
                      className="mt-2 w-full border border-gray-200 focus:border-primary-green focus:ring-1 focus:ring-primary-green outline-none py-2 px-3 rounded-lg text-sm"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">2-6. 귀 사에서 훈련 참여 여부는 주로 누구에 의해 결정됩니까?</label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {['인사/교육 담당 부서', '대표자 또는 경영진', '현업 부서장', '개인(근로자 본인)', '기타'].map((opt, i) => (
                    <label
                      key={opt}
                      className={`flex flex-col items-center justify-center p-2.5 text-xs font-medium rounded-xl border cursor-pointer select-none transition ${
                        formData.q2_6 === opt
                          ? 'border-primary-green bg-emerald-50 text-emerald-800'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="q2_6"
                        value={opt}
                        checked={formData.q2_6 === opt}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <span>{['①','②','③','④','⑤'][i]} {opt}</span>
                    </label>
                  ))}
                </div>
                {formData.q2_6 === '기타' && (
                  <input
                    type="text"
                    name="q2_6_other"
                    value={formData.q2_6_other}
                    onChange={handleChange}
                    placeholder="기타 의견을 자유롭게 작성해 주세요."
                    className="mt-2 w-full border border-gray-200 focus:border-primary-green focus:ring-1 focus:ring-primary-green outline-none py-2 px-3 rounded-lg text-sm"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">2-7. 귀 사에서 훈련참여 시 가장 큰 애로사항은 무엇이라고 생각하십니까? (복수 선택 가능)</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    '대체인력 부족',
                    '일정 조정 어려움',
                    '훈련과정 정보 부족',
                    '경영층의 인식 부족',
                    '비용 부담',
                    '기타'
                  ].map((opt, i) => {
                    const isChecked = formData.q2_7.includes(opt);
                    return (
                      <label
                        key={opt}
                        className={`flex items-center gap-3 p-3 text-xs font-semibold rounded-xl border cursor-pointer select-none transition ${
                          isChecked
                            ? 'border-primary-green bg-emerald-50 text-emerald-800'
                            : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleMultiCheckboxChange('q2_7', opt)}
                          className="w-4 h-4 text-primary-green rounded border-gray-300 focus:ring-primary-green flex-shrink-0"
                        />
                        <span>{['①','②','③','④','⑤','⑥'][i]} {opt}</span>
                      </label>
                    );
                  })}
                </div>
                {formData.q2_7.includes('기타') && (
                  <input
                    type="text"
                    name="q2_7_other"
                    value={formData.q2_7_other}
                    onChange={handleChange}
                    placeholder="기타 의견을 자유롭게 작성해 주세요."
                    className="mt-2 w-full border border-gray-200 focus:border-primary-green focus:ring-1 focus:ring-primary-green outline-none py-2 px-3 rounded-lg text-sm"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">2-8. 귀 사는 향후 우리 협회의 컨소시엄 훈련과정에 참여할 의향은 어느 정도입니까?</label>
                <div className="grid grid-cols-5 gap-2">
                  {['매우 있다', '있다', '보통이다', '없다', '전혀 없다'].map((opt, i) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setErrorMessage('');
                        setFormData(prev => ({ ...prev, q2_8: (5 - i).toString() }));
                      }}
                      className={`py-3 px-1 text-xs font-bold rounded-xl border transition ${
                        formData.q2_8 === (5 - i).toString()
                          ? 'bg-primary-green text-white border-primary-green'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {['①','②','③','④','⑤'][i]} {opt}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 5: 3. 훈련 참여조사 (30개 세부 체크박스 등) */}
          {step === 5 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <h3 className="text-lg font-bold text-gray-900">3. 훈련 참여조사</h3>
                <p className="text-xs text-gray-500">실제 실무에서 필요한 기술, 교육원 정보 및 상세 과정을 기재하는 페이지입니다.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">3-1. 귀 사에서 훈련참여 시 어느 교육원으로 훈련신청을 하시겠습니까?</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {['중앙교육원(경기도 안양시)', '영남교육원(부산광역시)', '호남교육원(광주광역시)'].map((opt, i) => (
                      <label
                        key={opt}
                        className={`flex flex-col items-center justify-center p-2.5 text-xs font-semibold rounded-xl border cursor-pointer select-none transition ${
                          formData.q3_1 === opt
                            ? 'border-primary-green bg-emerald-50 text-emerald-800'
                            : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name="q3_1"
                          value={opt}
                          checked={formData.q3_1 === opt}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <span>{['①','②','③'][i]} {opt}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">3-2. 해당 교육원을 선택한 이유는 무엇입니까?</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {['접근성(거리·교통)', '교육시설 및 환경', '희망 과정 운영', '업무와의 연계성', '기타'].map((opt, i) => (
                      <label
                        key={opt}
                        className={`flex items-center gap-3 p-3 text-xs font-semibold rounded-xl border cursor-pointer select-none transition ${
                          formData.q3_2 === opt
                            ? 'border-primary-green bg-emerald-50 text-emerald-800'
                            : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name="q3_2"
                          value={opt}
                          checked={formData.q3_2 === opt}
                          onChange={handleChange}
                          className="w-4 h-4 text-primary-green focus:ring-primary-green flex-shrink-0"
                        />
                        <span>{['①','②','③','④','⑤'][i]} {opt}</span>
                      </label>
                    ))}
                  </div>
                  {formData.q3_2 === '기타' && (
                    <input
                      type="text"
                      name="q3_2_other"
                      value={formData.q3_2_other}
                      onChange={handleChange}
                      placeholder="기타 의견을 자유롭게 작성해 주세요."
                      className="mt-2 w-full border border-gray-200 focus:border-primary-green focus:ring-1 focus:ring-primary-green outline-none py-2 px-3 rounded-lg text-sm"
                    />
                  )}
                </div>
              </div>

              {/* 30 Courses Checkboxes (Matrix) */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  3-3. 우리 협회에서 2026년도 개설되어 진행하고 있는 아래 훈련과정 중, 훈련 참여가 가능한 과정과 그 시기는 어떻게 되십니까? (복수 선택 가능) *
                </label>
                <p className="text-xs text-emerald-600 mb-3 font-semibold">※ 최소 1개 이상의 과정-시기를 체크해 주십시오.</p>

                <div className="hidden md:block overflow-x-auto bg-white border border-gray-200 rounded-xl mb-6 shadow-sm">
                  <table className="w-full text-xs text-left min-w-[600px]">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-700">
                      <tr>
                        <th className="px-4 py-3 font-extrabold border-r border-gray-200 w-24 text-center tracking-wider">분류</th>
                        <th className="px-3 py-3 font-extrabold border-r border-gray-200 w-12 text-center tracking-wider">No.</th>
                        <th className="px-5 py-3 font-extrabold border-r border-gray-200 tracking-wider">훈련과정명</th>
                        <th className="px-3 py-3 font-extrabold text-center w-64 tracking-wider">참여 가능 시기 (복수선택)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 font-medium">
                      {COURSES_LIST.map((course, idx) => {
                        const q33 = formData.q3_3 as Record<string, string[]>;
                        const selectedPeriods = q33[course] || [];
                        const isCourseSelected = selectedPeriods.length > 0;
                        
                        return (
                          <tr key={course} className={`hover:bg-emerald-50/50 transition duration-150 ${isCourseSelected ? 'bg-emerald-50/30' : ''}`}>
                            {idx === 0 && (
                              <td rowSpan={14} className="px-4 py-3 border-r border-gray-200 text-center font-extrabold text-gray-900 bg-gray-50/80 align-middle shadow-[inset_0_1px_rgba(0,0,0,0.02)]">
                                정부전략
                              </td>
                            )}
                            {idx === 14 && (
                              <td rowSpan={16} className="px-4 py-3 border-r border-b-0 border-gray-200 text-center font-extrabold text-blue-900 bg-blue-50/80 align-middle shadow-[inset_0_1px_rgba(0,0,0,0.02)]">
                                대중소상생
                              </td>
                            )}
                            <td className="px-3 py-3 border-r border-gray-200 text-center text-gray-500 font-semibold">{idx + 1}</td>
                            <td className={`px-5 py-3 border-r border-gray-200 font-bold ${isCourseSelected ? 'text-emerald-900' : 'text-gray-800'}`}>
                              {course}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex justify-center gap-1.5">
                                {['2~4월', '5~7월', '8~11월'].map(period => {
                                  const isChecked = selectedPeriods.includes(period);
                                  return (
                                    <label
                                      key={period}
                                      className={`flex-1 flex justify-center items-center py-2 rounded-lg border text-[10px] cursor-pointer font-bold transition-all duration-200 select-none ${
                                        isChecked
                                          ? 'bg-primary-green text-white border-primary-green shadow-sm'
                                          : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => handleCoursePeriodChange(course, period)}
                                        className="sr-only"
                                      />
                                      <span>{period}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View */}
                <div className="md:hidden flex flex-col space-y-3 mb-6">
                  {COURSES_LIST.map((course, idx) => {
                    const q33 = formData.q3_3 as Record<string, string[]>;
                    const selectedPeriods = q33[course] || [];
                    const isCourseSelected = selectedPeriods.length > 0;
                    
                    return (
                      <div key={course} className={`p-4 border rounded-xl shadow-sm transition-all duration-200 ${isCourseSelected ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-gray-200'}`}>
                        <div className="mb-2 flex items-start justify-between">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold text-white ${idx < 14 ? 'bg-gray-800' : 'bg-blue-800'}`}>
                            {idx < 14 ? '정부전략' : '대중소상생'}
                          </span>
                          <span className="text-gray-400 font-bold text-[10px]">No. {idx + 1}</span>
                        </div>
                        <h4 className={`text-[13px] font-bold mb-3 ${isCourseSelected ? 'text-emerald-900' : 'text-gray-800'}`}>{course}</h4>
                        
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {['2~4월', '5~7월', '8~11월'].map(period => {
                            const isChecked = selectedPeriods.includes(period);
                            return (
                              <label
                                key={period}
                                className={`flex items-center justify-center py-2.5 rounded-lg border text-xs cursor-pointer font-bold transition-all duration-200 active:scale-[0.95] select-none ${
                                  isChecked
                                    ? 'bg-primary-green text-white border-primary-green shadow-sm'
                                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleCoursePeriodChange(course, period)}
                                  className="sr-only"
                                />
                                <span>{period}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">3-4. 귀 사에서 훈련 참여 여부를 결정할 때 주요 고려요인은 무엇입니까? (복수 선택 가능)</label>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                  {['훈련 내용의 적합성', '업무와의 연관성', '훈련 일정', '비용 지원 여부', '훈련기관 인지도', '기타'].map((opt, i) => {
                    const isChecked = formData.q3_4.includes(opt);
                    return (
                      <label
                        key={opt}
                        className={`flex flex-col items-center justify-center p-3 text-center text-xs font-semibold rounded-xl border cursor-pointer select-none transition h-16 ${
                          isChecked
                            ? 'border-primary-green bg-emerald-50 text-emerald-800 ring-1 ring-primary-green'
                            : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleMultiCheckboxChange('q3_4', opt)}
                          className="w-4 h-4 text-primary-green rounded border-gray-300 focus:ring-primary-green mb-1.5 flex-shrink-0"
                        />
                        <span className="leading-tight text-[10px]">{['①','②','③','④','⑤','⑥'][i]} {opt}</span>
                      </label>
                    );
                  })}
                </div>
                {formData.q3_4.includes('기타') && (
                  <input
                    type="text"
                    name="q3_4_other"
                    value={formData.q3_4_other}
                    onChange={handleChange}
                    placeholder="기타 의견을 자유롭게 작성해 주세요."
                    className="mt-2 w-full border border-gray-200 focus:border-primary-green focus:ring-1 focus:ring-primary-green outline-none py-2 px-3 rounded-lg text-sm"
                  />
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 6: 4. 산업현장 */}
          {step === 6 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <h3 className="text-lg font-bold text-gray-900">4. 산업현장</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">4-1. 귀 사의 전기직무 종사자들이 현장업무를 진행함에 있어 어떠한 어려움이 있습니까?</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                    {['교육훈련 부족', '실무 기술역량 부족', '업무 매뉴얼 부족', '최신 기술 대응 부족', '기타'].map((opt, i) => (
                      <label
                        key={opt}
                        className={`flex flex-col items-center justify-center p-2.5 text-xs font-semibold rounded-xl border cursor-pointer select-none transition ${
                          formData.q4_1 === opt
                            ? 'border-primary-green bg-emerald-50 text-emerald-800'
                            : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name="q4_1"
                          value={opt}
                          checked={formData.q4_1 === opt}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <span>{['①','②','③','④','⑤'][i]} {opt}</span>
                      </label>
                    ))}
                  </div>
                  {formData.q4_1 === '기타' && (
                    <input
                      type="text"
                      name="q4_1_other"
                      value={formData.q4_1_other || ''}
                      onChange={handleChange}
                      placeholder="기타 의견을 자유롭게 작성해 주세요."
                      className="mt-2 w-full border border-gray-200 focus:border-primary-green focus:ring-1 focus:ring-primary-green outline-none py-2 px-3 rounded-lg text-sm"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">4-2. 위에서 선택한 어려움을 해소하기 위해 귀 사의 해결 방법은 무엇입니까?</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                    {['교육‧기술세미나 참석', '사내 교육 실시', '업무 매뉴얼 체계 구축', '외부 전문기관 교육 위탁', '기타'].map((opt, i) => (
                      <label
                        key={opt}
                        className={`flex flex-col items-center justify-center p-2.5 text-xs font-semibold rounded-xl border cursor-pointer select-none transition text-center ${
                          formData.q4_2 === opt
                            ? 'border-primary-green bg-emerald-50 text-emerald-800'
                            : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name="q4_2"
                          value={opt}
                          checked={formData.q4_2 === opt}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <span>{['①','②','③','④','⑤'][i]} {opt}</span>
                      </label>
                    ))}
                  </div>
                  {formData.q4_2 === '기타' && (
                    <input
                      type="text"
                      name="q4_2_other"
                      value={formData.q4_2_other || ''}
                      onChange={handleChange}
                      placeholder="기타 의견을 자유롭게 작성해 주세요."
                      className="mt-2 w-full border border-gray-200 focus:border-primary-green focus:ring-1 focus:ring-primary-green outline-none py-2 px-3 rounded-lg text-sm"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">4-3. 위 과정 외에도 추가로 개설이 필요하다고 생각되는 훈련과정은 무엇입니까?</label>
                  <textarea
                    name="q4_3"
                    value={formData.q4_3}
                    onChange={handleChange}
                    rows={3}
                    className="w-full border border-gray-200 focus:border-primary-green outline-none p-3 rounded-lg text-xs"
                    placeholder="주관식으로 자유롭게 응답"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">4-4. 협회 컨소시엄 훈련에 바라는 점이 있다면 자유롭게 서술하여 주시기 바랍니다.</label>
                  <textarea
                    name="q4_4"
                    value={formData.q4_4}
                    onChange={handleChange}
                    rows={3}
                    className="w-full border border-gray-200 focus:border-primary-green outline-none p-3 rounded-lg text-xs"
                    placeholder="주관식으로 자유롭게 응답"
                  />
                </div>
              </div>


            </motion.div>
          )}

          {/* Navigation Controls buttons */}
          <div className="flex justify-between items-center pt-8 border-t border-gray-100 mt-10">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrev}
                className="flex items-center gap-1 bg-gray-150 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg text-xs font-bold transition"
              >
                <ChevronLeft size={16} />
                <span>이전</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/')}
                className="text-gray-400 hover:text-gray-600 font-bold text-xs"
              >
                포털 홈으로 돌아가기
              </button>
            )}

            {step < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1 bg-primary-green text-white hover:bg-primary-green-hover px-5 py-2.5 rounded-lg text-xs font-bold shadow-xs transition"
              >
                <span>다음 단계</span>
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !!validateStep()}
                className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-300 disabled:hover:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg text-xs font-bold tracking-wider shadow-sm transition"
              >
                <span>설문지 최종 제출하기</span>
                {loading ? <span className="animate-spin text-[10px]">■</span> : <ArrowRight size={16} />}
              </button>
            )}
          </div>

        </form>
      </div>
    </div>
  );
}
