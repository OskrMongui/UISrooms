import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import './api'; // Import to set up Axios interceptors
import Login from './components/Login';
import SpacesList from './components/SpacesList';
import SpaceDetail from './components/SpaceDetail';
import ReservationsList from './components/ReservationsList';
import ReservationCreate from './components/ReservationCreate';
import Profile from './components/Profile';
import IncidenciasList from './components/IncidenciasList';
import IncidenciaCreate from './components/IncidenciaCreate';
import IncidenciaEdit from './components/IncidenciaEdit';
import LlavesList from './components/LlavesList';
import LlaveCreate from './components/LlaveCreate';
import LlaveEdit from './components/LlaveEdit';
import ObjetosList from './components/ObjetosList';
import ObjetoCreate from './components/ObjetoCreate';
import ObjetoEdit from './components/ObjetoEdit';
import NotificacionesList from './components/NotificacionesList';
import NotificacionCreate from './components/NotificacionCreate';
import NotificacionEdit from './components/NotificacionEdit';
import AdminSpacesList from './components/AdminSpacesList';
import SpaceCreate from './components/SpaceCreate';
import SpaceEdit from './components/SpaceEdit';
import SpaceScheduleCreate from './components/SpaceScheduleCreate';
import SpaceScheduleEdit from './components/SpaceScheduleEdit';
import ReservationApprovals from './components/ReservationApprovals';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './components/Home';

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <div className="container mt-4">
          <Routes>
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/login" element={<Login />} />
            <Route path="/spaces" element={<ProtectedRoute><SpacesList /></ProtectedRoute>} />
            <Route path="/spaces/:id" element={<ProtectedRoute><SpaceDetail /></ProtectedRoute>} />
            <Route path="/reservations" element={<ProtectedRoute><ReservationsList /></ProtectedRoute>} />
            <Route path="/reservations/create" element={<ProtectedRoute><ReservationCreate /></ProtectedRoute>} />
            <Route path="/reservations/pending" element={<ProtectedRoute roles={['admin', 'secretaria', 'laboratorista']}><ReservationApprovals /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/incidencias" element={<ProtectedRoute><IncidenciasList /></ProtectedRoute>} />
            <Route path="/incidencias/create" element={<ProtectedRoute><IncidenciaCreate /></ProtectedRoute>} />
            <Route path="/incidencias/:id/edit" element={<ProtectedRoute><IncidenciaEdit /></ProtectedRoute>} />
            <Route path="/llaves" element={<ProtectedRoute><LlavesList /></ProtectedRoute>} />
            <Route path="/llaves/create" element={<ProtectedRoute><LlaveCreate /></ProtectedRoute>} />
            <Route path="/llaves/:id/edit" element={<ProtectedRoute><LlaveEdit /></ProtectedRoute>} />
            <Route path="/objetos" element={<ProtectedRoute><ObjetosList /></ProtectedRoute>} />
            <Route path="/objetos/create" element={<ProtectedRoute><ObjetoCreate /></ProtectedRoute>} />
            <Route path="/objetos/:id/edit" element={<ProtectedRoute><ObjetoEdit /></ProtectedRoute>} />
            <Route path="/notificaciones" element={<ProtectedRoute><NotificacionesList /></ProtectedRoute>} />
            <Route path="/notificaciones/create" element={<ProtectedRoute><NotificacionCreate /></ProtectedRoute>} />
            <Route path="/notificaciones/:id/edit" element={<ProtectedRoute><NotificacionEdit /></ProtectedRoute>} />
            <Route path="/admin/spaces" element={<ProtectedRoute admin><AdminSpacesList /></ProtectedRoute>} />
            <Route path="/admin/spaces/create" element={<ProtectedRoute admin><SpaceCreate /></ProtectedRoute>} />
            <Route path="/admin/spaces/:id/edit" element={<ProtectedRoute admin><SpaceEdit /></ProtectedRoute>} />
            <Route path="/admin/spaces/:id/schedule" element={<ProtectedRoute admin><SpaceScheduleCreate /></ProtectedRoute>} />
            <Route path="/admin/spaces/:id/schedule/edit" element={<ProtectedRoute admin><SpaceScheduleEdit /></ProtectedRoute>} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
