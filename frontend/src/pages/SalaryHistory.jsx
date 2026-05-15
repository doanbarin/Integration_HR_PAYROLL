import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

const SalaryHistory = () => {
    const [history, setHistory] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('http://localhost:5000/api/salaries')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setHistory(data);
                } else {
                    setHistory([]);
                }
                setLoading(false);
            })
            .catch(() => {
                setHistory([]);
                setLoading(false);
            });
    }, []);

    const filtered = history.filter(h => {
        const matchSearch = (
            (h.FullName || '').toLowerCase().includes(search.toLowerCase()) ||
            String(h.EmployeeID).includes(search)
        );
        return matchSearch;
    });

    const formatVND = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    return (
        <div className="animate-fade-in">
            <div className="content-card">
                <div className="card-header-custom">
                    <h5><i className="fas fa-history me-2"></i>Lịch Sử Lương</h5>
                    <div className="d-flex gap-2">
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="🔍 Tìm theo tên, mã NV..."
                            style={{ width: 280 }}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        <button className="btn btn-primary-custom btn-sm">📩 Xuất PDF</button>
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="table table-custom">
                        <thead>
                            <tr>
                                <th>Kỳ Lương</th>
                                <th>Mã NV</th>
                                <th>Họ Tên</th>
                                <th className="text-end">Lương Cơ Bản</th>
                                <th className="text-end">Thực Lãnh</th>
                                <th className="text-center">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-4 text-muted">
                                        <div className="spinner-border spinner-border-sm me-2"></div>
                                        Đang tải dữ liệu từ MySQL...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-4 text-muted">Chưa có dữ liệu lịch sử lương</td>
                                </tr>
                            ) : (
                                filtered.map((h, i) => (
                                    <tr key={i}>
                                        <td><span className="badge-status" style={{background: '#f0f9ff', color: '#0ea5e9'}}>{h.SalaryMonth}</span></td>
                                        <td><strong>#{h.EmployeeID}</strong></td>
                                        <td>{h.FullName || '---'}</td>
                                        <td className="text-end text-primary">{formatVND(h.BaseSalary)}</td>
                                        <td className="text-end fw-bold">{formatVND(h.NetSalary)}</td>
                                        <td className="text-center">
                                            <button className="btn btn-sm btn-outline-primary">Xem Phiếu</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SalaryHistory;