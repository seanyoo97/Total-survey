import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

export default function FgiSurvey() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    // [기업정보]
    interviewDate: '',
    companyName: '',
    companyType: '', // 대규모 / 우선지원
    companyAddressCity: '',
    companyAddressDistrict: '',
    industry: '', // 설계 / 감리 / 안전관리 / 기타
    industry_other: '',
    contactName: '',
    department: '',
    position: '',
    tel: '',
    email: '',

    // [1. 기업 현황]
    q1_1: '', 
    q1_2: '', 
    q1_3: [] as string[], 
    q1_3_other: '',

    // [2. 재직근로자 직무역량 및 훈련수요]
    q2_1: '', 
    q2_2: '', 
    q2_3: '', 
    q2_4: [] as string[], 
    q2_4_other: '',
    q2_5: '', // completely subjective text

    // [3. 컨소시엄 훈련 참여 여건]
    q3_1: [] as string[], 
    q3_1_other: '',
    q3_2: [] as string[], 
    q3_2_other: '',
    q3_3: '', 
    q3_4: [] as string[], 
    q3_5: '', 

    // [4. 희망 컨소시엄 훈련 운영 개선 의견]
    q4_1: '', 
    q4_2: [] as string[], 
    q4_2_other: '',
    q4_3: '', 
  });

  // Disabled for testing to allow duplicate responses
  const alreadyCompleted = false;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMultiCheckboxChange = (section: 'q1_3' | 'q2_4' | 'q3_1' | 'q3_2' | 'q3_4' | 'q4_2', val: string) => {
    setFormData(prev => {
      const arr = prev[section] as string[];
      if (arr.includes(val)) {
        return { ...prev, [section]: arr.filter(item => item !== val) };
      } else {
        return { ...prev, [section]: [...arr, val] };
      }
    });
  };

  const totalSteps = 4;

  const validateStep = () => {
    switch (step) {
      case 1:
        if (!formData.companyName.trim() || !formData.companyType || !formData.industry || !formData.contactName.trim() || !formData.tel.trim() || !formData.interviewDate) {
          return "필수 정보(면담일시, 업체명, 업체형태, 주업종, 담당자, 연락처 등)를 모두 기입해주세요.";
        }
        if (formData.industry === '기타' && !formData.industry_other.trim()) {
          return "주업종 '기타'의 상세 내용을 입력해주세요.";
        }
        return "";
      case 2:
        if (!formData.q1_1 || !formData.q1_2 || formData.q1_3.length === 0 || !formData.q2_1 || !formData.q2_2 || !formData.q2_3 || formData.q2_4.length === 0 || !formData.q2_5.trim()) {
          return "모든 문항에 답변해 주세요.";
        }
        if (formData.q1_3.includes('기타') && !formData.q1_3_other.trim()) return "1-3 '기타'의 상세 내용을 입력해주세요.";
        if (formData.q2_4.includes('기타') && !formData.q2_4_other.trim()) return "2-4 '기타'의 상세 내용을 입력해주세요.";
        return "";
      case 3:
        if (formData.q3_1.length === 0 || formData.q3_2.length === 0 || !formData.q3_3 || formData.q3_4.length === 0 || !formData.q3_5) {
          return "모든 문항에 답변해 주세요.";
        }
        if (formData.q3_1.includes('기타') && !formData.q3_1_other.trim()) return "3-1 '기타'의 상세 내용을 입력해주세요.";
        if (formData.q3_2.includes('기타') && !formData.q3_2_other.trim()) return "3-2 '기타'의 상세 내용을 입력해주세요.";
        return "";
      case 4:
        if (!formData.q4_1 || formData.q4_2.length === 0) {
          return "모든 객관식 필수 문항에 답변해 주세요.";
        }
        if (formData.q4_2.includes('기타') && !formData.q4_2_other.trim()) {
          return "4-2 '기타'의 상세 내용을 입력해주세요.";
        }
        return "";
      default:
        return "";
    }
  };

  const validateAll = () => {
    // Stage 1
    if (!formData.companyName.trim() || !formData.companyType || !formData.industry || !formData.contactName.trim() || !formData.tel.trim() || !formData.interviewDate) {
      return "[1단계] 필수 정보(면담일시, 업체명, 업체형태, 주업종, 담당자, 연락처 등)를 모두 기입해주세요.";
    }
    if (formData.industry === '기타' && !formData.industry_other.trim()) {
      return "[1단계] 주업종 '기타'의 상세 내용을 입력해주세요.";
    }

    // Stage 2
    if (!formData.q1_1 || !formData.q1_2 || formData.q1_3.length === 0 || !formData.q2_1 || !formData.q2_2 || !formData.q2_3 || formData.q2_4.length === 0 || !formData.q2_5.trim()) {
      return "[2단계] 모든 문항에 답변해 주세요.";
    }
    if (formData.q1_3.includes('기타') && !formData.q1_3_other.trim()) return "[2단계] 1-3 '기타'의 상세 내용을 입력해주세요.";
    if (formData.q2_4.includes('기타') && !formData.q2_4_other.trim()) return "[2단계] 2-4 '기타'의 상세 내용을 입력해주세요.";

    // Stage 3
    if (formData.q3_1.length === 0 || formData.q3_2.length === 0 || !formData.q3_3 || formData.q3_4.length === 0 || !formData.q3_5) {
      return "[3단계] 모든 문항에 답변해 주세요.";
    }
    if (formData.q3_1.includes('기타') && !formData.q3_1_other.trim()) return "[3단계] 3-1 '기타'의 상세 내용을 입력해주세요.";
    if (formData.q3_2.includes('기타') && !formData.q3_2_other.trim()) return "[3단계] 3-2 '기타'의 상세 내용을 입력해주세요.";

    // Stage 4
    if (!formData.q4_1 || formData.q4_2.length === 0) {
      return "[4단계] 모든 객관식 필수 문항에 답변해 주세요.";
    }
    if (formData.q4_2.includes('기타') && !formData.q4_2_other.trim()) {
      return "[4단계] 4-2 '기타'의 상세 내용을 입력해주세요.";
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
    setStep(prev => prev + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrev = () => {
    setErrorMessage('');
    setStep(prev => prev - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== totalSteps) {
      handleNext();
      return;
    }

    const error = validateAll();
    if (error) {
      setErrorMessage(error);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (alreadyCompleted) {
      setErrorMessage("이미 종료된 FGI 입니다.");
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      // Process "기타" values into strings
      const payloadIndustry = formData.industry === '기타' && formData.industry_other ? `기타(${formData.industry_other})` : formData.industry;
      const processArray = (arr: string[], otherVal: string) => arr.map(v => v === '기타' && otherVal ? `기타(${otherVal})` : v);

      const submissionData = {
        ...formData,
        industry: payloadIndustry,
        q1_3: processArray(formData.q1_3, formData.q1_3_other),
        q2_4: processArray(formData.q2_4, formData.q2_4_other),
        q3_1: processArray(formData.q3_1, formData.q3_1_other),
        q3_2: processArray(formData.q3_2, formData.q3_2_other),
        q4_2: processArray(formData.q4_2, formData.q4_2_other),
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'surveys_fgi'), submissionData);
      localStorage.setItem('survey_completed_/survey/fgi', 'true');
      setIsSubmitted(true);
    } catch (err) {
      console.error(err);
      try {
        handleFirestoreError(err, OperationType.CREATE, 'surveys_fgi');
      } catch (adaptedError: any) {
        setErrorMessage(`전이 반영 중 에러: ${adaptedError.message}`);
      }
    } finally {
      setLoading(false);
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
          <p className="text-gray-500 mb-8 text-xs leading-relaxed font-light whitespace-pre-line px-2 text-center">
            답변해 주신 소중한 데이터는 저희 공동훈련센터 교육 과정 발전과 신규 교과 설계 분석을 위한 소중한 밑거름이 될 것입니다.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-4.5 bg-teal-600 hover:bg-teal-700 active:scale-98 text-white rounded-xl font-extrabold text-sm shadow-md transition-all duration-200 cursor-pointer block border-none outline-none text-center"
            style={{ display: 'block', visibility: 'visible', opacity: 1, color: '#ffffff', backgroundColor: '#0d9488' }}
          >
            통합 설문조사 포털 홈으로 이동
          </button>
        </div>
      </div>
    );
  }

  const levels = [
    "① 직무 기초 이해 수준",
    "② 기본 실무 수행 수준",
    "③ 독립 업무 수행 수준",
    "④ 현장 문제 해결 수준",
    "⑤ 전문기술 활용 및 지도 수준"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-bg to-emerald-150 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg border border-emerald-100 overflow-hidden">
        {/* Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-800 text-white p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">컨소시엄 협약업체 FGI(Focus Group Interview)</h1>
        </div>

        {/* Progress Tracker */}
        <div className="px-6 py-4 bg-emerald-50/50 border-b border-emerald-100 flex items-center justify-between text-xs sm:text-sm text-gray-500 font-medium font-semibold">
          <div className="flex items-center gap-1.5 text-primary-green">
            <span className="w-6 h-6 rounded-full bg-emerald-700 text-white text-xs flex items-center justify-center font-bold">
              {step}
            </span>
            <span>단계 ({step} / {totalSteps})</span>
          </div>
          <span className="text-gray-400">
            {step === 1 && "1. 기업 기본 정보"}
            {step === 2 && "2. 기업현황 및 재직근로자 직무역량 및 훈련수요"}
            {step === 3 && "3. 컨소시엄 훈련 참여 여건"}
            {step === 4 && "4. 협회 컨소시엄 훈련 운영 개선 의견"}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-10">
          {errorMessage && (
            <div className="p-4 mb-6 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-2">
              <AlertTriangle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: 기업정보 */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-lg font-bold text-gray-900">기업정보</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">면담일시 (Date) *</label>
                  <input
                    type="date"
                    name="interviewDate"
                    required
                    value={formData.interviewDate}
                    onChange={handleChange}
                    className="w-full border border-gray-200 focus:border-emerald-600 outline-none py-2 px-3 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">업체명 *</label>
                  <input
                    type="text"
                    name="companyName"
                    required
                    value={formData.companyName}
                    onChange={handleChange}
                    className="w-full border border-gray-200 focus:border-emerald-600 outline-none py-2 px-3 rounded-lg text-xs"
                    placeholder="회사명을 작성해 주세요"
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
                    className="w-full border border-gray-200 focus:border-emerald-600 outline-none py-2 px-3 rounded-lg text-xs"
                    placeholder="담당자 성명"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">부서</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full border border-gray-200 focus:border-emerald-600 outline-none py-2 px-3 rounded-lg text-xs"
                    placeholder="부서명"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">직위</label>
                  <input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    className="w-full border border-gray-200 focus:border-emerald-600 outline-none py-2 px-3 rounded-lg text-xs"
                    placeholder="예: 부장"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">회사소재지 (시/도) *</label>
                  <input
                    type="text"
                    name="companyAddressCity"
                    required
                    value={formData.companyAddressCity}
                    onChange={handleChange}
                    className="w-full border border-gray-200 focus:border-emerald-600 outline-none py-2 px-3 rounded-lg text-xs"
                    placeholder="예: 서울, 경기, 부산 등"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">회사소재지 (시/군/구) *</label>
                  <input
                    type="text"
                    name="companyAddressDistrict"
                    required
                    value={formData.companyAddressDistrict}
                    onChange={handleChange}
                    className="w-full border border-gray-200 focus:border-emerald-600 outline-none py-2 px-3 rounded-lg text-xs"
                    placeholder="예: 강남구, 안양시 등"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">연락처 *</label>
                  <input
                    type="text"
                    name="tel"
                    required
                    value={formData.tel}
                    onChange={handleChange}
                    className="w-full border border-gray-200 focus:border-emerald-600 outline-none py-2 px-3 rounded-lg text-xs"
                    placeholder="대표 전화"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full border border-gray-200 focus:border-emerald-600 outline-none py-2 px-3 rounded-lg text-xs"
                    placeholder="contact@email.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">업체 형태 *</label>
                  <div className="flex gap-4">
                    {['대규모기업', '우선지원기업'].map(opt => (
                      <label key={opt} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                        <input
                          type="radio"
                          name="companyType"
                          value={opt}
                          checked={formData.companyType === opt}
                          onChange={handleChange}
                          className="w-4 h-4 text-emerald-600"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">주업종 *</label>
                  <div className="flex flex-wrap gap-3">
                    {['설계', '감리', '안전관리', '기타'].map(opt => (
                      <div key={opt} className="flex items-center gap-2">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                          <input
                            type="radio"
                            name="industry"
                            value={opt}
                            checked={formData.industry === opt}
                            onChange={handleChange}
                            className="w-4 h-4 text-emerald-600"
                          />
                          <span>{opt}</span>
                        </label>
                        {opt === '기타' && formData.industry === '기타' && (
                          <input
                            type="text"
                            name="industry_other"
                            value={formData.industry_other}
                            onChange={handleChange}
                            className="border border-gray-200 focus:border-emerald-600 outline-none px-2 py-1 flex-1 min-w-[120px] rounded text-xs"
                            placeholder="내용을 입력해주세요"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: 기업현황 세부 및 주업무 */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-lg font-bold text-gray-900">1. 기업 현황 및 2. 재직근로자 직무역량 및 훈련수요</h3>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">1-1. 귀사의 전기관련 재직근로자 수는 몇 명입니까?</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['1~5명', '6~10명', '11~20명', '21~50명', '51명 이상'].map(opt => (
                      <label
                        key={opt}
                        className={`flex items-center justify-center p-2.5 text-xs font-semibold rounded-xl border cursor-pointer transition text-center ${
                          formData.q1_1 === opt ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-gray-200 hover:bg-gray-50'
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
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">1-2. 귀사의 전기직무 재직근로자 경력 분포는 어떠합니까?</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {['3년 이하 근로자 중심', '4~6년 경력자 중심', '7년 이상 숙련자 중심', '고르게 분포'].map(opt => (
                      <label
                        key={opt}
                        className={`flex items-center justify-center p-2.5 text-xs font-semibold rounded-xl border cursor-pointer transition text-center ${
                          formData.q1_2 === opt ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-gray-200 hover:bg-gray-50'
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
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">1-3. 귀사의 전기직무 재직근로자의 주요 수행 업무는 무엇입니까? (복수선택) *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    '전기안전관리',
                    '전력시설물 설계',
                    '전력시설물 감리',
                    '전기공사 시공관리',
                    '수배전설비 운영',
                    '자동제어ㆍPLC',
                    '전기설비 진단ㆍ점검',
                    '기타'
                  ].map(opt => {
                    const isChecked = formData.q1_3.includes(opt);
                    return (
                      <div key={opt} className={`flex flex-col gap-1 p-3 rounded-xl border transition ${
                          isChecked ? 'border-emerald-600 bg-emerald-50' : 'border-gray-200 hover:bg-gray-50'
                        }`}>
                        <label
                          className={`flex items-center gap-2 text-xs font-semibold cursor-pointer select-none ${
                            isChecked ? 'text-emerald-800' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleMultiCheckboxChange('q1_3', opt)}
                            className="w-4 h-4 text-emerald-600 shrink-0"
                          />
                          <span>{opt}</span>
                        </label>
                        {opt === '기타' && isChecked && (
                          <input
                            type="text"
                            name="q1_3_other"
                            value={formData.q1_3_other}
                            onChange={handleChange}
                            className="mt-1 w-full border border-emerald-300 focus:border-emerald-600 outline-none px-2 py-1 rounded text-xs bg-white"
                            placeholder="내용을 입력해주세요"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">2-1. 귀사의 전기직무 재직근로자 중 가장 교육 수요가 높은 대상은 누구입니까?</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['저연차(3년 이하)', '중간연차(4~10년)', '고연차(11년 이상)'].map(opt => (
                      <label
                        key={opt}
                        className={`flex items-center justify-center p-3 text-xs font-semibold rounded-xl border cursor-pointer transition ${
                          formData.q2_1 === opt ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-gray-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="q2_1"
                          value={opt}
                          checked={formData.q2_1 === opt}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">2-2. 귀사의 전기직무 재직근로자의 현재 실무역량 수준은 어떠합니까?</label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-2">
                    {levels.map(l => (
                      <label
                        key={l}
                        className={`flex items-center justify-center p-2 text-xs font-semibold rounded-xl border cursor-pointer transition text-center ${
                          formData.q2_2 === l ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="q2_2"
                          value={l}
                          checked={formData.q2_2 === l}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <span>{l}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">2-3. 귀사에서 전기직무 재직근로자에게 요구하는 목표 역량 수준은 무엇입니까?</label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-2">
                    {levels.map(l => (
                      <label
                        key={l}
                        className={`flex items-center justify-center p-2 text-xs font-semibold rounded-xl border cursor-pointer transition text-center ${
                          formData.q2_3 === l ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="q2_3"
                          value={l}
                          checked={formData.q2_3 === l}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <span>{l}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">2-4. 귀사의 전기직무 재직근로자가 업무 수행 시 가장 부족하다고 생각되는 역량은 무엇입니까? (복수선택) *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    '직무 전문지식',
                    '법령기준 이해',
                    '실무적용 능력',
                    '문제상황 조치',
                    '안전관리 책임',
                    '기타'
                  ].map(opt => {
                    const isChecked = formData.q2_4.includes(opt);
                    return (
                      <div key={opt} className={`flex flex-col gap-1 p-3 rounded-xl border transition ${
                          isChecked ? 'border-emerald-600 bg-emerald-50' : 'border-gray-200 hover:bg-gray-50'
                        }`}>
                        <label
                          className={`flex items-center gap-2 text-xs font-semibold cursor-pointer select-none ${
                            isChecked ? 'text-emerald-800' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleMultiCheckboxChange('q2_4', opt)}
                            className="w-4 h-4 text-emerald-600 shrink-0"
                          />
                          <span>{opt}</span>
                        </label>
                        {opt === '기타' && isChecked && (
                          <input
                            type="text"
                            name="q2_4_other"
                            value={formData.q2_4_other}
                            onChange={handleChange}
                            className="mt-1 w-full border border-emerald-300 focus:border-emerald-600 outline-none px-2 py-1 rounded text-xs bg-white"
                            placeholder="내용을 입력해주세요"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">2-5. 귀사의 주요 수행 직무에 따라 필요하다고 생각하는 교육 분야는 무엇입니까? *</label>
                <textarea
                  name="q2_5"
                  value={formData.q2_5}
                  onChange={handleChange}
                  rows={4}
                  className="w-full border border-gray-200 focus:border-emerald-650 outline-none p-3 rounded-lg text-xs"
                  placeholder="자유롭게 입력해주세요."
                />
              </div>

            </motion.div>
          )}

          {/* STEP 3: 부족 역량 및 조건 */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-lg font-bold text-gray-900">3. 컨소시엄 훈련 참여 여건</h3>
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">3-1. 귀사의 재직근로자를 컨소시엄 훈련에 참여시키는 경우, 가장 중요하게 고려하는 사항은 무엇입니까? (복수선택 가능) *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {['훈련 내용의 적합성', '업무 연관성', '훈련 일정', '비용 지원 여부', '훈련 장소', '기타'].map(opt => {
                      const isChecked = formData.q3_1.includes(opt);
                      return (
                        <div key={opt} className={`flex flex-col gap-1 p-2.5 rounded-xl border transition ${
                            isChecked ? 'border-emerald-600 bg-emerald-50' : 'border-gray-200'
                          }`}>
                          <label
                            className={`flex items-center gap-2 text-xs font-bold cursor-pointer select-none ${
                              isChecked ? 'text-emerald-800' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleMultiCheckboxChange('q3_1', opt)}
                              className="w-4 h-4 text-emerald-600 shrink-0"
                            />
                            <span>{opt}</span>
                          </label>
                          {opt === '기타' && isChecked && (
                            <input
                              type="text"
                              name="q3_1_other"
                              value={formData.q3_1_other}
                              onChange={handleChange}
                              className="mt-1 w-full border border-emerald-300 focus:border-emerald-600 outline-none px-2 py-1 rounded text-xs bg-white font-normal"
                              placeholder="내용을 입력해주세요"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">3-2. 귀사의 재직근로자의 역량 개발에 장애가 되는 요소는 무엇입니까? (복수선택) *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      '업무 공백 발생',
                      '대체인력 부족',
                      '직무별 맞춤교육 부족',
                      '사내 교육 시설 부족',
                      '기업 인식 부족',
                      '예산 부족',
                      '접근성 제약',
                      '기타'
                    ].map(opt => {
                      const isChecked = formData.q3_2.includes(opt);
                      return (
                        <div key={opt} className={`flex flex-col gap-1 p-2.5 rounded-xl border transition ${
                            isChecked ? 'border-emerald-600 bg-emerald-50' : 'border-gray-200'
                          }`}>
                          <label
                            className={`flex items-center gap-2 text-[10px] sm:text-xs font-bold cursor-pointer select-none ${
                              isChecked ? 'text-emerald-800' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleMultiCheckboxChange('q3_2', opt)}
                              className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0"
                            />
                            <span>{opt}</span>
                          </label>
                          {opt === '기타' && isChecked && (
                            <input
                              type="text"
                              name="q3_2_other"
                              value={formData.q3_2_other}
                              onChange={handleChange}
                              className="mt-1 w-full border border-emerald-300 focus:border-emerald-600 outline-none px-1.5 py-1 rounded text-[10px] sm:text-xs bg-white font-normal"
                              placeholder="내용을 입력해주세요"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">3-3. 귀사의 재직근로자를 컨소시엄 훈련에 참여시키는 경우, 허용 가능한 기간은 어느 정도입니까?</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                      {['1일(8H)', '2일(16H)', '3일(24H)', '4일(32H)', '5일(40H) 이상'].map(opt => (
                        <label
                          key={opt}
                          className={`flex items-center justify-center p-2 text-xs font-semibold rounded-xl border cursor-pointer transition text-center ${
                            formData.q3_3 === opt ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="q3_3"
                            value={opt}
                            checked={formData.q3_3 === opt}
                            onChange={handleChange}
                            className="sr-only"
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">3-4. 귀사에서 컨소시엄 훈련 참여가 가능한 시기는 언제입니까? (복수선택) *</label>
                    <div className="grid grid-cols-3 gap-3">
                      {['2~4월', '5~7월', '8~11월'].map(opt => {
                        const isChecked = formData.q3_4.includes(opt);
                        return (
                          <label
                            key={opt}
                            className={`flex items-center justify-center gap-2 p-3 text-xs font-semibold rounded-xl border cursor-pointer select-none transition ${
                              isChecked ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-gray-200'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleMultiCheckboxChange('q3_4', opt)}
                              className="w-4 h-4 text-emerald-600"
                            />
                            <span>{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">3-5. 귀사에서 훈련 참여 가능한 예상 인원은 몇 명입니까?</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                      {['1~2명', '3~5명', '6~10명', '11~20명', '21명 이상'].map(opt => (
                        <label
                          key={opt}
                          className={`flex items-center justify-center p-2 text-xs font-semibold rounded-xl border cursor-pointer transition text-center ${
                            formData.q3_5 === opt ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="q3_5"
                            value={opt}
                            checked={formData.q3_5 === opt}
                            onChange={handleChange}
                            className="sr-only"
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4: 협회 컨소시엄 개선 의견 */}
          {step === 4 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-lg font-bold text-gray-900">4. 협회 컨소시엄 훈련 운영 개선 의견</h3>
                <p className="text-xs text-gray-500">마지막 개선 통계 취합 항목입니다.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">4-1. 협회 컨소시엄 훈련에 대한 전반적인 만족도는 어떠합니까? *</label>
                <div className="grid grid-cols-5 gap-2">
                  {['매우 만족', '만족', '보통', '불만족', '매우 불만족'].map((opt, i) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, q4_1: (5 - i).toString() }))}
                      className={`py-3 text-xs font-bold rounded-xl border transition ${
                        formData.q4_1 === (5 - i).toString()
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-gray-650 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 font-black">4-2. 협회 컨소시엄 훈련에 개선이 필요한 사항은 무엇입니까? (복수선택) *</label>
                <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                  {[
                    '교육 일정 다양화',
                    '실습 중심 교육 확대',
                    '최신 기술과정 확대',
                    '강사 전문성 강화',
                    '교육시설 및 환경 개선',
                    '기타'
                  ].map(opt => {
                    const isChecked = formData.q4_2.includes(opt);
                    return (
                      <div key={opt} className={`flex flex-col items-center justify-center p-2 text-center text-xs font-semibold rounded-xl border cursor-pointer select-none transition min-h-[64px] ${
                          isChecked ? 'border-emerald-600 bg-emerald-50 text-emerald-850' : 'border-gray-200'
                        }`}>
                        <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleMultiCheckboxChange('q4_2', opt)}
                            className="w-4 h-4 text-emerald-600 mb-1"
                          />
                          <span className="text-[10px] sm:text-[11px] font-bold leading-tight mt-1">{opt}</span>
                        </label>
                        {opt === '기타' && isChecked && (
                          <input
                            type="text"
                            name="q4_2_other"
                            value={formData.q4_2_other}
                            onChange={handleChange}
                            className="w-[90%] border border-emerald-300 focus:border-emerald-600 outline-none px-1.5 py-1 rounded text-[10px] sm:text-xs bg-white font-normal mt-1"
                            placeholder="입력"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">4-3. 협회 컨소시엄 훈련에 바라는 점이 있다면 자유롭게 작성하여 주시기 바랍니다.</label>
                <textarea
                  name="q4_3"
                  value={formData.q4_3}
                  onChange={handleChange}
                  rows={4}
                  className="w-full border border-gray-200 focus:border-emerald-650 outline-none p-3 rounded-lg text-xs"
                  placeholder="예: 2~3일짜리 단기 집중 실전 PLC 조립 모의 셋업과정을 매월 정규화 개설해주셨으면 감사하겠습니다."
                />
              </div>
            </motion.div>
          )}

          {/* Controls */}
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
                취소하고 홈 가기
              </button>
            )}

            {step < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1 bg-emerald-600 text-white hover:bg-emerald-700 px-5 py-2.5 rounded-lg text-xs font-bold shadow-xs transition"
              >
                <span>다음 단계</span>
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl text-xs font-black tracking-wider shadow-md transition disabled:opacity-50"
              >
                <span>FGI 설문지 제출</span>
                {loading ? <span className="animate-spin text-[10px]">■</span> : <ArrowRight size={16} />}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
