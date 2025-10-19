import React from 'react';
import './StatisticsCards.css';

interface Statistics {
  totalRecords: number;
  totalEmployees: number;
  totalCheckIns: number;
  totalCheckOuts: number;
  totalSites: number;
  lastPunchTime?: string;
  firstPunchTime?: string;
}

interface StatisticsCardsProps {
  stats: Statistics | null;
  loading: boolean;
}

const StatisticsCards: React.FC<StatisticsCardsProps> = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="statistics-cards">
        <div className="stat-card skeleton">
          <div className="stat-skeleton"></div>
        </div>
        <div className="stat-card skeleton">
          <div className="stat-skeleton"></div>
        </div>
        <div className="stat-card skeleton">
          <div className="stat-skeleton"></div>
        </div>
        <div className="stat-card skeleton">
          <div className="stat-skeleton"></div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="statistics-cards">
      <div className="stat-card stat-primary">
        <div className="stat-icon">📊</div>
        <div className="stat-content">
          <div className="stat-label">Total Records</div>
          <div className="stat-value">{stats.totalRecords.toLocaleString()}</div>
        </div>
      </div>

      <div className="stat-card stat-success">
        <div className="stat-icon">👥</div>
        <div className="stat-content">
          <div className="stat-label">Total Employees</div>
          <div className="stat-value">{stats.totalEmployees.toLocaleString()}</div>
        </div>
      </div>

      <div className="stat-card stat-info">
        <div className="stat-icon">📥</div>
        <div className="stat-content">
          <div className="stat-label">Check-Ins</div>
          <div className="stat-value">{stats.totalCheckIns.toLocaleString()}</div>
        </div>
      </div>

      <div className="stat-card stat-warning">
        <div className="stat-icon">📤</div>
        <div className="stat-content">
          <div className="stat-label">Check-Outs</div>
          <div className="stat-value">{stats.totalCheckOuts.toLocaleString()}</div>
        </div>
      </div>

      <div className="stat-card stat-secondary">
        <div className="stat-icon">🏢</div>
        <div className="stat-content">
          <div className="stat-label">Total Sites</div>
          <div className="stat-value">{stats.totalSites}</div>
        </div>
      </div>

      <div className="stat-card stat-accent">
        <div className="stat-icon">🕒</div>
        <div className="stat-content">
          <div className="stat-label">Last Punch</div>
          <div className="stat-value-small">{formatDateTime(stats.lastPunchTime)}</div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsCards;

