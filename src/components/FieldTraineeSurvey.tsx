import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
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
    q1_1: '', 
    q1_1_other: '',
    q1_2: '', 

    // [2. 현업적용도 평가]
    q2_1: '', 
    q2_2: '', 
    q2_3: '', 
    q2_4: '', 
    q2_5: '', 

    // [3. 현업적용도 평가]
    q3_1: '', 
    q3_2: '', 
    q3_3: '', 
    q3_4: '', 
    q3_5: '', 
    q3_6: '', 
    q3_7: '', 
    q3_8: '', 
    q3_9: '', 
    q3_10: '', 

    // [4. 주관식]
    q4: '', 
  });

  const alreadyCompleted = false;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const totalSteps = 4;

  const validateStep = () => {
    switch (step) {
      case 1:
        if (!formData.q1_1 || !formData.q1_2) {
          return "모든 문항에 답변해 주세요.";
        }
        if (formData.q1_1 === '기타' && !formData.q1_1_other.trim()) {
          return "담당 업무 '기타'의 상세 내용을 입력해주세요.";
        }
        return "";
      case 2:
        const step2Keys = ['q2_1', 'q2_2', 'q2_3', 'q2_4', 'q2_5'];
        for (const k of step2Keys) {
          if (!(formData as any)[k]) return "모든 평가 문항에 응답해 주십시오.";
        }
        return "";
      case 3:
        const step3Keys = ['q3_1', 'q3_2', 'q3_3', 'q3_4', 'q3_5', 'q3_6', 'q3_7', 'q3_8', 'q3_9', 'q3_10'];
        for (const k of step3Keys) {
          if (!(formData as any)[k]) return "모든 평가 문항에 응답해 주십시오.";
        }
        return "";
      case 4:
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
        q1_1_final: formData.q1_1 === '기타' ? `기타(${formData.q1_1_other})` : formData.q1_1,
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

  const RenderTable = ({ items }: { items: { key: string, sec: string, txt: string }[] }) => {
    const scales = [
      { label: '매우 그렇다', value: '5' },
      { label: '그렇다', value: '4' },
      { label: '보통이다', value: '3' },
      { label: '그렇지않다', value: '2' },
      { label: '전혀 그렇지 않다', value: '1' }
    ];

    return (
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-4 font-bold text-gray-700 w-1/2">평가 항목</th>
                {scales.map(s => (
                  <th key={s.value} className="p-3 text-center font-bold text-gray-700 whitespace-nowrap min-w-[80px]">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, idx) => (
                <tr key={item.key} className="hover:bg-emerald-50/30 transition-colors">
                  <td className="p-4 align-top">
                    <span className="font-bold text-emerald-700 block mb-1">{item.sec}</span>
                    <span className="text-gray-800 leading-relaxed font-semibold">{item.txt}</span>
                  </td>
                  {scales.map(s => (
                    <td key={s.value} className="p-3 text-center align-middle hover:bg-gray-50">
                      <input 
                        type="radio" 
                        name={item.key} 
                        value={s.value} 
                        checked={(formData as any)[item.key] === s.value} 
                        onChange={handleChange} 
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer active:scale-[0.98] min-h-[48px] break-keep flex-shrink-0" 
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Mobile View */}
        <div className="md:hidden divide-y divide-gray-100">
          {items.map((item, idx) => (
            <div key={item.key} className="p-4 space-y-3 bg-white">
              <div className="mb-2">
                <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md font-bold text-[10px] mb-1.5">{item.sec}</span>
                <p className="text-xs font-semibold text-gray-800 leading-relaxed">{item.txt}</p>
              </div>
              <div className="grid grid-cols-1 gap-2 mt-2">
                {scales.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, [item.key]: s.value }))}
                    className={`w-full min-h-[48px] py-3 px-4 flex flex-row items-center justify-between text-[13px] rounded-xl border transition-all duration-200 active:scale-[0.98] break-keep ${
                      (formData as any)[item.key] === s.value
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-600 font-bold ring-1 ring-emerald-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 font-medium'
                    }`}
                  >
                    <span>{s.label}</span>
                    <span className={(formData as any)[item.key] === s.value ? "text-emerald-700" : "text-emerald-600/70"}>{s.value}점</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-brand-bg py-8 border-t border-emerald-500">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-emerald-800 text-white p-6 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">현업적용도 측정조사 (훈련생용)</h1>
            <p className="text-emerald-50/90 text-[11px] sm:text-xs font-light leading-relaxed mb-4">
              안녕하십니까?<br/>
              먼저 바쁘신 가운데 귀한 시간을 내어 설문에 응답해 주셔서 대단히 감사합니다.<br/>
              한국전기기술인협회 인적자원개발팀에서는 “국가인적자원개발컨소시엄 사업 훈련과정의 현업적용도 측정조사”를 시행하고 있습니다.<br/>
              본 설문서는 컨소시엄 훈련과정을 마치고 현업에 복귀한 후 학습한 내용을 실제 업무에 어느 정도 적용하고 있는지 그 수준을 측정하고 아울러 현업적용에 영향을 미치는 요인이 무엇인지를 파악하기 위한 것입니다.
            </p>
            <p className="text-emerald-50/90 text-[11px] sm:text-xs font-light leading-relaxed">
              여러분의 의견은 앞으로 컨소시엄 훈련과정의 설계와 운영에 반영되어 교육훈련 과정의 품질향상에 반영되오니 객관적이고 공정하게 응답해주시면 감사하겠습니다.<br/><br/>
              ※ 본 조사와 관련된 문의나 의견이 있으시면 아래로 연락주시기 바랍니다.<br/>
              □ 조사기관 : 한국전기기술인협회 교육원 인적자원개발팀(02-2182-0781～7)
            </p>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="p-6 sm:p-10">
            {/* Progress */}
            <div className="mb-8 flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex space-x-2">
                {[1, 2, 3, 4].map(s => (
                  <div key={s} className={`h-1.5 w-12 rounded-full ${step >= s ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                ))}
              </div>
              <span className="text-xs font-bold text-gray-400">{step} / {totalSteps} 단계</span>
            </div>

            {errorMessage && (
              <div className="p-4 mb-6 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-2">
                <AlertTriangle size={18} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* STEP 1 */}
            {step === 1 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                <h3 className="text-lg font-bold text-gray-900 border-l-4 border-emerald-500 pl-3">1. 일반현황</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-3">1-1. 현재 귀하가 주로 담당하고 있는 업무는 무엇입니까?</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {['설계', '감리', '안전관리', '진단·점검', '기타'].map(opt => (
                        <div key={opt} className={`border rounded-xl p-3 transition-colors ${formData.q1_1 === opt ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                          <label className="flex items-center gap-3 cursor-pointer active:scale-[0.98] min-h-[48px] break-keep">
                            <input type="radio" name="q1_1" value={opt} checked={formData.q1_1 === opt} onChange={handleChange} className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500 flex-shrink-0" />
                            <span className="text-sm font-medium text-gray-700">{opt}</span>
                          </label>
                          {opt === '기타' && formData.q1_1 === '기타' && (
                            <div className="mt-3 pl-7">
                              <input 
                                type="text"
                                name="q1_1_other"
                                value={formData.q1_1_other}
                                onChange={handleChange}
                                placeholder="기타 업무 상세 작성"
                                className="w-full text-xs p-2 border border-emerald-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-3">1-2. 귀하의 관련 업무 경력은 총 얼마나 되십니까?</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {['1～5년', '6～10년', '11～15년', '16～20년', '21년 이상'].map(opt => (
                        <label key={opt} className={`flex items-center gap-3 border rounded-xl p-3 cursor-pointer transition-colors ${formData.q1_2 === opt ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                          <input type="radio" name="q1_2" value={opt} checked={formData.q1_2 === opt} onChange={handleChange} className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-700">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-gray-900 border-l-4 border-emerald-500 pl-3">2. 현업적용도 평가</h3>
                  <p className="text-xs text-gray-500 font-medium pl-4">
                    다음은 컨소시엄 훈련과정을 통해 학습한 내용의 현업 활용정도에 대한 질문입니다.<br className="hidden md:block"/>
                    각각의 문항을 잘 읽으시고 현재 귀하의 행동과 일치하는 정도를 표시하시기 바랍니다.
                  </p>
                </div>

                <RenderTable items={[
                  { key: 'q2_1', sec: "[업무 관련성]", txt: "학습한 내용은 실제 업무와 관련이 높다." },
                  { key: 'q2_2', sec: "[업무유용성]", txt: "학습한 내용은 업무 적용에 도움이 되었다." },
                  { key: 'q2_3', sec: "[실용적용성]", txt: "학습내용을 업무에 지속적으로 적용하고자 노력하고 있다." },
                  { key: 'q2_4', sec: "[업무향상도]", txt: "훈련 이후 업무를 더 효과적이고 체계적으로 수행하게 되었다." },
                  { key: 'q2_5', sec: "[성과기여도]", txt: "학습한 내용은 업무성과 향상에 도움이 되었다." }
                ]} />
              </motion.div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-gray-900 border-l-4 border-emerald-500 pl-3">3. 현업적용도 평가</h3>
                  <p className="text-xs text-gray-500 font-medium pl-4">
                    다음은 컨소시엄 훈련과정과 관련하여 귀하가 가지는 생각과 느낌 등에 대한 질문입니다.<br className="hidden md:block"/>
                    각각의 문항을 잘 읽으시고 귀하의 생각과 가장 일치하는 곳에 표시하시기 바랍니다.
                  </p>
                </div>

                <RenderTable items={[
                  { key: 'q3_1', sec: "[자기효능감]", txt: "업무에 새로운 지식과 기술을 적용할 수 있다." },
                  { key: 'q3_2', sec: "[자기효능감]", txt: "어려운 상황에서도 배운 내용을 업무에 활용할 수 있다." },
                  { key: 'q3_3', sec: "[전이동기]", txt: "배운 지식과 기술이 업무성과 향상에 도움이 된다." },
                  { key: 'q3_4', sec: "[전이동기]", txt: "배운 지식과 기술이 업무 관련 문제를 해결하는 데 도움이 된다고 생각한다." },
                  { key: 'q3_5', sec: "[전이설계]", txt: "훈련과정은 업무 적용 방법을 구체적으로 안내하였다." },
                  { key: 'q3_6', sec: "[전이설계]", txt: "훈련과정은 직무 활용 사례와 실무 중심으로 구성되었다." },
                  { key: 'q3_7', sec: "[상사/동료]", txt: "상사는 학습 내용을 업무에 활용하도록 지원한다." },
                  { key: 'q3_8', sec: "[상사/동료]", txt: "동료는 학습 내용을 업무에 적용하도록 지원한다." },
                  { key: 'q3_9', sec: "[변화가능성]", txt: "우리 부서는 학습 내용을 업무에 적용하려는 분위기가 있다." },
                  { key: 'q3_10', sec: "[변화가능성]", txt: "우리 부서는 새로운 업무 방식 시도에 긍정적이다." }
                ]} />
              </motion.div>
            )}

            {/* STEP 4 */}
            {step === 4 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900 border-l-4 border-emerald-500 pl-3">4. 주관식 의견</h3>
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <label className="block text-sm font-bold text-gray-800 mb-3 leading-relaxed">
                    학습한 내용 중 실제 업무에 도움이 되었던 점이나 적용 사례를 작성하여 주시기 바랍니다.
                  </label>
                  <textarea
                    name="q4"
                    value={formData.q4}
                    onChange={handleChange}
                    rows={6}
                    className="w-full border border-gray-300 focus:border-emerald-500 outline-none p-4 rounded-lg text-sm shadow-inner transition-colors"
                    placeholder="최대한 상세하게 작성해주시면 감사하겠습니다."
                  />
                </div>
              </motion.div>
            )}

            {/* Controls */}
            <div className="flex justify-between items-center pt-8 mt-10 border-t border-gray-100">
              {step > 1 ? (
                <button type="button" onClick={handlePrev} className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors">
                  <ChevronLeft size={18} />
                  이전
                </button>
              ) : (
                <button type="button" onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600 font-bold text-xs underline underline-offset-2">
                  홈으로 가기
                </button>
              )}

              {step < totalSteps ? (
                <button type="button" onClick={handleNext} className="flex items-center gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 px-6 py-2.5 rounded-lg text-sm font-bold shadow-md transition-transform active:scale-95">
                  다음 단계
                  <ChevronRight size={18} />
                </button>
              ) : (
                <button type="button" onClick={handleSubmit} disabled={loading} className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-8 py-3 rounded-lg text-sm font-bold shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100">
                  {loading ? <span className="animate-spin text-lg">↻</span> : <CheckCircle2 size={18} />}
                  제출하기
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
