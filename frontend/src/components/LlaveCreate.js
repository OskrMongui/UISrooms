import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

const LlaveCreate = () => {
  const [formData, setFormData] = useState({
    codigo: '',
    espacio: '',
    responsable: '',
    estado: 'disponible'
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
      await api.post('llaves/', formData);
      navigate('/llaves');
    } catch (err) {
      setError('Error al crear llave');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-md-8">
        <div className="card">
          <div className="card-header bg-success text-white">
            <h3>Agregar Llave</h3>
          </div>
          <div className="card-body">
            {error && <div className="alert alert-danger">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Código</label>
                <input
                  type="text"
                  name="codigo"
                  className="form-control"
                  value={formData.codigo}
                  onChange={handleChange}
                  placeholder="Código de la llave"
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Espacio</label>
                <select
                  name="espacio"
                  className="form-control"
                  value={formData.espacio}
                  onChange={handleChange}
                  required
                >
                  <option value="">Seleccionar espacio</option>
                  {espacios.map((esp) => (
                    <option key={esp.id} value={esp.id}>{esp.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Responsable</label>
                <select
                  name="responsable"
                  className="form-control"
                  value={formData.responsable}
                  onChange={handleChange}
                >
                  <option value="">Seleccionar responsable</option>
                  {usuarios.map((usr) => (
                    <option key={usr.id} value={usr.id}>{usr.first_name} {usr.last_name}</option>
                  ))}
                </select>
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
                  <option value="disponible">Disponible</option>
                  <option value="prestada">Prestada</option>
                  <option value="perdida">Perdida</option>
                  <option value="mantenimiento">Mantenimiento</option>
                </select>
              </div>
              <button type="submit" className="btn btn-success" disabled={loading}>
                {loading ? 'Creando...' : 'Agregar Llave'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LlaveCreate;
