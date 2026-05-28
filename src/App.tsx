/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingApp from './components/LandingApp';
import DemandSurvey from './components/DemandSurvey';
import FieldCorpSurvey from './components/FieldCorpSurvey';
import FieldTraineeSurvey from './components/FieldTraineeSurvey';
import FgiSurvey from './components/FgiSurvey';
import AdminApp from './components/AdminApp';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Core survey gateway */}
        <Route path="/" element={<LandingApp />} />
        
        {/* Respondent-facing anonymous survey paths */}
        <Route path="/survey/demand" element={<DemandSurvey />} />
        <Route path="/survey/field-corp" element={<FieldCorpSurvey />} />
        <Route path="/survey/field-trainee" element={<FieldTraineeSurvey />} />
        <Route path="/survey/fgi" element={<FgiSurvey />} />

        {/* Secured administration statistical suite */}
        <Route path="/admin" element={<AdminApp />} />
      </Routes>
    </BrowserRouter>
  );
}
