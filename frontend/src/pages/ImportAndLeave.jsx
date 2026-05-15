import React, { useState, useEffect } from 'react';

function ImportAndLeave() {
  const [activeTab, setActiveTab] = useState('import');
  const [file, setFile] = useState(null);
  
// Khởi tạo bộ nhớ từ localStorage (nếu có), nếu không thì để mảng rỗng
  const [leaves, setLeaves] = useState(() => {
    const savedLeaves = localStorage.getItem('mockLeavesData');
    return savedLeaves ? JSON.parse(savedLeaves) : [];
  });

  // Tự động lưu vào localStorage mỗi khi danh sách leaves bị thay đổi (thêm đơn mới)
  useEffect(() => {
    localStorage.setItem('mockLeavesData', JSON.stringify(leaves));
  }, [leaves]);

  // ================= BỔ SUNG STATE CHO MODAL NGHỈ PHÉP =================
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveData, setLeaveData] = useState({
      EmployeeID: '',
      LeaveType: 'Phép năm',
      StartDate: '',
      EndDate: '',
      Reason: ''
  });

  // ================= HÀM XỬ LÝ KHI BẤM NÚT GỬI ĐƠN =================
  const handleSubmitLeave = (e) => {
      e.preventDefault();
      // --- BẮT ĐẦU ĐOẠN KIỂM TRA LOGIC ---
      if (Number(leaveData.EmployeeID) <= 0) {
          alert("Lỗi: Mã nhân viên phải là số dương hợp lệ!");
          return; // Dừng lại, không cho chạy tiếp
      }

      if (leaveData.StartDate > leaveData.EndDate) {
          alert("Lỗi: Ngày kết thúc không được nhỏ hơn ngày bắt đầu!");
          return;
      }
      // Tạo một dữ liệu ảo (mock data) từ thông tin nhập vào để test giao diện
      const newLeave = {
          id: leaveData.EmployeeID,
          name: 'Nhân viên Test', // Tạm thời để tên mặc định
          type: leaveData.LeaveType,
          from: leaveData.StartDate,
          to: leaveData.EndDate,
          days: 1, // Tạm tính là 1 ngày
          reason: leaveData.Reason,
          status: 'Chờ duyệt'
      };

      // Đưa dữ liệu mới vào bảng
      setLeaves([...leaves, newLeave]);

      alert("Đã tạo đơn thành công (Dữ liệu test giao diện)!");
      setShowLeaveForm(false); // Đóng form
      
      // Xóa trắng form để lần sau nhập tiếp
      setLeaveData({
          EmployeeID: '', LeaveType: 'Phép năm', StartDate: '', EndDate: '', Reason: ''
      });
  };

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

      {/* TAB IMPORT */}
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

      {/* TAB ĐƠN XIN NGHỈ PHÉP */}
      {activeTab === 'leave' && (
        <div className="content-card">
          <div className="card-header-custom">
            <h5>📝 Đơn Xin Nghỉ Phép</h5>
            {/* Đã gắn sự kiện onClick để mở Modal */}
            <button className="btn btn-primary-custom btn-sm" onClick={() => setShowLeaveForm(true)}>
              + Nộp Đơn Mới
            </button>
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
                  leaves.map((l, index) => (
                    // Dùng index làm key tạm thời vì l.id có thể bị trùng nếu test nhiều lần
                    <tr key={index}>
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

      {/* ================= GIAO DIỆN MODAL NỘP ĐƠN NẰM Ở ĐÂY ================= */}
      {showLeaveForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', width: '450px', color: '#333', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h4 style={{ marginTop: 0, marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Nộp Đơn Xin Nghỉ Phép</h4>
            
            <form onSubmit={handleSubmitLeave}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Mã Nhân Viên (*)</label>
                {/* Đã chặn số âm ở đây */}
                <input type="number" min="1" required className="form-control"
                  value={leaveData.EmployeeID}
                  onChange={e => setLeaveData({...leaveData, EmployeeID: e.target.value})} 
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Loại Nghỉ</label>
                <select className="form-select"
                  value={leaveData.LeaveType}
                  onChange={e => setLeaveData({...leaveData, LeaveType: e.target.value})}
                >
                  <option value="Phép năm">Phép năm</option>
                  <option value="Nghỉ ốm">Nghỉ ốm</option>
                  <option value="Thai sản">Thai sản</option>
                  <option value="Nghỉ không lương">Nghỉ không lương</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Từ ngày</label>
                  {/* Đã khóa lịch trong tháng 09/2024 ở đây */}
                  <input type="date" min="2024-09-01" max="2024-09-30" required className="form-control"
                    value={leaveData.StartDate}
                    onChange={e => setLeaveData({...leaveData, StartDate: e.target.value})} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Đến ngày</label>
                  {/* Đã khóa lịch trong tháng 09/2024 ở đây */}
                  <input type="date" min="2024-09-01" max="2024-09-30" required className="form-control"
                    value={leaveData.EndDate}
                    onChange={e => setLeaveData({...leaveData, EndDate: e.target.value})} 
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Lý do nghỉ (*)</label>
                <textarea required rows="3" className="form-control"
                  value={leaveData.Reason}
                  onChange={e => setLeaveData({...leaveData, Reason: e.target.value})}
                ></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowLeaveForm(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary-custom">Gửi Yêu Cầu</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default ImportAndLeave;