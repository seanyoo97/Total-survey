import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { COURSES_LIST } from '../courses';
import { ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

export default function FieldTraineeSurvey() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    // [1. 일반현황]
    q1_1: '', // 담당 업무 (설계, 감리, 안전관리 등)
    q1_2: '', // 업무 경력 (1년 이하, 1~3년, 3~5년, 5년 이상 등)
    q1_3: '', // 기업 근로자 수 대역

    // [2. 훈련 참여 조사]
    q2_1: [] as string[], // 수료한 과정들 (COURSES_LIST)

    // [3. 현업적용도 평가] -> 5점 척도
    q2_2: '', // 업무관련성
    q2_3: '', // 업무유용성
    q2_4: '', // 실용적용성
    q2_5: '', // 업무향상도
    q2_6: '', // 성과기여도
    
    q3_1: '', // 자기효능감 1 (자신감 생김)
    q3_2: '', // 자기효능감 2 (스스로 수행 가능)
    
    q4_1: '', // 전이동기 1 (적용하고 싶음)
    q4_2: '', // 전이동기 2 (성과 향상 기대)

    q5_1: '', // 전이설계 1 (과정이 현장에 잘 맞춰짐)
    q5_2: '', // 전이설계 2 (현장 예시 많았음)

    q6_1: '', // 상사/동료 지원 1 (적용할 때 동지 장려)
    q6_2: '', // 상사/동료 지원 2 (동료들의 협조적 반응)

    q7_1: '', // 변화가능성 1 (훈련으로 행동 변화)
    q7_2: '', // 변화가능성 2 (사내 관행 보완 작용)

    q8: '', // 구체적 도움/적용 사례 (주관식)
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
        if (!formData.q1_1 || !formData.q1_2 || !formData.q1_3) {
          return "귀하의 일반 기술 성격 프로필을 지정해주세요.";
        }
        if (formData.q2_1.length === 0) {
          return "수료하신 훈련 과정명을 최소 1개 이상 체크해 주셔야 합니다.";
        }
        return "";
      case 2:
        // Core metrics check
        const step2Keys = ['q2_2', 'q2_3', 'q2_4', 'q2_5', 'q2_6', 'q3_1', 'q3_2', 'q4_1', 'q4_2'];
        for (const k of step2Keys) {
          if (!(formData as any)[k]) {
            return "현업적용도 핵심 전이동기 평가 점수를 모두 메겨주십시오.";
          }
        }
        return "";
      case 3:
        // Design & Support metrics check
        const step3Keys = ['q5_1', 'q5_2', 'q6_1', 'q6_2', 'q7_1', 'q7_2'];
        for (const k of step3Keys) {
          if (!(formData as any)[k]) {
            return "전이 설계 및 주변 환경 배려 평가의 빈곳을 채워주세요.";
          }
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
      setErrorMessage("이미 제출이 완료된 상태입니다.");
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const submissionData = {
        ...formData,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'surveys_field_trainee'), submissionData);
      localStorage.setItem('survey_completed_/survey/field-trainee', 'true');
      setIsSubmitted(true);
    } catch (err) {
      console.error(err);
      try {
        handleFirestoreError(err, OperationType.CREATE, 'surveys_field_trainee');
      } catch (adaptedError: any) {
        setErrorMessage(`제출 오류: ${adaptedError.message}`);
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

  const ratingsLabels = [
    { label: "매우 만족/그렇다", score: "5" },
    { label: "만족/어느정도", score: "4" },
    { label: "보통 수준", score: "3" },
    { label: "그렇지않다", score: "2" },
    { label: "전혀 아니다", score: "1" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-bg to-emerald-150 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg border border-emerald-100 overflow-hidden">
        {/* Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-green-700 text-white p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">현업적용도 측정조사 (훈련생용)</h1>
          <p className="text-emerald-100/90 text-sm font-light">
            컨소시엄 공동훈련센터 교육 과정을 마친 현장 실무 기술자로서, 학습한 지식이 실제 어떻게 성과로 변이되었는지 분석하여 국비과정을 선진화합니다.
          </p>
        </div>

        {/* Progress Tracker */}
        <div className="px-6 py-4 bg-emerald-50/50 border-b border-emerald-100 flex items-center justify-between text-xs sm:text-sm text-gray-500 font-medium">
          <div className="flex items-center gap-1.5 text-primary-green">
            <span className="w-6 h-6 rounded-full bg-[#2B5C43] text-white text-xs flex items-center justify-center font-bold">
              {step}
            </span>
            <span>단계 ({step} / {totalSteps})</span>
          </div>
          <span className="text-gray-400 font-bold">
            {step === 1 && "1. 나의 보유 능력 및 이수 이력"}
            {step === 2 && "2. 훈련 전이 및 자기효능감 등"}
            {step === 3 && "3. 환경 지원 평가 및 상세 후기"}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-10">
          {errorMessage && (
            <div className="p-4 mb-6 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-2">
              <AlertTriangle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: 일반현황 및 수강과정 */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <h3 className="text-lg font-bold text-gray-900">1. 평가 훈련생의 업무 및 수기 기초 파악</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">나의 일 전담 업무 분야</label>
                  <div className="flex flex-col gap-2 mt-1">
                    {['전기설계', '감리', '전기안전관리', '시공관리', '기타'].map(opt => (
                      <label
                        key={opt}
                        className={`flex items-center gap-2 p-2.5 text-xs font-semibold rounded-xl border cursor-pointer transition ${
                          formData.q1_1 === opt ? 'border-[#2B5C43] bg-[#f0f9f4] text-[#2B5C43]' : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="q1_1"
                          value={opt}
                          checked={formData.q1_1 === opt}
                          onChange={handleChange}
                          className="w-4 h-4 text-[#2B5C43] shrink-0"
                        />
                        <span>{{'전기설계':'전기 및 전력 설비 설계', '감리':'전기공사 및 전공 감리 업무', '전기안전관리':'상주/대행 안전관리자 역할', '시공관리':'전기시공 현업 감독', '기타':'기타 타 직무'}[opt as string]}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">해당 분야 실무 경력</label>
                  <div className="flex flex-col gap-2 mt-1">
                    {['3년 이하', '4~6년', '7년 이상'].map(opt => (
                      <label
                        key={opt}
                        className={`flex items-center gap-2 p-2.5 text-xs font-semibold rounded-xl border cursor-pointer transition ${
                          formData.q1_2 === opt ? 'border-[#2B5C43] bg-[#f0f9f4] text-[#2B5C43]' : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="q1_2"
                          value={opt}
                          checked={formData.q1_2 === opt}
                          onChange={handleChange}
                          className="w-4 h-4 text-[#2B5C43] shrink-0"
                        />
                        <span>{{'3년 이하':'3년 미만 신입/저연차', '4~6년':'4년 ~ 6년차 주임급', '7년 이상':'7년 이상 대리/과장 이상 베테랑'}[opt as string]}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">회사 상시 근로자 규모</label>
                  <div className="flex flex-col gap-2 mt-1">
                    {['10명 미만', '10명~50명 미만', '50명~100명 미만', '100명~300명 미만', '300명 이상'].map(opt => (
                      <label
                        key={opt}
                        className={`flex items-center gap-2 p-2.5 text-xs font-semibold rounded-xl border cursor-pointer transition ${
                          formData.q1_3 === opt ? 'border-[#2B5C43] bg-[#f0f9f4] text-[#2B5C43]' : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="q1_3"
                          value={opt}
                          checked={formData.q1_3 === opt}
                          onChange={handleChange}
                          className="w-4 h-4 text-[#2B5C43] shrink-0"
                        />
                        <span>{{'10명 미만':'10명 미만 영세 기업', '10명~50명 미만':'10명 ~ 50명 미만 소기업', '50명~100명 미만':'50명 ~ 100명 중소기업', '100명~300명 미만':'100명 ~ 300명 미만 중견기업', '300명 이상':'300명 이상 대규모/공공기관'}[opt as string]}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Course list */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  2-1. 귀하가 수강(수료) 완료한 교육과정을 정밀히 골라 주십시오. (복수 선택) *
                </label>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 max-h-56 overflow-y-auto space-y-1 text-left">
                  {COURSES_LIST.map((course, idx) => {
                    const isChecked = formData.q2_1.includes(course);
                    return (
                      <label
                        key={course}
                        className={`flex items-start gap-3 p-1.5 rounded-lg text-xs cursor-pointer select-none transition ${
                          isChecked ? 'bg-emerald-50 text-emerald-900 font-black' : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleMultiCheckboxChange(course)}
                          className="w-4 h-4 text-[#2B5C43] rounded border-gray-300 mt-0.5"
                        />
                        <span>{idx + 1}. {course}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: 현업적용도 및 자기효능감, 전이동기 (9문항) */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-lg font-bold text-gray-900">2. 현업적용도 핵심 요소 및 동기 평정</h3>
                <p className="text-xs text-gray-500">배운 내용의 실제 연관성과 실사용 만족 점수를 매겨 주시길 바랍니다.</p>
              </div>

              {[
                { key: 'q2_2', sec: "[업무관련성]", txt: "공동훈련센터에서 학습 혹은 실습한 교육 내용들이 나의 실제 전공 직무와 직접 결합되어 깊이 밀착되어 있었습니까?" },
                { key: 'q2_3', sec: "[업무유용성]", txt: "가르쳐준 최신 개정 법규 해설 및 전기 진단 기법이 내 매일의 업무 수행 생산성 보정에 유용한 내용이었습니까?" },
                { key: 'q2_4', sec: "[실용적용성]", txt: "복귀한 후 배운 도식, 안전 계수 계산법 등을 곧바로 실제 시스템 안전 확보에 실용적으로 써먹을 수 있었습니까?" },
                { key: 'q2_5', sec: "[업무향상도]", txt: "교육 이후 감전 예방 대응 가습, 배선 도면 리딩 정확도 면에서 나의 일 처리 성과가 유의미하게 성장했습니까?" },
                { key: 'q2_6', sec: "[성과기여도]", txt: "기술적 오작동 파악 해결력이 증폭되어 궁극적으로 기업의 경비 보전 및 무재해 운영 유지에 기여했나요?" },
                { key: 'q3_1', sec: "[자기효능감-1]", txt: "이번 전문 과정 수료를 거침으로써 전기 설비 장애 분석을 도맡아 수행할 심리적 자신감이 단단히 얻어졌습니까?" },
                { key: 'q3_2', sec: "[자기효능감-2]", txt: "외부 전문 컨설팅의 의존을 줄이고, 나 홀로 자주적으로 설킷 진단 및 감전보호 계산 시스템을 완료할 실무력이 되었습니까?" },
                { key: 'q4_1', sec: "[전이동기-1]", txt: "훈련을 마치자마자 사내에서 보류 중이었던 고난도 안전 셋팅에 교육 습득 기술을 빠르게 응용하고픈 마음이 동했나요?" },
                { key: 'q4_2', sec: "[전이동기-2]", txt: "배운 것을 그대로 실용화하는 편이 내 연봉 상승이나 팀 내 전문성 가치 발현 측면에서 긍정적 결과를 낳을 것이라 확신하나요?" }
              ].map(item => (
                <div key={item.key} className="bg-gray-50/60 p-3.5 rounded-xl border border-gray-100 text-left">
                  <span className="text-emerald-700 font-bold text-[11px] block mb-1">{item.sec}</span>
                  <label className="block text-xs font-semibold text-gray-800 mb-2">{item.txt}</label>
                  <div className="grid grid-cols-5 gap-1">
                    {ratingsLabels.map(opt => (
                      <button
                        key={opt.score}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, [item.key]: opt.score }))}
                        className={`py-2 text-[10px] font-bold rounded-lg border transition ${
                          (formData as any)[item.key] === opt.score
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {opt.label} ({opt.score}점)
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* STEP 3: 설계, 상사지원, 변화, 서술후기 (7문항) */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-lg font-bold text-gray-900">3. 교육 설계 적합성 및 사내 지원 여건</h3>
              </div>

              {[
                { key: 'q5_1', sec: "[전이설계-1]", txt: "교육원 훈련 내용이 주먹구구 대신 현업 필드의 표준 행동 양식을 유기적으로 복사하도록 섬세히 기획되어 있었나요?" },
                { key: 'q5_2', sec: "[전이설계-2]", txt: "수업 중 실제 사용되는 배전 시퀀스 및 PLC 패널 모의 상황과 직접 연관 지은 케이스 중심 연습이 충분했습니까?" },
                { key: 'q6_1', sec: "[상사/동료 지원-1]", txt: "직속 부서장 및 대표 관리자가 배운 솔루션을 기업 실조정에 적용하도록 따뜻이 권유하고 지원의 기회를 줍니까?" },
                { key: 'q6_2', sec: "[상사/동료 지원-2]", txt: "내가 현업에서 보호기법 실천법을 시도할 때, 무시하거나 타박하지 않고 동료들이 호의적으로 협업해 주나요?" },
                { key: 'q7_1', sec: "[변화가능성-1]", txt: "교육 수용은 단순 학습을 너머, 나의 기술 점검 조작 루틴 자체를 완전하고 안전 정량화되게 변화시켰나요?" },
                { key: 'q7_2', sec: "[변화가능성-2]", txt: "사내에 방치되어 고착화되었던 노후 전기안전 운용법을, 배운 룰 기반으로 안전화하는 보완 행동을 행하셨나요?" }
              ].map(item => (
                <div key={item.key} className="bg-gray-50/60 p-3.5 rounded-xl border border-gray-100 text-left">
                  <span className="text-[#2B5C43] font-bold text-[11px] block mb-1">{item.sec}</span>
                  <label className="block text-xs font-semibold text-gray-800 mb-2">{item.txt}</label>
                  <div className="grid grid-cols-5 gap-1">
                    {ratingsLabels.map(opt => (
                      <button
                        key={opt.score}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, [item.key]: opt.score }))}
                        className={`py-2 text-[10px] font-bold rounded-lg border transition ${
                          (formData as any)[item.key] === opt.score
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {opt.label} ({opt.score}점)
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t border-gray-100">
                <label className="block text-xs font-bold text-gray-700 mb-1.5 font-bold">8. 이번 공동훈련센터 과정을 통해 실제 업무에 도움이 되었던 점이나 현업에 성공적으로 적용한 실제 사례가 있다면 수기로 편하게 적어주십시오.</label>
                <textarea
                  name="q8"
                  value={formData.q8}
                  onChange={handleChange}
                  rows={4}
                  className="w-full border border-gray-200 focus:border-[#2B5C43] outline-none p-3 rounded-lg text-xs"
                  placeholder="예: PLC 미쯔비시 동력제어 과정을 수여하여 공장 자동 인피드라인 세팅 오류 고장을 단독 분석해 30분 만에 정비 완료함"
                />
              </div>
            </motion.div>
          )}

          {/* Navigation controls */}
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
                <span>평가지 완료 및 제출</span>
                {loading ? <span className="animate-spin text-[10px]">■</span> : <ArrowRight size={16} />}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
