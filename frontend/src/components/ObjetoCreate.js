import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

const ObjetoCreate = () => {
  const [formData, setFormData] = useState({
    descripcion: '',
    tipo: '',
    espacio: '',
    encontrado_por: '',
    fecha_encontrado: '',
    estado: 'encontrado',
    observaciones: ''
  });
  const [espacios, setEspacios] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [espRes, usrRes] = await Promise.all([
          api.get('espacios/'),
          api.get('usuarios/')
        ]);
        setEspacios(espRes.data);
        setUsuarios(usrRes.data);
      } catch (err) {
        setError('Error al cargar datos');
      }
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('objetos-perdidos/', formData);
      navigate('/objetos');
    } catch (err) {
      setError('Error al crear objeto perdido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-md-8">
        <div className="card">
          <div className="card-header bg-success text-white">
            <h3>Reportar Objeto Perdido</h3>
          </div>
          <div className="card-body">
            {error && <div className="alert alert-danger">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Descripción</label>
                <textarea
                  name="descripcion"
                  className="form-control"
                  value={formData.descripcion}
                  onChange={handleChange}
                  rows="3"
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Tipo</label>
                <select
                  name="tipo"
                  className="form-control"
                  value={formData.tipo}
                  onChange={handleChange}
                  required
                >
                  <option value="">Seleccionar tipo</option>
                  <option value="documento">Documento</option>
                  <option value="electronico">Electrónico</option>
                  <option value="ropa">Ropa</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Espacio</label>
                <select
                  name="espacio"
                  className="form-control"
                  value={formData.espacio}
                  onChange={handleChange}
                >
                  <option value="">Seleccionar espacio</option>
                  {espacios.map((esp) => (
                    <option key={esp.id} value={esp.id}>{esp.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Encontrado Por</label>
                <select
                  name="encontrado_por"
                  className="form-control"
                  value={formData.encontrado_por}
                  onChange={handleChange}
                >
                  <option value="">Seleccionar usuario</option>
                  {usuarios.map((usr) => (
                    <option key={usr.id} value={usr.id}>{usr.first_name} {usr.last_name}</option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Fecha Encontrado</label>
                <input
                  type="datetime-local"
                  name="fecha_encontrado"
                  className="form-control"
                  value={formData.fecha_encontrado}
                  onChange={handleChange}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Estado</label>
                <select
                  name="estado"
                  className="form-control"
                  value={formData.estado}
                  onChange={handleChange}
                  required
                >
                  <option value="encontrado">Encontrado</option>
                  <option value="entregado">Entregado</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Observaciones</label>
                <textarea
                  name="observaciones"
                  className="form-control"
                  value={formData.observaciones}
                  onChange={handleChange}
                  rows="3"
                />
              </div>
              <button type="submit" className="btn btn-success" disabled={loading}>
                {loading ? 'Creando...' : 'Reportar Objeto'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ObjetoCreate;

