import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { FileSpreadsheet, Building2, GraduationCap, Users, LayoutDashboard, AlertCircle } from 'lucide-react';
import { KEEASymbol, KEEAHorizontalLogo } from './KEEALogo';

export default function LandingApp() {
  const navigate = useNavigate();

  const surveys = [
    {
      id: 1,
      title: "2027년도 훈련 수요조사",
      tagline: "차년도 교육 과정 설계 및 수요 파악",
      desc: "수요를 종합적으로 분석하여 최적화된 컨소시엄 훈련을 기획합니다.",
      path: "/survey/demand",
      icon: FileSpreadsheet,
      badge: "수요조사",
      color: "from-emerald-500 to-green-600",
      btnText: "수요조사 참여하기"
    },
    {
      id: 2,
      title: "현업적용도 측정 (기업용)",
      tagline: "관리자 관점의 훈련 성과 및 현장 변화 측정",
      desc: "교육을 수료한 직원의 실무 성과 향상도와 조직 기여도를 평가하고, 사내 지원 환경을 분석하여 훈련 품질을 제고합니다.",
      path: "/survey/field-corp",
      icon: Building2,
      badge: "현업적용도 (기업)",
      color: "from-teal-500 to-emerald-600",
      btnText: "기업 평가 시작하기"
    },
    {
      id: 3,
      title: "현업적용도 측정 (훈련생용)",
      tagline: "훈련 수료생 본인의 실무 적용도 및 효과 파악",
      desc: "훈련 수료 후 실제 업무에 학습 내용을 어떻게 적용하고 있는지 점검하고, 자기효능감 및 조직 내 지원 환경 등을 다각도로 분석합니다.",
      path: "/survey/field-trainee",
      icon: GraduationCap,
      badge: "현업적용도 (개인)",
      color: "from-green-500 to-emerald-700",
      btnText: "훈련생 평가 시작하기"
    },
    {
      id: 4,
      title: "2026년도 FGI (심층면접)",
      tagline: "훈련 개선을 위한 재직자 심층 의견 수렴",
      desc: "훈련 목표와 애로사항 등 현장의 생생한 목소리를 수집하여, 향후 훈련 과정 운영의 핵심 개선 과제를 발굴합니다.",
      path: "/survey/fgi",
      icon: Users,
      badge: "포커스그룹 인터뷰",
      color: "from-emerald-600 to-teal-700",
      btnText: "FGI 설문 참여하기"
    }
  ];

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      {/* Top Banner / Navigation */}
      <header className="bg-primary-green text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-white p-1 rounded-lg shadow-sm shrink-0 flex items-center justify-center">
              <KEEASymbol className="h-8 w-auto" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg md:text-xl font-bold tracking-tight truncate sm:whitespace-normal">
                한국전기기술인협회 국가인적자원개발컨소시엄 통합 설문조사 포털
              </h1>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-950 border border-emerald-400/30 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition duration-200 shrink-0"
          >
            <LayoutDashboard size={16} />
            <span>관리자 페이지</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-12 sm:px-6 lg:px-8 flex flex-col justify-center">
        {/* Intro */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-primary-green border border-emerald-200 mb-4 inline-block">
            2026-2027 통합 설문조사 분석 시스템
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-primary-green tracking-tight mt-1 mb-4 leading-tight">
            컨소시엄 직무역량 강화 및 훈련 성과 조사
          </h2>
          <p className="text-base text-gray-600 leading-relaxed font-normal">
            저희 한국전기기술인협회는 산업 현장 밀착형 인재 육성을 위해 노력하고 있습니다.<br />
            보내주시는 귀중한 의견은 차년도 훈련 계획 수립 및 피드백 자료로 소중히 활용됩니다.
          </p>
        </motion.div>

        {/* Dynamic Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {surveys.map((sv, idx) => {
            const Icon = sv.icon;
            // Allow multiple submissions for heavy testing (as per user request)
            const isCompleted = false;

            return (
              <motion.div
                key={sv.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden flex flex-col relative h-full"
              >
                {/* Visual Accent header */}
                <div className={`h-2 bg-gradient-to-r ${sv.color}`} />
                
                <div className="p-6 flex-1 flex flex-col">
                  {/* Badge & Icon */}
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs bg-emerald-50 text-emerald-800 font-medium px-2.5 py-1 rounded-full border border-emerald-100/60">
                      {sv.badge}
                    </span>
                    <div className="bg-emerald-50 text-primary-green p-2 rounded-xl">
                      <Icon size={22} />
                    </div>
                  </div>

                  {/* Text Details */}
                  <h3 className="text-xl font-bold text-gray-900 mb-1 leading-snug">
                    {sv.title}
                  </h3>
                  <p className="text-xs font-semibold text-emerald-600 mb-3">
                    {sv.tagline}
                  </p>
                  <p className="text-xs text-gray-500 leading-relaxed mb-6 flex-1">
                    {sv.desc}
                  </p>

                  {/* Submission Indicators */}
                  {isCompleted ? (
                    <div className="mb-4 text-center py-2 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-100">
                      ✓ 참여 완료됨
                    </div>
                  ) : null}

                  {/* CTA button */}
                  <button
                    onClick={() => navigate(sv.path)}
                    disabled={isCompleted}
                    className={`w-full py-2.5 rounded-xl font-medium text-sm transition-all text-center flex items-center justify-center gap-1.5 shadow-sm
                      ${isCompleted 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-primary-green text-white hover:bg-primary-green-hover'
                      }`}
                  >
                    <span>{isCompleted ? '참여 완료' : sv.btnText}</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Instruction Footer banner */}
        <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-6 mb-4 flex flex-col md:flex-row gap-4 items-center justify-between text-left">
          <div className="flex gap-4 items-center">
            <div className="bg-white shadow-xs p-3 rounded-full text-emerald-700">
               <AlertCircle size={24} />
            </div>
            <div>
              <md-title className="font-bold text-gray-950 text-sm sm:text-base block">설문 참여 및 테스트 환경 안내</md-title>
              <span className="text-xs text-gray-650 font-medium">현재 중복 응답이 가능하여, 자유롭게 반복 제출을 하실 수 있습니다.</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer copyright */}
      <footer className="bg-white text-gray-500 text-xs py-8 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-center gap-3">
          <KEEAHorizontalLogo className="text-gray-950" textColor="text-gray-950" />
          <p className="text-gray-500 font-medium">© 2026 한국전기기술인협회. All Rights Reserved. (통합 설문분석포털)</p>
        </div>
      </footer>
    </div>
  );
}
