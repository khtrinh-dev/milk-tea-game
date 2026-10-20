import { formatVND } from '../game/money';
import type { DaySummary } from '../game/types';
import { Modal } from './Modal';

export function DaySummaryModal({ summary, onNext }: { summary: DaySummary; onNext: () => void }) {
  const profit = summary.revenue - summary.spent - summary.salaries;
  return (
    <Modal
      title={`🌙 Tổng kết ngày ${summary.day}`}
      footer={
        <button className="btn primary wide" onClick={onNext}>
          ☀️ Mở cửa ngày {summary.day + 1}
        </button>
      }
    >
      <table className="summary">
        <tbody>
          <tr><td>😋 Khách đã phục vụ</td><td>{summary.served}</td></tr>
          <tr><td>😤 Khách bỏ về</td><td>{summary.lost}</td></tr>
          <tr><td>❌ Ly làm sai</td><td>{summary.wrong}</td></tr>
          <tr className="sep"><td>💵 Doanh thu</td><td>+{formatVND(summary.revenue)}</td></tr>
          <tr><td>&nbsp;&nbsp;trong đó tip</td><td>{formatVND(summary.tips)}</td></tr>
          <tr><td>📦 Nhập hàng</td><td>-{formatVND(summary.spent)}</td></tr>
          <tr><td>👥 Lương nhân viên</td><td>-{formatVND(summary.salaries)}</td></tr>
          <tr className={`total ${profit >= 0 ? 'pos' : 'neg'}`}><td>Lợi nhuận</td><td>{profit >= 0 ? '+' : ''}{formatVND(profit)}</td></tr>
        </tbody>
      </table>
    </Modal>
  );
}
