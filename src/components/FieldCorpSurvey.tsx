import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
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
    q1_1: '', q1_1_other: '',
    q1_2: '', q1_2_other: '',
    q1_3: '',
    q1_4: '',

    // [2. 훈련참여 및 활용조사]
    q2_1: '', // 지원 여부 (5점 척도)
    q2_2: '', q2_2_other: '', // 지원 방식
    q2_3: '', // 향후 확대 의향 (5점 척도)
    q2_4: '', // 장기간 적용위한 후속지원 (주관식)

    // [3. 현업적용도 평가]
    q3_1: '',
    q3_2: '',
    q3_3: '',
    q3_4: '',
    q3_5: '',
    q3_6: '', // 주요 업무 개선 사례
    q3_7: '', // 개선/보완 사항
  });

  const alreadyCompleted = false;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const totalSteps = 3;

  const validateStep = () => {
    switch (step) {
      case 1:
        if (!formData.q1_1 || !formData.q1_2 || !formData.q1_3 || !formData.q1_4) {
          return "기업현황 파트의 모든 필수 문항에 답변해주세요.";
        }
        if (formData.q1_1 === '기타(직접기재)' && !formData.q1_1_other) return "1-1번 문항의 기타 의견을 작성해주세요.";
        if (formData.q1_2 === '기타' && !formData.q1_2_other) return "1-2번 문항의 기타 의견을 작성해주세요.";
        return "";
      case 2:
        if (!formData.q2_1 || !formData.q2_2 || !formData.q2_3) {
          return "훈련참여 및 활용조사에 관한 필수 문항을 모두 채워주십시오.";
        }
        if (formData.q2_2 === '기타(직접기재)' && !formData.q2_2_other) return "2-2번 문항의 기타 의견을 작성해주세요.";
        return "";
      case 3:
        if (!formData.q3_1 || !formData.q3_2 || !formData.q3_3 || !formData.q3_4 || !formData.q3_5) {
          return "현업적용도 평가 문항(3-1 첫번째 문항군)은 모두 필수 입력입니다.";
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
      const final_q1_1 = formData.q1_1 === '기타(직접기재)' ? `기타(${formData.q1_1_other})` : formData.q1_1;
      const final_q1_2 = formData.q1_2 === '기타' ? `기타(${formData.q1_2_other})` : formData.q1_2;
      const final_q2_2 = formData.q2_2 === '기타(직접기재)' ? `기타(${formData.q2_2_other})` : formData.q2_2;

      const submissionData = {
        ...formData,
        q1_1_final: final_q1_1,
        q1_2_final: final_q1_2,
        q2_2_final: final_q2_2,
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

  const scaleLabels5 = [
    { text: "매우 그렇다", score: "5" },
    { text: "그렇다", score: "4" },
    { text: "보통이다", score: "3" },
    { text: "그렇지 않다", score: "2" },
    { text: "매우 그렇지 않다", score: "1" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-bg to-emerald-150 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg border border-emerald-100 overflow-hidden">
        {/* Top Banner */}
        <div className="bg-emerald-800 text-white p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">현업적용도 측정조사 (기업용)</h1>
          <p className="text-emerald-50/90 text-[11px] sm:text-xs font-light leading-relaxed mb-4">
            안녕하십니까?<br/>
            바쁘신 가운데 귀한 시간을 내어 본 설문에 응답해 주셔서 감사합니다.<br/>
            한국전기기술인협회 인적자원개발팀에서는 국가인적자원개발컨소시엄 사업 훈련과정 참여자의 현업적용도 측정조사를 실시하고 있습니다.<br/>
            본 설문은 귀사 소속 훈련참여자가 훈련과정 수료 후 현업에 복귀하여 교육내용을 실제 업무에 어느 정도 활용하고 있는지 그 수준을 확인하고, 현업적용에 영향을 미치는 요인과 기업 현장에서의 변화 정도를 관리자 관점에서 파악하기 위한 것입니다.<br/>
            귀하께서 응답해 주신 내용은 향후 컨소시엄 훈련과정의 설계, 운영 및 개선을 위한 기초자료로 활용되며, 기업 현장 수요를 반영한 훈련품질 제고에 중요한 자료가 될 예정입니다.<br/>
            바쁘시더라도 각 문항에 대하여 객관적이고 성실하게 응답하여 주시기 바랍니다.<br/>
            감사합니다.
          </p>
          <p className="text-emerald-50/90 text-[11px] sm:text-xs font-light leading-relaxed">
            ※ 본 조사와 관련된 문의나 의견이 있으시면 아래로 연락주시기 바랍니다.<br/>
            &nbsp;&nbsp;□ 조사기관 : 한국전기기술인협회 교육원 인적자원개발팀(02-2182-0781～9)
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
            {step === 1 && "1. 기업현황"}
            {step === 2 && "2. 훈련참여 및 활용조사"}
            {step === 3 && "3. 현업적용도 평가"}
          </span>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="p-6 sm:p-10">
          {errorMessage && (
            <div className="p-4 mb-6 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-2">
              <AlertTriangle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1 */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-3">1-1. 귀하의 직위는 무엇입니까?</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {['대표이사ㆍ사업주', '임원', '부서장', '팀장ㆍ현장관리자', '인사ㆍ교육담당자', '기타(직접기재)'].map(opt => (
                    <label
                      key={opt}
                      className={`flex items-center p-3 text-xs font-semibold rounded-xl border cursor-pointer select-none transition ${
                        formData.q1_1 === opt
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="q1_1"
                        value={opt}
                        checked={formData.q1_1 === opt}
                        onChange={handleChange}
                        className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500 mr-2 flex-shrink-0"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
                {formData.q1_1 === '기타(직접기재)' && (
                  <input
                    type="text"
                    name="q1_1_other"
                    value={formData.q1_1_other}
                    onChange={handleChange}
                    placeholder="직위를 직접 기재해 주세요"
                    className="mt-3 w-full border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none p-3 rounded-lg text-sm"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-3">1-2. 귀사의 주요 업종 또는 사업 분야는 무엇입니까?</label>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  {['설계', '감리', '안전관리', '진단ㆍ점검', '기타'].map(opt => (
                    <label
                      key={opt}
                      className={`flex items-center p-3 text-xs font-semibold rounded-xl border cursor-pointer select-none transition ${
                        formData.q1_2 === opt
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="q1_2"
                        value={opt}
                        checked={formData.q1_2 === opt}
                        onChange={handleChange}
                        className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500 mr-2 flex-shrink-0"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
                {formData.q1_2 === '기타' && (
                  <input
                    type="text"
                    name="q1_2_other"
                    value={formData.q1_2_other}
                    onChange={handleChange}
                    placeholder="주요 업종을 직접 기재해 주세요"
                    className="mt-3 w-full border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none p-3 rounded-lg text-sm"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-3">1-3. 귀사의 사업장 상시 근로자 수는 다음 중 어느 구간에 해당합니까?</label>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  {['10명 미만', '10명 ～50명 미만', '50명 ～ 100명 미만', '100명 ～ 300명 미만', '300명 이상'].map(opt => (
                    <label
                      key={opt}
                      className={`flex items-center p-3 text-[11px] font-semibold rounded-xl border cursor-pointer select-none transition ${
                        formData.q1_3 === opt
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="q1_3"
                        value={opt}
                        checked={formData.q1_3 === opt}
                        onChange={handleChange}
                        className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500 mr-2 shrink-0 flex-shrink-0"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-3">1-4. 귀하는 훈련 참여 근로자의 업무 변화를 어느 정도 관리ㆍ관찰할 수 있습니까?</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    '직접 업무를 지시하고 평가한다',
                    '업무 수행 결과를 주기적으로 확인한다',
                    '간접적으로만 파악한다',
                    '거의 알지 못한다'
                  ].map(opt => (
                    <label
                      key={opt}
                      className={`flex items-center p-3 rounded-xl border cursor-pointer select-none transition ${
                        formData.q1_4 === opt
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="q1_4"
                        value={opt}
                        checked={formData.q1_4 === opt}
                        onChange={handleChange}
                        className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500 mr-2 shrink-0 flex-shrink-0"
                      />
                      <span className="text-xs font-bold">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-3">2-1. 귀사는 수료 직원이 학습내용을 업무에 활용할 수 있도록 지원하였습니까?</label>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  {scaleLabels5.map(opt => (
                    <label
                      key={opt.score}
                      className={`flex flex-col items-center justify-center p-3 text-xs font-semibold rounded-xl border cursor-pointer select-none transition ${
                        formData.q2_1 === opt.score
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="q2_1"
                        value={opt.score}
                        checked={formData.q2_1 === opt.score}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <span>{opt.text}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-3">2-2. 귀사가 제공한 지원 방식은 무엇입니까?</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {['관련 업무 부여', '실습 적용 기회 제공', '장비ㆍ자료 제공', '상사 피드백 및 지도', '별도 지원 없음', '기타(직접기재)'].map(opt => (
                    <label
                      key={opt}
                      className={`flex items-center justify-start p-3 text-[11px] sm:text-xs font-semibold rounded-xl border cursor-pointer select-none transition ${
                        formData.q2_2 === opt
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="q2_2"
                        value={opt}
                        checked={formData.q2_2 === opt}
                        onChange={handleChange}
                        className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500 mr-2 shrink-0 flex-shrink-0"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
                {formData.q2_2 === '기타(직접기재)' && (
                  <input
                    type="text"
                    name="q2_2_other"
                    value={formData.q2_2_other}
                    onChange={handleChange}
                    placeholder="지원 방식을 직접 기재해 주세요"
                    className="mt-3 w-full border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none p-3 rounded-lg text-sm"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-3">2-3. 향후 훈련 참여 기회를 확대할 의향이 있습니까?</label>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  {scaleLabels5.map(opt => (
                    <label
                      key={opt.score}
                      className={`flex flex-col items-center justify-center p-3 text-xs font-semibold rounded-xl border cursor-pointer select-none transition ${
                        formData.q2_3 === opt.score
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="q2_3"
                        value={opt.score}
                        checked={formData.q2_3 === opt.score}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <span>{opt.text}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  2-4. 지속적인 업무 적용을 위해 필요한 사후관리 또는 후속지원 사항을 작성해 주시기 바랍니다.
                </label>
                <textarea
                  name="q2_4"
                  value={formData.q2_4}
                  onChange={handleChange}
                  rows={3}
                  className="w-full border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none p-3 rounded-lg text-sm"
                  placeholder="예: 실습 장비 대여, 사후 온라인 교육 등 자유롭게 적어주세요."
                />
              </div>
            </motion.div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-2">3-1. 다음은 협회 컨소시엄 훈련을 통해 귀사 직원의 현업 활용정도에 대한 질문입니다. 각각의 문항을 잘 읽으시고 현재 귀하의 행동과 일치하는 정도를 체크하시기 바랍니다.</h3>
                
                {/* Desktop Table View / Mobile Card View */}
                <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden">
                  <div className="hidden md:grid grid-cols-7 bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-700 select-none">
                    <div className="col-span-2 p-3 text-center border-r border-gray-200">평가 항목</div>
                    {scaleLabels5.map(opt => (
                      <div key={opt.score} className="p-3 text-center border-r last:border-0 border-gray-200 flex items-center justify-center break-keep">
                        {opt.text}
                      </div>
                    ))}
                  </div>
                  
                  <div className="divide-y divide-gray-200">
                    {[
                      { key: 'q3_1', title: "[업무 적용도]", q: "직원은 학습한 내용을 실제 업무에 활용하고 있다." },
                      { key: 'q3_2', title: "[업무수행체계성]", q: "직원은 이전보다 체계적으로 업무를 수행하고 있다." },
                      { key: 'q3_3', title: "[업무성과 향상도]", q: "직원은 업무의 정확성ㆍ신속성ㆍ완성도가 향상되었다." },
                      { key: 'q3_4', title: "[문제해결 기여도]", q: "직원은 현장 문제 파악과 해결에 기여하고 있다." },
                      { key: 'q3_5', title: "[조직 기여도]", q: "직원은 현장 업무의 원활한 운영에 기여하고 있다." }
                    ].map((item) => (
                      <div key={item.key} className="flex flex-col md:grid md:grid-cols-7 hover:bg-gray-50/50 transition-colors">
                        <div className="col-span-2 p-4 md:border-r border-gray-200 flex flex-col justify-center">
                          <span className="block text-xs font-bold text-emerald-700 mb-1">{item.title}</span>
                          <span className="text-[13px] text-gray-800 font-medium leading-tight">{item.q}</span>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-2 p-3 md:p-0 md:gap-0 md:contents">
                          {scaleLabels5.map(opt => (
                            <label
                              key={opt.score}
                              className={`p-3 text-center border md:border-t-0 md:border-b-0 md:border-r border-gray-200 last:border-r-0 cursor-pointer flex flex-row md:flex-col items-center justify-between md:justify-center rounded-xl md:rounded-none active:scale-[0.98] transition-all duration-200 min-h-[48px] break-keep ${
                                (formData as any)[item.key] === opt.score
                                  ? 'bg-emerald-50 ring-1 md:ring-inset md:ring-2 ring-emerald-500 font-bold' 
                                  : 'bg-white md:bg-transparent hover:bg-gray-50 text-gray-700'
                              }`}
                            >
                              <span className="text-[13px] md:hidden">{opt.text} <span className="ml-1 text-emerald-600/70">({opt.score}점)</span></span>
                              <input
                                type="radio"
                                name={item.key}
                                value={opt.score}
                                checked={(formData as any)[item.key] === opt.score}
                                onChange={handleChange}
                                className="w-5 h-5 md:w-4 md:h-4 text-emerald-600 focus:ring-emerald-500 flex-shrink-0 md:mt-2"
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  3-6. 귀사 직원에게 나타난 주요 업무 개선 사례를 작성해 주시기 바랍니다.
                </label>
                <textarea
                  name="q3_6"
                  value={formData.q3_6}
                  onChange={handleChange}
                  rows={3}
                  className="w-full border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none p-3 rounded-lg text-sm"
                  placeholder="직원에게서 직접적인 긍정적 변화나 사례를 작성해주세요"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  3-7. 훈련과정이 실제 업무에 도움이 되도록 개선할 사항을 작성해주시기 바랍니다.
                </label>
                <textarea
                  name="q3_7"
                  value={formData.q3_7}
                  onChange={handleChange}
                  rows={3}
                  className="w-full border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none p-3 rounded-lg text-sm"
                  placeholder="협회 훈련 과정의 아쉬운 점이나 보완했으면 하는 부분을 남겨주세요"
                />
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
                취소하고 홈으로
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
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl text-xs font-black tracking-wider shadow-md transition disabled:opacity-50"
              >
                <span>제출하기</span>
                {loading ? <span className="animate-spin text-[10px]">■</span> : <ArrowRight size={16} />}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
