import React, { useState, useEffect } from 'react';
import api from '../api';
import { useParams, useNavigate } from 'react-router-dom';

const ObjetoEdit = () => {
  const { id } = useParams();
  const [formData, setFormData] = useState({
    descripcion: '',
    tipo: '',
    espacio: '',
    encontrado_por: '',
    fecha_encontrado: '',
    estado: '',
    entregado_a: '',
    fecha_entrega: '',
    observaciones: ''
  });
  const [espacios, setEspacios] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [objRes, espRes, usrRes] = await Promise.all([
          api.get(`objetos-perdidos/${id}/`),
          api.get('espacios/'),
          api.get('usuarios/')
        ]);
        setFormData({
          descripcion: objRes.data.descripcion || '',
          tipo: objRes.data.tipo || '',
          espacio: objRes.data.espacio ? objRes.data.espacio.id : '',
          encontrado_por: objRes.data.encontrado_por ? objRes.data.encontrado_por.id : '',
          fecha_encontrado: objRes.data.fecha_encontrado ? objRes.data.fecha_encontrado.slice(0, 16) : '',
          estado: objRes.data.estado,
          entregado_a: objRes.data.entregado_a ? objRes.data.entregado_a.id : '',
          fecha_entrega: objRes.data.fecha_entrega ? objRes.data.fecha_entrega.slice(0, 16) : '',
          observaciones: objRes.data.observaciones || ''
        });
        setEspacios(espRes.data);
        setUsuarios(usrRes.data);
      } catch (err) {
        setError('Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`objetos-perdidos/${id}/`, formData);
      navigate('/objetos');
    } catch (err) {
      setError('Error al actualizar objeto perdido');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center"><div className="spinner-border text-success" role="status"></div></div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="row justify-content-center">
      <div className="col-md-8">
        <div className="card">
          <div className="card-header bg-success text-white">
            <h3>Editar Objeto Perdido</h3>
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
                <label className="form-label">Entregado A</label>
                <select
                  name="entregado_a"
                  className="form-control"
                  value={formData.entregado_a}
                  onChange={handleChange}
                >
                  <option value="">Seleccionar usuario</option>
                  {usuarios.map((usr) => (
                    <option key={usr.id} value={usr.id}>{usr.first_name} {usr.last_name}</option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Fecha Entrega</label>
                <input
                  type="datetime-local"
                  name="fecha_entrega"
                  className="form-control"
                  value={formData.fecha_entrega}
                  onChange={handleChange}
                />
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
              <button type="submit" className="btn btn-success" disabled={saving}>
                {saving ? 'Guardando...' : 'Actualizar Objeto'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ObjetoEdit;

