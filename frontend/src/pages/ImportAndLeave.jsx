import React, { useState } from 'react';

function ImportAndLeave() {
  const [activeTab, setActiveTab] = useState('import');
  const [file, setFile] = useState(null);
  const [leaves] = useState([]);

  const statusColor = {
    'Chờ duyệt': { bg: '#fefce8', color: '#ca8a04' },
    'Đã duyệt': { bg: '#f0fdf4', color: '#16a34a' },
    'Từ chối': { bg: '#fef2f2', color: '#dc2626' },
  };

  return (
    <div className="animate-fade-in">
      <ul className="nav nav-pills mb-3" style={{gap: 8}}>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'import' ? 'active' : ''}`}
            style={activeTab === 'import' ? {background: 'var(--primary)', borderRadius: 10} : {borderRadius: 10}}
            onClick={() => setActiveTab('import')}>📤 Import Chấm Công</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'leave' ? 'active' : ''}`}
            style={activeTab === 'leave' ? {background: 'var(--primary)', borderRadius: 10} : {borderRadius: 10}}
            onClick={() => setActiveTab('leave')}>📝 Đơn Xin Nghỉ Phép</button>
        </li>
      </ul>

      {activeTab === 'import' && (
        <div className="content-card">
          <div className="card-header-custom"><h5>📤 Import File Excel Chấm Công</h5></div>
          <div className="p-4">
            <div className="text-center py-5" style={{border: '2px dashed var(--border-color)', borderRadius: 16, background: '#f8fafc'}}>
              <div style={{fontSize: 48, marginBottom: 16}}>📁</div>
              <h6>Kéo thả file Excel vào đây</h6>
              <p className="text-muted mb-3">Hoặc nhấn chọn file bên dưới</p>
              <input type="file" accept=".xlsx,.xls,.csv" className="form-control mx-auto"
                style={{maxWidth: 300}} onChange={e => setFile(e.target.files[0])} />
              {file && (
                <div className="mt-3">
                  <span className="badge-status" style={{background: '#f0fdf4', color: '#16a34a'}}>✅ {file.name}</span>
                  <br/><button className="btn btn-primary-custom btn-sm mt-2">📥 Bắt Đầu Import</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'leave' && (
        <div className="content-card">
          <div className="card-header-custom">
            <h5>📝 Đơn Xin Nghỉ Phép</h5>
            <button className="btn btn-primary-custom btn-sm">+ Nộp Đơn Mới</button>
          </div>
          <div className="table-responsive">
            <table className="table table-custom">
              <thead>
                <tr><th>Mã NV</th><th>Họ Tên</th><th>Loại</th><th>Từ</th><th>Đến</th><th>Số Ngày</th><th>Lý Do</th><th>Trạng Thái</th><th className="text-center">Thao Tác</th></tr>
              </thead>
              <tbody>
                {leaves.length === 0 ? (
                  <tr><td colSpan="9" className="text-center py-4 text-muted">Chưa có đơn nghỉ phép</td></tr>
                ) : (
                  leaves.map(l => (
                    <tr key={l.id}>
                      <td><strong>#{l.id}</strong></td><td>{l.name}</td><td>{l.type}</td>
                      <td>{l.from}</td><td>{l.to}</td><td className="text-center">{l.days}</td>
                      <td>{l.reason}</td>
                      <td><span className="badge-status" style={statusColor[l.status]}>{l.status}</span></td>
                      <td className="text-center">
                        {l.status === 'Chờ duyệt' && (<><button className="btn btn-sm btn-outline-success me-1">✅</button><button className="btn btn-sm btn-outline-danger">❌</button></>)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImportAndLeave;
