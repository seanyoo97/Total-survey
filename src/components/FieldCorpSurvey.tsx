import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { COURSES_LIST } from '../courses';
import { ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

export default function FieldCorpSurvey() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    // [1. 기업현황]
    q1_1: '', // 직위
    q1_2: '', // 주요 업종
    q1_3: '', // 상시 근로자 수
    q1_4: '', // 관찰 정도

    // [2. 훈련참여 및 활용조사]
    q2_1: [] as string[], // 직원이 참여한 과정 (복수선택, COURSES_LIST)
    q2_2: '', // 참여시킨 주된 목적
    q2_3: '', // 업무 수행 필요성 (5점 척도)
    q2_4: '', // 업무 적용 기회/지원 제공 여부 (5점 척도)
    q2_5: '', // 제공한 지원 방식
    q2_6: '', // 향후 참여기회 확대 의향 (5점 척도)
    q2_7: '', // 필요한 사후관리 / 후속지원 (주관식)

    // [3. 현업적용도 평가] --전부 5점척도
    q3_1: '', // 업무적용도
    q3_2: '', // 업무수행 체계성
    q3_3: '', // 업무성과 향상도
    q3_4: '', // 문제해결 기여도
    q3_5: '', // 조직 기여도
    q3_6: '', // 두드러진 변화/개선 사례 (주관식)
    q3_7: '', // 개선/보완 사항 (주관식)
  });

  // Disabled for testing to allow duplicate responses
  const alreadyCompleted = false;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMultiCheckboxChange = (course: string) => {
    setFormData(prev => {
      const arr = prev.q2_1;
      if (arr.includes(course)) {
        return { ...prev, q2_1: arr.filter(item => item !== course) };
      } else {
        return { ...prev, q2_1: [...arr, course] };
      }
    });
  };

  const totalSteps = 3;

  const validateStep = () => {
    switch (step) {
      case 1:
        if (!formData.q1_1 || !formData.q1_2 || !formData.q1_3 || !formData.q1_4) {
          return "기업현황 파트의 모든 필수 문항에 답변해주세요.";
        }
        return "";
      case 2:
        if (formData.q2_1.length === 0) {
          return "직원이 수강한 과정을 1개 이상 골라주세요.";
        }
        if (!formData.q2_2 || !formData.q2_3 || !formData.q2_4 || !formData.q2_5 || !formData.q2_6) {
          return "훈련참여 및 환경 기회 지원에 관한 문항을 모두 채워주십시오.";
        }
        return "";
      case 3:
        if (!formData.q3_1 || !formData.q3_2 || !formData.q3_3 || !formData.q3_4 || !formData.q3_5) {
          return "5대 핵심 현업적용도 평점 문항은 모두 필수 입력입니다.";
        }
        return "";
      default:
        return "";
    }
  };

  const handleNext = () => {
    const error = validateStep();
    if (error) {
      setErrorMessage(error);
      return;
    }
    setErrorMessage('');
    setStep(prev => prev + 1);
  };

  const handlePrev = () => {
    setErrorMessage('');
    setStep(prev => prev - 1);
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
      return;
    }

    if (alreadyCompleted) {
      setErrorMessage("이미 제출 완료된 설문입니다.");
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const submissionData = {
        ...formData,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'surveys_field_corp'), submissionData);
      localStorage.setItem('survey_completed_/survey/field-corp', 'true');
      setIsSubmitted(true);
    } catch (err) {
      console.error(err);
      try {
        handleFirestoreError(err, OperationType.CREATE, 'surveys_field_corp');
      } catch (adaptedError: any) {
        setErrorMessage(`제출 중 실시간 반영 실패: ${adaptedError.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (isSubmitted || alreadyCompleted) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
        <div className="bg-white max-w-lg w-full p-10 rounded-3xl border border-teal-100 shadow-2xl text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-teal-500 to-emerald-600" />
          <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xs">
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

  const scaleLabels = [
    { text: "매우 만족/그렇다", score: "5" },
    { text: "만족/어느정도", score: "4" },
    { text: "보통 수준", score: "3" },
    { text: "미진/그렇지않다", score: "2" },
    { text: "전혀 무용/아니다", score: "1" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-bg to-emerald-150 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg border border-emerald-100 overflow-hidden">
        {/* Top Banner */}
        <div className="bg-gradient-to-r from-primary-green to-teal-700 text-white p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">훈련 현업적용도 측정조사 (기업 관리자용)</h1>
          <p className="text-teal-100/90 text-sm font-light">
            공동훈련센터에 수강생을 파견하였던 부서장/인사담당자 입장에서 교육이 기업 실무에 실질적으로 효과가 있는지를 과학적으로 분석합니다.
          </p>
        </div>

        {/* Progress header */}
        <div className="px-6 py-4 bg-emerald-50/50 border-b border-emerald-100 flex items-center justify-between text-xs sm:text-sm text-gray-500 font-medium">
          <div className="flex items-center gap-1.5 text-primary-green">
            <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center font-bold">
              {step}
            </span>
            <span>단계 ({step} / {totalSteps})</span>
          </div>
          <span className="text-gray-400 font-bold">
            {step === 1 && "1. 기업 기본 배경"}
            {step === 2 && "2. 훈련 참여 및 지원 현황"}
            {step === 3 && "3. 실질 현적 적용 지점"}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-10">
          {errorMessage && (
            <div className="p-4 mb-6 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-2">
              <AlertTriangle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: 기업현황 */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <h3 className="text-lg font-bold text-gray-900">1. 평가 기업 관리자 기본 정보</h3>
                <p className="text-xs text-gray-500">통계용 회사 기초 구분에 한정해 가공됩니다.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">1-1. 귀하의 회사 내 직위 또는 역할은 무엇입니까?</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {['대표이사/사업주', '임원', '부서장', '팀장/현장관리자', '인사/교육담당자', '기타'].map(opt => (
                    <label
                      key={opt}
                      className={`flex items-center justify-center p-3 text-xs font-semibold rounded-xl border cursor-pointer select-none transition ${
                        formData.q1_1 === opt
                          ? 'border-teal-600 bg-teal-50 text-teal-850 ring-2 ring-teal-600/20'
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
                <label className="block text-sm font-bold text-gray-700 mb-2">1-2. 귀 사의 주된 업종은 무엇입니까?</label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {['설계', '감리', '안전관리', '진단/점검', '기타'].map(opt => (
                    <label
                      key={opt}
                      className={`flex items-center justify-center p-3 text-xs font-semibold rounded-xl border cursor-pointer select-none transition ${
                        formData.q1_2 === opt
                          ? 'border-teal-600 bg-teal-50 text-teal-850'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-600'
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

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">1-3. 귀 사의 상시 근로자 규모 수준은?</label>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  {['10명 미만', '10명~50명 미만', '50명~100명 미만', '100명~300명 미만', '300명 이상'].map(opt => (
                    <label
                      key={opt}
                      className={`flex items-center justify-center p-3 text-xs font-semibold rounded-xl border cursor-pointer select-none transition ${
                        formData.q1_3 === opt
                          ? 'border-teal-600 bg-teal-50 text-teal-850'
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

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">1-4. 귀하는 직원들의 직무 수행 과정 및 학습 성과를 얼마나 빈번히 관찰/피드백하십니까?</label>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {[
                    { val: '직접 지시/평가', sub: "수시로 긴밀히 모니터링" },
                    { val: '주기적 확인', sub: "정기 회고 및 업무 보고" },
                    { val: '간접 파악', sub: "협조 결재 또는 동료 반응" },
                    { val: '거의 모름', sub: "인사기록 카드만 검토" }
                  ].map(opt => (
                    <label
                      key={opt.val}
                      className={`flex flex-col items-center text-center p-3 rounded-xl border cursor-pointer select-none transition ${
                        formData.q1_4 === opt.val
                          ? 'border-teal-600 bg-teal-50 text-teal-850'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="q1_4"
                        value={opt.val}
                        checked={formData.q1_4 === opt.val}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <span className="text-xs font-bold">{opt.val}</span>
                      <span className="text-[10px] text-gray-400 mt-0.5">{opt.sub}</span>
                    </label>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: 훈련참여 및 활용조사 */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <h3 className="text-lg font-bold text-gray-900">2. 임직원 파견 훈련 및 사내 환경 조사</h3>
              </div>

              {/* Course list */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  2-1. 최근 귀사 직원(수강생)들이 공동훈련센터에서 최소 1종 이상 수료한 과정을 표시해 주십시오. (복수 선택) *
                </label>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 max-h-56 overflow-y-auto space-y-1.5 text-left">
                  {COURSES_LIST.map((course, idx) => {
                    const isChecked = formData.q2_1.includes(course);
                    return (
                      <label
                        key={course}
                        className={`flex items-start gap-3 p-1.5 rounded-lg text-xs cursor-pointer transition ${
                          isChecked ? 'bg-teal-50 font-bold text-teal-950' : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleMultiCheckboxChange(course)}
                          className="w-4 h-4 text-teal-600 rounded border-gray-300 mt-0.5"
                        />
                        <span>{idx + 1}. {course}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">2-2. 해당 직원들을 컨소시엄 과정에 참여시킨 주 목적은?</label>
                  <select
                    name="q2_2"
                    value={formData.q2_2}
                    onChange={handleChange}
                    className="w-full border border-gray-200 bg-white focus:border-teal-600 outline-none py-2.5 px-3 rounded-lg text-xs"
                  >
                    <option value="">-- 선택하십시오 --</option>
                    <option value="직무역량 향상">현업 부족 기술 보완 및 직무 강화</option>
                    <option value="문제해결 강화">대응 곤란 애로 및 고장 해결</option>
                    <option value="안전관리 향상">최신 법 개정에 대비한 안전 수칙 확보</option>
                    <option value="법/제도 대응">KEC, 소방 등 행정 법/제도 의무 충족</option>
                    <option value="신규업무 대비">신규 전력 기기 도입 및 부서 전환 대비</option>
                    <option value="기타">기타 목적</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">2-5. 복귀한 훈련생에게 제공한 가장 구체적인 사내 지원 방식은?</label>
                  <select
                    name="q2_5"
                    value={formData.q2_5}
                    onChange={handleChange}
                    className="w-full border border-gray-200 bg-white focus:border-teal-600 outline-none py-2.5 px-3 rounded-lg text-xs"
                  >
                    <option value="">-- 선택하십시오 --</option>
                    <option value="관련 업무 부여">습득 스킬에 밀접한 고난도 업무 부여</option>
                    <option value="실습 기회">테스트 모형 및 오프라인 배선 실습 자재 부여</option>
                    <option value="장비/자료">교보재, 분석 계측기 구매 지원</option>
                    <option value="상사 피드백">부서장의 업무 노하우 전수 및 정기 검토</option>
                    <option value="별도 지원 없음">특이점 없이 일상 업무 수행</option>
                    <option value="기타">기타 타 방식</option>
                  </select>
                </div>
              </div>

              {/* Scores */}
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">2-3. 수강했던 교육 과목들이 실제 해당 직무에 필수적인 분야였습니까?</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {scaleLabels.map(opt => (
                      <button
                        key={opt.score}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, q2_3: opt.score }))}
                        className={`py-2 px-1 text-[11px] font-semibold rounded-lg border transition ${
                          formData.q2_3 === opt.score
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {opt.text} ({opt.score}점)
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">2-4. 수료한 직원들이 교육 내용을 현장에 정량적으로 소급해 적용할 적절한 시공/점검 기회가 허용되었습니까?</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {scaleLabels.map(opt => (
                      <button
                        key={opt.score}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, q2_4: opt.score }))}
                        className={`py-2 px-1 text-[11px] font-semibold rounded-lg border transition ${
                          formData.q2_4 === opt.score
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {opt.text} ({opt.score}점)
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">2-6. 당사가 공동훈련센터에 직원들을 위탁 연수 보낼 정규 기회를 향후 확대할 계획이 있습니까?</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {scaleLabels.map(opt => (
                      <button
                        key={opt.score}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, q2_6: opt.score }))}
                        className={`py-2 px-1 text-[11px] font-semibold rounded-lg border transition ${
                          formData.q2_6 === opt.score
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {opt.text} ({opt.score}점)
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">2-7. 수강생(직원)들의 성과 정착을 가속하기 위해 필요한 기관 차원의 사후관리/후속 지원이 있다면 적어 주십시오.</label>
                <textarea
                  name="q2_7"
                  value={formData.q2_7}
                  onChange={handleChange}
                  rows={2}
                  className="w-full border border-gray-200 focus:border-teal-600 outline-none p-3 rounded-lg text-xs"
                  placeholder="예: 실습 장비의 현장 단기 대여 프로그램, 온라인 복습 동영상 서비스 등"
                />
              </div>
            </motion.div>
          )}

          {/* STEP 3: 현업적용도 평가 */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <h3 className="text-lg font-bold text-gray-900">3. 교육 성과에 따른 현업 실질 전이 평가</h3>
                <p className="text-xs text-gray-500">교육 참여 이후 부하 직원의 객관적 태도 및 성과 변동을 평가하는 핵심 척도 5문항입니다.</p>
              </div>

              <div className="space-y-4">
                {[
                  { key: 'q3_1', title: "3-1. 업무적용도", q: "교육을 마치고 복귀한 우리 전공 직원이 훈련 지식을 현장 실업무 해결에 원활히 활용하고 있습니까?" },
                  { key: 'q3_2', title: "3-2. 업무수행 체계성", q: "수용 교육을 통해 주먹구구식 노하우 대신 과학적 공학 기준(KEC 등)에 맞춰 더 체계적으로 설계/감리/안전관리를 행합니까?" },
                  { key: 'q3_3', title: "3-3. 업무성과 향상도", q: "작업 소요 시간이 유의미하게 단축되거나 품질 불량이 감소하는 등 명확한 성과상의 진전이 포착되었습니까?" },
                  { key: 'q3_4', title: "3-4. 문제해결 기여도", q: "계통의 갑작스러운 고장, 소음 노이즈, 기계 오작동 발생 대처 시, 핵심 원인을 스스로 도출할 역량을 보였습니까?" },
                  { key: 'q3_5', title: "3-5. 조직 기여도", q: "습득한 지식을 다른 부서원에게 공유하여, 부서 원활함 등 팀 전반의 생산성 증폭에 기여했습니까?" }
                ].map((item) => (
                  <div key={item.key} className="bg-gray-50/50 p-4 rounded-xl border border-gray-100/80">
                    <label className="block text-xs font-bold text-gray-800 mb-1.5">{item.title}. {item.q}</label>
                    <div className="grid grid-cols-5 gap-1">
                      {scaleLabels.map(opt => (
                        <button
                          key={opt.score}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, [item.key]: opt.score }))}
                          className={`py-2 px-0.5 text-[10px] font-semibold rounded-lg border transition ${
                            (formData as any)[item.key] === opt.score
                              ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {opt.text} ({opt.score}점)
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 font-semibold">3-6. 훈련 수료 이후 직원에게 잡힌 가장 두드러진 긍정적인 기술 변화나 개선 사례를 간략히 서술해 주십시오.</label>
                  <textarea
                    name="q3_6"
                    value={formData.q3_6}
                    onChange={handleChange}
                    rows={3}
                    className="w-full border border-gray-200 focus:border-teal-600 outline-none p-2.5 rounded-lg text-xs"
                    placeholder="예: 보호계전기 오점검 요소를 빠르게 매뉴얼대로 수정하여 안전사고 예방함"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 font-semibold">3-7. 우리 공동훈련센터 과정에서 더 채워져야 하거나 시공 실효 역량상 개선/보완해야 할 사항은?</label>
                  <textarea
                    name="q3_7"
                    value={formData.q3_7}
                    onChange={handleChange}
                    rows={3}
                    className="w-full border border-gray-200 focus:border-teal-600 outline-none p-2.5 rounded-lg text-xs"
                    placeholder="예: 최신 오실로스코프 및 디지털 미터 장비 실습 기기가 보강되었으면 좋겠습니다."
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Navigation */}
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
                취소하고 홈으로 가기
              </button>
            )}

            {step < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1 bg-teal-600 text-white hover:bg-teal-700 px-5 py-2.5 rounded-lg text-xs font-bold shadow-xs transition"
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
                <span>기업용 평가 제출</span>
                {loading ? <span className="animate-spin text-[10px]">■</span> : <ArrowRight size={16} />}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
