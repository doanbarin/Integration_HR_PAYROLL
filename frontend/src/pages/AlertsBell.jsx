import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000/api';

function AlertsBell() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API}/alerts`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setAlerts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const severityStyles = {
    info: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe', label: 'ℹ️ Info' },
    warning: { bg: '#fefce8', color: '#ca8a04', border: '#fde68a', label: '⚠️ Warning' },
    critical: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: '🔴 Critical' }
  };

  const typeLabels = {
    birthday: '🎂 Sinh nhật',
    anniversary: '🎉 Kỷ niệm',
    absence: '📅 Nghỉ quá ngày',
    salary_anomaly: '💰 Bất thường lương'
  };

  const filtered = filter === 'all'
    ? alerts
    : alerts.filter(a => a.severity === filter);

  const countBySeverity = {
    info: alerts.filter(a => a.severity === 'info').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
    critical: alerts.filter(a => a.severity === 'critical').length
  };

  return (
    <div className="animate-fade-in">
      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="stat-card text-center" style={{cursor: 'pointer', border: filter === 'all' ? '2px solid var(--primary)' : ''}}
            onClick={() => setFilter('all')}>
            <div className="stat-value" style={{color: '#4f46e5'}}>{alerts.length}</div>
            <div className="stat-label">Tổng Cảnh Báo</div>
          </div>
        </div>
        {Object.entries(severityStyles).map(([key, style]) => (
          <div className="col-md-3" key={key}>
            <div className="stat-card text-center" style={{cursor: 'pointer', border: filter === key ? `2px solid ${style.color}` : ''}}
              onClick={() => setFilter(key)}>
              <div className="stat-value" style={{color: style.color}}>{countBySeverity[key]}</div>
              <div className="stat-label">{style.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Alert List */}
      <div className="content-card">
        <div className="card-header-custom">
          <h5>🔔 Danh Sách Cảnh Báo ({filtered.length})</h5>
          <div className="d-flex gap-2">
            <select className="form-select form-select-sm" style={{width: 150}}
              value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="all">Tất cả</option>
              <option value="critical">🔴 Critical</option>
              <option value="warning">⚠️ Warning</option>
              <option value="info">ℹ️ Info</option>
            </select>
          </div>
        </div>
        <div className="p-3">
          {loading ? (
            <p className="text-center text-muted py-4">⏳ Đang tải cảnh báo...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted py-4">🎉 Không có cảnh báo nào!</p>
          ) : (
            filtered.map((alert, i) => {
              const style = severityStyles[alert.severity] || severityStyles.info;
              return (
                <div key={i} className="alert-item" style={{
                  borderLeft: `4px solid ${style.color}`,
                  background: style.bg
                }}>
                  <div className="alert-icon" style={{background: `${style.color}15`, color: style.color}}>
                    {alert.icon}
                  </div>
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <strong style={{fontSize: 14}}>{alert.title}</strong>
                        <p className="mb-0 mt-1" style={{fontSize: 12.5, color: '#64748b'}}>{alert.message}</p>
                      </div>
                      <div className="d-flex flex-column align-items-end gap-1">
                        <span className="badge-status" style={{background: style.bg, color: style.color, fontSize: 10}}>
                          {style.label}
                        </span>
                        <span className="badge-status" style={{background: '#f8fafc', color: '#94a3b8', fontSize: 10}}>
                          {typeLabels[alert.type] || alert.type}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 d-flex gap-2">
                      <button
                        className="btn btn-sm btn-outline-primary"
                        style={{fontSize: 11, padding: '2px 10px'}}
                        onClick={() => navigate(`/employees/${alert.employeeId}`)}
                      >
                        👁️ Xem NV #{alert.employeeId}
                      </button>
                      <span style={{fontSize: 11, color: '#94a3b8', lineHeight: '24px'}}>📅 {alert.date}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default AlertsBell;
